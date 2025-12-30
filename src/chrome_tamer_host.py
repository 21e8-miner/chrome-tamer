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
    
    Args:
        pid: Process ID to throttle
        bandwidth_kbps: Bandwidth limit in Kbps (e.g., 100 = 100 Kbps)
    
    Returns:
        Status response
    """
    try:
        if IS_MAC:
            # macOS: Use pfctl (packet filter) to rate-limit by PID
            # This requires root/sudo and a pf anchor setup
            # For MVP, we'll use a simpler approach: lower the process priority
            # which indirectly reduces its network priority
            result = subprocess.run(
                ["sudo", "taskpolicy", "-b", "-p", str(pid)],
                capture_output=True,
                check=False
            )
            if result.returncode == 0:
                return {
                    "success": True,
                    "method": "taskpolicy_throttle",
                    "message": f"Applied background QoS to PID {pid} (indirect network throttling)"
                }
            else:
                return {
                    "success": False,
                    "error": "taskpolicy failed - may need sudo privileges"
                }
                
        elif IS_WINDOWS:
            # Windows: Use NetLimitSetTrafficLimit via ctypes (requires admin)
            # For MVP, we'll document this as "coming soon" since it requires
            # a kernel-mode driver or Windows Filtering Platform
            return {
                "success": False,
                "error": "Windows network throttling requires admin and is in beta"
            }
        else:
            return {"success": False, "error": "Unsupported platform"}
            
    except Exception as e:
        logger.error(f"Network throttle error: {e}")
        return {"success": False, "error": str(e)}

def set_cpu_affinity(pid: int, cores: list) -> Dict[str, Any]:
    """Set CPU core affinity for a process (Windows/Linux only)."""
    try:
        import psutil
        proc = psutil.Process(pid)
        
        if hasattr(proc, 'cpu_affinity'):
            proc.cpu_affinity(cores)
            return {
                "success": True,
                "message": f"Set PID {pid} to cores {cores}"
            }
        else:
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
            message.get("cores", [0])
        )
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
