"""
Hardened Chrome Tamer System Tray Application
==============================================
PyQt6-based system tray app with robustness for beta testing.
"""

import sys
import os
import json
import logging
from pathlib import Path
from PyQt6.QtWidgets import (
    QApplication, QSystemTrayIcon, QMenu, QWidget, QVBoxLayout, 
    QLabel, QHBoxLayout, QPushButton, QLineEdit, QMessageBox,
    QDialog, QFrame
)
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QIcon, QAction, QFont, QPixmap, QPainter, QColor

# Configure logging for the UI
logger = logging.getLogger(__name__)

# Import hardened engine
try:
    from chrome_tamer_core import ChromeTamer, TamerStats, is_admin
    from license import (
        get_current_license_status, validate_license_key, 
        save_license, clear_license
    )
except ImportError as e:
    print(f"Failed to import core modules: {e}")
    sys.exit(1)

# ============================================================================
# Configuration Management
# ============================================================================

CONFIG_FILE = Path.home() / ".chrome_tamer" / "config.json"

def load_config():
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text())
        except Exception as e:
            logger.warning(f"Failed to load config: {e}")
    return {"auto_start": False, "aggressive": False}

def save_config(config):
    try:
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        CONFIG_FILE.write_text(json.dumps(config))
    except Exception as e:
        logger.error(f"Failed to save config: {e}")

# ============================================================================
# License Dialog
# ============================================================================

class LicenseDialog(QDialog):
    """Dialog for entering and managing license keys."""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Activate Premium Beta")
        self.setFixedSize(400, 220)
        self.setStyleSheet("background-color: #1a1a2e; color: #fff;")
        self._setup_ui()
        self._load_current_status()
        
    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        
        # Header
        header = QLabel("🔑 Premium Activation")
        header.setStyleSheet("font-size: 16px; font-weight: bold; color: #00d9ff;")
        layout.addWidget(header)
        
        # License input
        self.key_input = QLineEdit()
        self.key_input.setPlaceholderText("CT-XXXX-XXXX-XXXX-XXXX")
        self.key_input.setStyleSheet("""
            QLineEdit {
                padding: 10px;
                font-size: 14px;
                font-family: 'Consolas', monospace;
                border: 2px solid #333;
                border-radius: 8px;
                background: #16213e;
                color: #fff;
            }
            QLineEdit:focus { border-color: #00d9ff; }
        """)
        layout.addWidget(self.key_input)
        
        # Status label
        self.status_label = QLabel("Free Tier Active")
        self.status_label.setStyleSheet("color: #888; font-size: 11px;")
        layout.addWidget(self.status_label)
        
        # Buttons
        btn_layout = QHBoxLayout()
        
        self.activate_btn = QPushButton("Activate")
        self.activate_btn.setStyleSheet("""
            QPushButton { background: #00d9ff; color: #000; padding: 10px; border-radius: 8px; font-weight: bold; }
            QPushButton:hover { background: #00b8d4; }
        """)
        self.activate_btn.clicked.connect(self._activate)
        btn_layout.addWidget(self.activate_btn)
        
        self.deactivate_btn = QPushButton("Reset")
        self.deactivate_btn.setStyleSheet("""
            QPushButton { background: #333; color: #fff; padding: 10px; border-radius: 8px; }
            QPushButton:hover { background: #444; }
        """)
        self.deactivate_btn.clicked.connect(self._deactivate)
        btn_layout.addWidget(self.deactivate_btn)
        
        layout.addLayout(btn_layout)
        
    def _load_current_status(self):
        status = get_current_license_status()
        if status.is_premium:
            self.key_input.setText(status.license_key)
            self.status_label.setText("✓ Premium Features Unlocked")
            self.status_label.setStyleSheet("color: #00ff88;")
        else:
            self.status_label.setText("Free Tier - Aggressive mode disabled")
            self.status_label.setStyleSheet("color: #888;")
            
    def _activate(self):
        key = self.key_input.text()
        result = validate_license_key(key)
        
        if result.is_valid:
            save_license(key)
            self.status_label.setText("✓ Activation Successful!")
            self.status_label.setStyleSheet("color: #00ff88;")
            QMessageBox.information(self, "Success", "Premium features are now active.")
            self.accept()
        else:
            self.status_label.setText(f"✗ {result.error_message}")
            self.status_label.setStyleSheet("color: #ff4444;")
            
    def _deactivate(self):
        clear_license()
        self.key_input.clear()
        self.status_label.setText("License cleared.")
        self.status_label.setStyleSheet("color: #888;")

# ============================================================================
# Stats Window (Hardened)
# ============================================================================

