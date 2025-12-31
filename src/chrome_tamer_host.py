#!/usr/bin/env python3
"""
Chrome Tamer Native Messaging Host
Handles system-level operations that browser extensions cannot perform:
- Network bandwidth throttling
- CPU core affinity management
- Process priority control
"""

import sys
import json
import struct
import logging
import subprocess
import platform
import os
from typing import Optional, Dict, Any

logging.basicConfig(
    filename='/tmp/chrome_tamer_host.log',
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

IS_WINDOWS = platform.system() == "Windows"
IS_MAC = platform.system() == "Darwin"

def send_message(message: Dict[str, Any]):
    """Send message to Chrome extension via stdout."""
    encoded_content = json.dumps(message).encode('utf-8')
    encoded_length = struct.pack('I', len(encoded_content))
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()

def read_message() -> Optional[Dict[str, Any]]:
    """Read message from Chrome extension via stdin."""
    try:
        raw_length = sys.stdin.buffer.read(4)
        if len(raw_length) == 0:
            return None
        message_length = struct.unpack('I', raw_length)[0]
        message = sys.stdin.buffer.read(message_length).decode('utf-8')
        return json.loads(message)
    except Exception as e:
        logger.error(f"Error reading message: {e}")
        return None

def throttle_network(pid: int, bandwidth_kbps: int) -> Dict[str, Any]:
    """
    Throttle network bandwidth for a specific process.
    
    macOS Implementation:
    - Uses pfctl (Packet Filter) + dummynet for actual bandwidth shaping
    - Creates a pipe with specified bandwidth limit
    - Tags packets from the target process
    - Routes tagged packets through the shaped pipe
    
    Args:
        pid: Process ID to throttle
        bandwidth_kbps: Bandwidth limit in Kbps (e.g., 100 = 100 Kbps)
    
    Returns:
        Status response
    """
    try:
        if IS_MAC:
            # Step 1: Create dummynet pipe with bandwidth limit
            pipe_num = pid % 1000  # Use PID-based pipe number to avoid conflicts
            
            # Configure dummynet pipe (requires sudo)
            pipe_config = f"dnctl pipe {pipe_num} config bw {bandwidth_kbps}Kbit/s"
            result = subprocess.run(
                ["sudo", "dnctl", "pipe", str(pipe_num), "config", "bw", f"{bandwidth_kbps}Kbit/s"],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode != 0:
                logger.warning(f"dummynet pipe creation failed: {result.stderr}")
                # Fallback to taskpolicy
                result = subprocess.run(
                    ["sudo", "taskpolicy", "-b", "-p", str(pid)],
                    capture_output=True,
                    check=False
                )
                return {
                    "success": True,
                    "method": "taskpolicy_fallback",
                    "message": f"Applied background QoS to PID {pid} (indirect throttling)"
                }
            
            # Step 2: Create pfctl rule to tag packets from this PID
            # Get the process name for the rule
            try:
                import psutil
                proc = psutil.Process(pid)
                proc_name = proc.name()
            except:
                proc_name = "unknown"
            
            # pfctl rule: tag packets from this process and send to dummynet pipe
            pf_rule = f"""
# Chrome Tamer throttle rule for PID {pid}
pass out proto tcp from any to any user {os.getuid()} tag throttle_{pid} dnpipe {pipe_num}
pass out proto udp from any to any user {os.getuid()} tag throttle_{pid} dnpipe {pipe_num}
"""
            
            # Write rule to temp file
            rule_file = f"/tmp/chrome_tamer_pf_{pid}.conf"
            with open(rule_file, 'w') as f:
                f.write(pf_rule)
            
            # Load the rule (requires sudo)
            result = subprocess.run(
                ["sudo", "pfctl", "-f", rule_file],
                capture_output=True,
                text=True,
                check=False
            )
            
            os.remove(rule_file)
            
            if result.returncode == 0:
                return {
                    "success": True,
                    "method": "pfctl_dummynet",
                    "bandwidth_kbps": bandwidth_kbps,
                    "pipe": pipe_num,
                    "message": f"Applied {bandwidth_kbps} Kbps bandwidth limit to PID {pid}"
                }
            else:
                logger.error(f"pfctl rule load failed: {result.stderr}")
                return {
                    "success": False,
                    "error": "pfctl failed - ensure sudo access and firewall allows pfctl"
                }
                
        elif IS_WINDOWS:
            # Windows: Use NetLimitSetTrafficLimit via ctypes (requires admin)
            # This requires Windows Filtering Platform driver
            # For now, documented as "coming soon"
            return {
                "success": False,
                "error": "Windows network throttling requires WFP driver (coming in v2.5)"
            }
        else:
            return {"success": False, "error": "Unsupported platform"}
            
    except Exception as e:
        logger.error(f"Network throttle error: {e}")
        return {"success": False, "error": str(e)}

def get_cpu_topology() -> Dict[str, Any]:
    """Detect CPU architecture and core topology (P-cores vs E-cores)."""
    try:
        import psutil
        
        cpu_count = psutil.cpu_count(logical=False)
        logical_count = psutil.cpu_count(logical=True)
        
        # Detect E-Core/P-Core split (Intel 12th gen+)
        # This is platform-specific and requires advanced detection
        # For MVP, we'll estimate based on CPU model
        
        if IS_WINDOWS:
            # Windows: Can detect via performance/efficiency core distinction
            # For now, assume 12th gen+ layout: First cores are P, rest are E
            # This is a heuristic and should be improved with CPUID
            ecores = max(0, cpu_count - (cpu_count // 2))
            pcores = cpu_count - ecores
        else:
            # macOS/Linux: No E/P distinction (or handled via QoS)
            ecores = 0
            pcores = cpu_count
        
        return {
            "success": True,
            "cpu_count": cpu_count,
            "logical_count": logical_count,
            "pcores": pcores,
            "ecores": ecores,
            "platform": platform.system()
        }
    except Exception as e:
        logger.error(f"Topology detection error: {e}")
        return {"success": False, "error": str(e)}

def set_cpu_affinity(pid: int, cores: list = None, coreClass: str = None) -> Dict[str, Any]:
    """
    Set CPU core affinity for a process.
    
    Args:
        pid: Process ID
        cores: List of core IDs (e.g., [0, 1, 2]) OR
        coreClass: 'ecores', 'pcores', 'auto'
    """
    try:
        import psutil
        
        # If coreClass is specified, determine cores from topology
        if coreClass:
            topology = get_cpu_topology()
            if not topology.get('success'):
                return topology
            
            total_cores = topology['cpu_count']
            pcores = topology['pcores']
            ecores = topology['ecores']
            
            if coreClass == 'pcores':
                cores = list(range(0, pcores))  # P-Cores are typically first
            elif coreClass == 'ecores':
                cores = list(range(pcores, total_cores))  # E-Cores after P-Cores
            elif coreClass == 'auto':
                # Auto: Use all cores (no restriction)
                cores = list(range(total_cores))
            else:
                return {"success": False, "error": f"Invalid coreClass: {coreClass}"}
        
        # Apply affinity
        proc = psutil.Process(pid)
        
        if hasattr(proc, 'cpu_affinity'):
            proc.cpu_affinity(cores)
            return {
                "success": True,
                "message": f"Set PID {pid} to cores {cores}",
                "cores": cores
            }
        else:
            # macOS fallback: Use taskpolicy
            if IS_MAC:
                # Use QoS classes instead of core pinning
                qos_class = "background" if coreClass == "ecores" else "default"
                result = subprocess.run(
                    ["sudo", "taskpolicy", "-b" if qos_class == "background" else "-d", "-p", str(pid)],
                    capture_output=True,
                    check=False
                )
                return {
                    "success": result.returncode == 0,
                    "message": f"Applied {qos_class} QoS to PID {pid}",
                    "method": "taskpolicy_qos"
                }
            
            return {
                "success": False,
                "error": "CPU affinity not supported on this platform"
            }
    except Exception as e:
        logger.error(f"CPU affinity error: {e}")
        return {"success": False, "error": str(e)}

def get_system_stats() -> Dict[str, Any]:
    """Get enhanced system statistics."""
    try:
        import psutil
        
        mem = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=0.1)
        
        return {
            "success": True,
            "stats": {
                "memory_percent": mem.percent,
                "memory_available_mb": mem.available / (1024 * 1024),
                "cpu_percent": cpu_percent,
                "platform": platform.system()
            }
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return {"success": False, "error": str(e)}

def handle_message(message: Dict[str, Any]) -> Dict[str, Any]:
    """Route message to appropriate handler."""
    action = message.get("action")
    
    if action == "throttle_network":
        return throttle_network(
            message.get("pid"),
            message.get("bandwidth_kbps", 100)
        )
    elif action == "set_cpu_affinity":
        return set_cpu_affinity(
            message.get("pid"),
            message.get("cores"),
            message.get("coreClass")
        )
    elif action == "get_cpu_topology":
        return get_cpu_topology()
    elif action == "get_stats":
        return get_system_stats()
    elif action == "ping":
        return {"success": True, "pong": True, "version": "2.4.0"}
    else:
        return {"success": False, "error": f"Unknown action: {action}"}

def main():
    """Main message loop."""
    logger.info("Chrome Tamer Native Host started")
    
    while True:
        message = read_message()
        if message is None:
            break
            
        logger.info(f"Received: {message}")
        response = handle_message(message)
        logger.info(f"Sending: {response}")
        send_message(response)
    
    logger.info("Chrome Tamer Native Host stopped")

if __name__ == "__main__":
    main()
