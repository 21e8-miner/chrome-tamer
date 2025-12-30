"""
Chrome Tamer Core Engine (Hardened)
==================================
Lightweight Chrome memory optimization without heavy dependencies.
Refactored for robustness, beta testing, and Chromium-wide support.

Features:
- Multi-browser support (Chrome, Edge, Brave)
- Admin privilege detection
- Advanced error handling for system-level calls
- Optimized process scanning
"""

import ctypes
import time
import threading
import os
import sys
import logging
from ctypes import windll, byref, Structure, c_long, c_ulong
from dataclasses import dataclass, field
from typing import Callable, Optional, List, Set
import psutil

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
# Windows API Structures
# ============================================================================

class POINT(Structure):
    _fields_ = [("x", c_long), ("y", c_long)]

# Load Windows APIs
try:
    psapi = ctypes.WinDLL('psapi.dll')
    EmptyWorkingSet = psapi.EmptyWorkingSet
    EmptyWorkingSet.argtypes = [ctypes.c_void_p]
    EmptyWorkingSet.restype = ctypes.c_bool
except Exception as e:
    logger.error(f"Failed to load psapi.dll: {e}")
    EmptyWorkingSet = None

def is_admin():
    """Checks if the script is running with administrative privileges."""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

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
    Supports Chrome, Edge, and Brave.
    """
    
    # Configuration
    EFFICIENCY_SINK_CORE = 5          
    HIGH_PERF_CORES = [0, 1, 2, 3] 
    POLL_INTERVAL = 1.0            
    
    SUPPORTED_BROWSERS = {
        "chrome.exe",
        "msedge.exe",
        "brave.exe",
        "vivaldi.exe"
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
            
        logger.info("Starting Chrome Tamer Core...")
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
        
    @staticmethod
    def _get_active_window_pid() -> int:
        try:
            hwnd = windll.user32.GetForegroundWindow()
            pid = c_ulong()
            windll.user32.GetWindowThreadProcessId(hwnd, byref(pid))
            return pid.value
        except:
            return 0
    
    def _squash_memory(self, pid: int) -> float:
        if EmptyWorkingSet is None:
            return 0.0
            
        try:
            proc = psutil.Process(pid)
            before_mb = proc.memory_info().rss / (1024 * 1024)
            
            # Use specific access rights for OpenProcess
            # PROCESS_QUERY_INFORMATION (0x0400) | PROCESS_SET_QUOTA (0x0100)
            handle = ctypes.windll.kernel32.OpenProcess(0x0400 | 0x0100, False, pid)
            if handle:
                EmptyWorkingSet(handle)
                ctypes.windll.kernel32.CloseHandle(handle)
                
                time.sleep(0.1)
                after_mb = proc.memory_info().rss / (1024 * 1024)
                freed = max(0, before_mb - after_mb)
                if freed > 1.0:
                    logger.debug(f"Freed {freed:.1f}MB from PID {pid}")
                return freed
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
        except Exception as e:
            logger.error(f"Error squashing PID {pid}: {e}")
        return 0.0
    
    def _set_process_affinity(self, proc: psutil.Process, cores: List[int], priority: int) -> bool:
        try:
            # Check if affinity change is actually needed to save syscalls
            try:
                current = proc.cpu_affinity()
                if set(current) == set(cores):
                    return False
                proc.cpu_affinity(cores)
            except (AttributeError, psutil.AccessDenied):
                # Some systems or processes don't support affinity
                pass
                
            try:
                proc.nice(priority)
            except psutil.AccessDenied:
                pass
                
            return True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
        return False
        
    def _tame_browsers(self) -> None:
        active_pid = self._get_active_window_pid()
        self._stats.active_browser_pid = None
        background_count = 0
        
        # Optimize: Only iterate once and minimal fields
        for proc in psutil.process_iter(['pid', 'name', 'ppid']):
            try:
                name = proc.info['name'].lower()
                if name not in self.SUPPORTED_BROWSERS:
                    continue
                    
                pid = proc.info['pid']
                ppid = proc.info['ppid']
                
                # Check active focus
                is_active = (pid == active_pid) or (ppid == active_pid)
                
                if is_active:
                    self._stats.active_browser_pid = pid
                    self._set_process_affinity(
                        proc, 
                        self.HIGH_PERF_CORES, 
                        psutil.HIGH_PRIORITY_CLASS
                    )
                    continue
                
                # BACKGROUND
                background_count += 1
                changed = self._set_process_affinity(
                    proc,
                    [self.EFFICIENCY_SINK_CORE],
                    psutil.IDLE_PRIORITY_CLASS
                )
                
                if changed:
                    self._stats.processes_tamed += 1
                
                # Memory squashing
                try:
                    mem_info = proc.memory_info()
                    mem_mb = mem_info.rss / (1024 * 1024)
                    if mem_mb > self.ram_threshold_mb and pid not in self._squashed_pids:
                        saved = self._squash_memory(pid)
                        if saved > 0:
                            self._stats.ram_saved_mb += saved
                            self._squashed_pids.add(pid)
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
            cpu_count = psutil.cpu_count()
            all_cores = list(range(cpu_count))
            
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    if proc.name().lower() in self.SUPPORTED_BROWSERS:
                        proc.cpu_affinity(all_cores)
                        proc.nice(psutil.NORMAL_PRIORITY_CLASS)
                except:
                    continue
        except:
            pass

if __name__ == "__main__":
    if not is_admin():
        print("WARNING: Not running as Administrator. Some processes may be inaccessible.")
    
    def update_print(stats: TamerStats):
        print(f"\r[Tamer] Saved: {stats.ram_saved_mb:.1f}MB | Background: {stats.background_count} | Active: {stats.active_browser_pid or 'N/A'}", end="")
    
    tamer = ChromeTamer(on_stats_update=update_print)
    tamer.start()
    try:
        while True: time.sleep(1)
    except KeyboardInterrupt:
        tamer.stop()