class StatsWindow(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Stats")
        self.setFixedSize(320, 270)
        self.setWindowFlags(Qt.WindowType.Tool | Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self._setup_ui()
        
    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        container = QFrame()
        container.setObjectName("statsContainer")
        container.setStyleSheet("""
            #statsContainer {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 rgba(26, 26, 46, 250), stop:1 rgba(22, 33, 62, 250));
                border-radius: 20px;
                border: 1px solid rgba(15, 52, 96, 200);
            }
            QLabel { color: #e0e0e0; font-family: 'Segoe UI', sans-serif; }
        """)
        
        container_layout = QVBoxLayout(container)
        container_layout.setContentsMargins(20, 20, 20, 20)
        
        # Header
        header = QLabel("⚡ Chrome Tamer Beta")
        header.setStyleSheet("font-size: 14px; font-weight: bold; color: #00d9ff;")
        container_layout.addWidget(header)
        
        # Stats layout
        stats_frame = QFrame()
        stats_layout = QHBoxLayout(stats_frame)
        
        self.ram_val = self._add_stat(stats_layout, "0.0", "MB Saved")
        self.tamed_val = self._add_stat(stats_layout, "0", "Tames")
        self.bg_val = self._add_stat(stats_layout, "0", "Hold")
        
        container_layout.addWidget(stats_frame)
        
        # Admin Warning
        self.admin_label = QLabel("⚠️ Standard Mode (Reduced Visibility)")
        self.admin_label.setStyleSheet("color: #ffa000; font-size: 10px;")
        if is_admin():
            self.admin_label.setText("✓ Admin Elevation Engaged")
            self.admin_label.setStyleSheet("color: #00ff88; font-size: 10px;")
        container_layout.addWidget(self.admin_label)
        
        self.status_label = QLabel("● Optimization Active")
        self.status_label.setStyleSheet("color: #00ff88; font-size: 11px;")
        container_layout.addWidget(self.status_label)
        
        self.uptime_label = QLabel("Uptime: 0s")
        self.uptime_label.setStyleSheet("color: #888; font-size: 10px;")
        container_layout.addWidget(self.uptime_label)
        
        layout.addWidget(container)
        
    def _add_stat(self, layout, val, label):
        v = QVBoxLayout()
        v_label = QLabel(val)
        v_label.setStyleSheet("font-size: 22px; font-weight: 800; color: #00d9ff;")
        v_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        l_label = QLabel(label)
        l_label.setStyleSheet("font-size: 9px; color: #888; text-transform: uppercase;")
        l_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        v.addWidget(v_label)
        v.addWidget(l_label)
        w = QWidget()
        w.setLayout(v)
        layout.addWidget(w)
        return v_label

    def update_stats(self, stats: TamerStats):
        self.ram_val.setText(f"{stats.ram_saved_mb:.1f}")
        self.tamed_val.setText(str(stats.processes_tamed))
        self.bg_val.setText(str(stats.background_count))
        self.uptime_label.setText(f"Uptime: {int(stats.uptime_seconds)}s")

# ============================================================================
# Main App
# ============================================================================

class ChromeTamerApp:
    def __init__(self):
        self.app = QApplication(sys.argv)
        self.app.setQuitOnLastWindowClosed(False)
        
        self.config = load_config()
        self.lic = get_current_license_status()
        
        # Use config and license to set mode
        is_premium = self.lic.is_premium
        aggressive = self.config.get("aggressive", False) and is_premium
        
        self.tamer = ChromeTamer(
            aggressive_mode=aggressive,
            on_stats_update=None # We use timer for stability in PyQt
        )
        
        self._setup_tray()
        self.stats_window = StatsWindow()
        
        self.timer = QTimer()
        self.timer.timeout.connect(self._sync_stats)
        self.timer.start(1500)
        
        self.tamer.start()
        
    def _setup_tray(self):
        icon = self._create_icon()
        self.tray = QSystemTrayIcon(icon, self.app)
        
        menu = QMenu()
        menu.setStyleSheet("background-color: #1a1a2e; color: #fff; border: 1px solid #333;")
        
        title = menu.addAction("Chrome Tamer (Release Candidate)")
        title.setEnabled(False)
        menu.addSeparator()
        
        self.toggle_act = menu.addAction("⏸ Pause Optimization")
        self.toggle_act.triggered.connect(self._toggle)
        
        menu.addAction("📊 System Dashboard").triggered.connect(self._show_stats)
        
        if self.lic.is_premium:
            menu.addAction("⭐ Premium Active").triggered.connect(self._license_dialog)
        else:
            menu.addAction("🔓 Get Premium").triggered.connect(self._license_dialog)
        
        menu.addSeparator()
        menu.addAction("❌ Terminate").triggered.connect(self._exit)
        
        self.tray.setContextMenu(menu)
        self.tray.show()
        
    def _create_icon(self):
        p = QPixmap(64, 64)
        p.fill(Qt.GlobalColor.transparent)
        pt = QPainter(p)
        pt.setRenderHint(QPainter.RenderHint.Antialiasing)
        pt.setBrush(QColor("#00d9ff"))
        pt.setPen(Qt.PenStyle.NoPen)
        pt.drawEllipse(8, 8, 48, 48)
        pt.setPen(QColor("#1a1a2e"))
        f = QFont("Arial", 28, QFont.Weight.Bold)
        pt.setFont(f)
        pt.drawText(p.rect(), Qt.AlignmentFlag.AlignCenter, "C")
        pt.end()
        return QIcon(p)
        
    def _toggle(self):
        if self.tamer.is_running():
            self.tamer.stop()
            self.toggle_act.setText("▶ Resume Engine")
            self.stats_window.status_label.setText("○ Paused")
            self.stats_window.status_label.setStyleSheet("color: #ff4444;")
        else:
            self.tamer.start()
            self.toggle_act.setText("⏸ Pause Engine")
            self.stats_window.status_label.setText("● Optimization Active")
            self.stats_window.status_label.setStyleSheet("color: #00ff88;")
            
    def _show_stats(self):
        if self.stats_window.isVisible():
            self.stats_window.hide()
        else:
            # Position logic
            pos = self.tray.geometry().center()
            if pos.isNull(): # Sometimes geometry isn't ready
                self.stats_window.show()
                return
            self.stats_window.move(pos.x() - 160, pos.y() - 310)
            self.stats_window.show()
            
    def _license_dialog(self):
        d = LicenseDialog()
        d.exec()
        self.lic = get_current_license_status()
        
    def _sync_stats(self):
        if self.stats_window.isVisible():
            self.stats_window.update_stats(self.tamer.get_stats())
            
    def _exit(self):
        self.tamer.stop()
        self.app.quit()
        
    def run(self):
        return self.app.exec()

if __name__ == "__main__":
    app = ChromeTamerApp()
    sys.exit(app.run())
