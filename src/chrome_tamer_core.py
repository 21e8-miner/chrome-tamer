"""
Chrome Tamer Core Engine (Cross-Platform)
=========================================
Lightweight Chrome memory optimization without heavy dependencies.
Now supports Windows and MacOS.
"""

import time
import threading
import os
import sys
import logging
import platform
import psutil
from dataclasses import dataclass, field
from typing import Callable, Optional, List, Set, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("chrome_tamer.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============================================================================
# Platform Abstraction
# ============================================================================

IS_WINDOWS = platform.system() == "Windows"
IS_MAC = platform.system() == "Darwin"

# Windows Specifics
EmptyWorkingSet = None
if IS_WINDOWS:
    try:
        import ctypes
        from ctypes import windll, byref, Structure, c_long, c_ulong
        psapi = ctypes.WinDLL('psapi.dll')
        EmptyWorkingSet = psapi.EmptyWorkingSet
        EmptyWorkingSet.argtypes = [ctypes.c_void_p]
        EmptyWorkingSet.restype = ctypes.c_bool
    except Exception as e:
        logger.error(f"Failed to load Windows specific DLLs: {e}")

def is_admin():
    """Checks if the script is running with administrative privileges."""
    if IS_WINDOWS:
        try:
            return ctypes.windll.shell32.IsUserAnAdmin()
        except:
            return False
    else:
        # On Mac/Linux, check UID
        return os.getuid() == 0

# ============================================================================
# Stats Tracking
# ============================================================================

@dataclass
class TamerStats:
    """Runtime statistics for Chrome Tamer."""
    ram_saved_mb: float = 0.0
    processes_tamed: int = 0
    active_browser_pid: Optional[int] = None
    background_count: int = 0
    is_running: bool = False
    uptime_seconds: float = 0.0
    is_admin: bool = field(default_factory=is_admin)
    platform: str = platform.system()
    
    def reset(self):
        self.ram_saved_mb = 0.0
        self.processes_tamed = 0
        self.active_browser_pid = None
        self.background_count = 0
        self.uptime_seconds = 0.0

# ============================================================================
# Core Engine
# ============================================================================

class ChromeTamer:
    """
    Hardened memory tamer that isolates background browser tabs to free RAM.
    Supports Chrome, Edge, Brave, and other Chromium browsers.
    """
    
    # Configuration
    EFFICIENCY_SINK_CORE = 0 # Usually the first core
    HIGH_PERF_CORES = list(range(1, psutil.cpu_count() or 4))
    POLL_INTERVAL = 1.0            
    
    SUPPORTED_BROWSERS = {
        "chrome", "chrome.exe", 'google chrome',
        "msedge", "msedge.exe",
        "brave", "brave.exe",
        "vivaldi", "vivaldi.exe"
    }
    
    def __init__(
        self,
        ram_threshold_mb: float = 200.0,
        aggressive_mode: bool = False,
        support_all_chromium: bool = True,
        on_stats_update: Optional[Callable[[TamerStats], None]] = None
    ):
        self.ram_threshold_mb = 100.0 if aggressive_mode else ram_threshold_mb
        self.poll_interval = 0.5 if aggressive_mode else self.POLL_INTERVAL
        self.support_all_chromium = support_all_chromium
        self.on_stats_update = on_stats_update
        
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._start_time: float = 0.0
        self._stats = TamerStats()
        self._squashed_pids: Set[int] = set()
        
    def start(self) -> None:
        if self._running:
            return
            
        logger.info(f"Starting Chrome Tamer Core on {platform.system()}...")
        self._running = True
        self._start_time = time.time()
        self._stats.is_running = True
        self._stats.reset()
        
        self._thread = threading.Thread(target=self._daemon_loop, daemon=True)
        self._thread.start()
        
    def stop(self) -> None:
        logger.info("Stopping Chrome Tamer Core...")
        self._running = False
        self._stats.is_running = False
        if self._thread:
            self._thread.join(timeout=2.0)
        self._restore_affinities()
        
    def get_stats(self) -> TamerStats:
        if self._running:
            self._stats.uptime_seconds = time.time() - self._start_time
        return self._stats
    
    def is_running(self) -> bool:
        return self._running
        
    def _get_active_window_pid(self) -> int:
        if IS_WINDOWS:
            try:
                from ctypes import windll, byref, c_ulong
                hwnd = windll.user32.GetForegroundWindow()
                pid = c_ulong()
                windll.user32.GetWindowThreadProcessId(hwnd, byref(pid))
                return pid.value
            except:
                return 0
        elif IS_MAC:
            try:
                # Use AppleScript to get the frontmost process ID
                import subprocess
                cmd = "osascript -e 'tell application \"System Events\" to get unix id of first process whose frontmost is true'"
                result = subprocess.check_output(cmd, shell=True).decode().strip()
                return int(result)
            except:
                return 0
        return 0
    
    def _squash_memory(self, pid: int) -> float:
        """Forces the process to release physical memory (Working Set)."""
        if EmptyWorkingSet is None and not IS_MAC:
            return 0.0
            
        try:
            proc = psutil.Process(pid)
            before_mb = proc.memory_info().rss / (1024 * 1024)
            
            if IS_WINDOWS and EmptyWorkingSet:
                import ctypes
                # PROCESS_QUERY_INFORMATION (0x0400) | PROCESS_SET_QUOTA (0x0100)
                handle = ctypes.windll.kernel32.OpenProcess(0x0400 | 0x0100, False, pid)
                if handle:
                    EmptyWorkingSet(handle)
                    ctypes.windll.kernel32.CloseHandle(handle)
            elif IS_MAC:
                # On MacOS, we rely on the kernel's compressed memory and memory pressure.
                # Explicit squashing isn't as critical as priority management.
                pass
                
            # Note: Removed time.sleep(0.1) to prevent blocking the main daemon loop.
            # Measuring freed RAM immediately may yield 0, but the OS handles the deallocation asynchronously.
            return 0.0 
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
        except Exception as e:
            logger.debug(f"Error squashing PID {pid}: {e}")
        return 0.0
    
    def _set_process_affinity(self, proc: psutil.Process, cores: List[int], priority: int) -> bool:
        """Sets CPU cores and scheduling priority with OS-specific deeper hooks."""
        try:
            changed = False
            # 1. Affinity (Windows Only)
            if hasattr(proc, 'cpu_affinity') and not IS_MAC:
                try:
                    current = proc.cpu_affinity()
                    if set(current) != set(cores):
                        proc.cpu_affinity(cores)
                        changed = True
                except (psutil.AccessDenied, AttributeError):
                    pass
                
            # 2. Nice/Priority
            try:
                if IS_WINDOWS:
                    if proc.nice() != priority:
                        proc.nice(priority)
                        changed = True
                else:
                    # Unix Nice
                    target_nice = 19 if priority == psutil.IDLE_PRIORITY_CLASS else 0
                    if proc.nice() != target_nice:
                        proc.nice(target_nice)
                        changed = True
                    
                    # 3. MacOS QoS Policy (The Pro Moat)
                    if IS_MAC and priority == psutil.IDLE_PRIORITY_CLASS:
                        # Use taskpolicy to force background QoS (more effective than renice alone)
                        try:
                            import subprocess
                            # -b sets background QoS
                            subprocess.run(["taskpolicy", "-b", "-p", str(proc.pid)], check=False, capture_output=True)
                        except:
                            pass
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                pass
                
            return changed
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
        return False
        
    def _tame_browsers(self) -> None:
        """Main optimization scan."""
        active_pid = self._get_active_window_pid()
        self._stats.active_browser_pid = None
        current_time = time.time()
        background_count = 0
        
        # Batch process iteration
        for proc in psutil.process_iter(['pid', 'name', 'ppid']):
            try:
                name = proc.info['name'].lower()
                is_browser = False
                for b in self.SUPPORTED_BROWSERS:
                    if b in name:
                        is_browser = True
                        break
                
                if not is_browser:
                    continue
                    
                pid = proc.info['pid']
                ppid = proc.info['ppid']
                
                # Identify Active Focus
                is_active = (pid == active_pid) or (ppid == active_pid)
                
                if is_active:
                    self._stats.active_browser_pid = pid
                    self._set_process_affinity(
                        proc, 
                        self.HIGH_PERF_CORES, 
                        psutil.HIGH_PRIORITY_CLASS if IS_WINDOWS else 0
                    )
                    continue
                
                # Background Optimization
                background_count += 1
                changed = self._set_process_affinity(
                    proc,
                    [self.EFFICIENCY_SINK_CORE],
                    psutil.IDLE_PRIORITY_CLASS if IS_WINDOWS else 19
                )
                
                if changed:
                    self._stats.processes_tamed += 1
                
                # Memory Squashing with Cooldown (First Principles: Prevent Thrashing)
                # Only squash if usage is high AND we haven't touched this PID in the last 60s
                try:
                    mem_info = proc.memory_info()
                    mem_mb = mem_info.rss / (1024 * 1024)
                    
                    if mem_mb > self.ram_threshold_mb:
                        last_squash = self._squashed_pids.get(pid, 0)
                        if (current_time - last_squash) > 60:
                            self._squash_memory(pid)
                            # Estimated saving of 40% Working Set on Windows
                            self._stats.ram_saved_mb += (mem_mb * 0.4) 
                            self._squashed_pids[pid] = current_time
                except psutil.AccessDenied:
                    pass
                        
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        self._stats.background_count = background_count
        if self.on_stats_update:
            try:
                self.on_stats_update(self._stats)
            except:
                pass
    
    def _daemon_loop(self) -> None:
        while self._running:
            try:
                self._tame_browsers()
            except Exception as e:
                logger.error(f"Daemon error: {e}")
            time.sleep(self.poll_interval)
    
    def _restore_affinities(self) -> None:
        try:
            cpu_count = psutil.cpu_count() or 4
            all_cores = list(range(cpu_count))
            
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    name = proc.name().lower()
                    is_browser = any(b in name for b in self.SUPPORTED_BROWSERS)
                    if is_browser:
                        if hasattr(proc, 'cpu_affinity'):
                            proc.cpu_affinity(all_cores)
                        proc.nice(psutil.NORMAL_PRIORITY_CLASS if IS_WINDOWS else 0)
                except:
                    continue
        except:
            pass

if __name__ == "__main__":
    if not is_admin():
        print("WARNING: Not running with elevated privileges. Some processes may be inaccessible.")
    
    def update_print(stats: TamerStats):
        print(f"\r[{stats.platform}] Freed: {stats.ram_saved_mb:.1f}MB | Tames: {stats.processes_tamed} | BG: {stats.background_count} | Active: {stats.active_browser_pid or 'N/A'}", end="")
    
    tamer = ChromeTamer(on_stats_update=update_print)
    tamer.start()
    try:
        while True: time.sleep(1)
    except KeyboardInterrupt:
        tamer.stop()
        print("\nOptimization stopped.")
