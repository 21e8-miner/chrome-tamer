# Chrome Tamer: Equilibrium-Driven Resource Allocation [v2.2]

> *"Resource sparsity is corrected not by deletion, but by intelligent reallocation."*

**Chrome Tamer** is a high-performance system-wide browser optimizer. It combines a **Game-Theoretic Extension Engine** with a **Native Desktop Kernel** to maintain peak system performance, regardless of how many tabs you have open.

![Version](https://img.shields.io/badge/version-2.2_Equilibrium-00d9ff)
![Platform](https://img.shields.io/badge/platform-Windows_|_macOS-white)
![Build](https://img.shields.io/badge/build-Hardened-green)

## 🧠 The Engine (Technical Capabilities)

### 1. Game-Theoretic Extension (`extension/`)
The browser extension runs a `computeNashEquilibrium()` cycle every minute. The utility function $U(t)$ is now **system-pressure aware**:

$$U(t) = \frac{\text{benefitDecay}}{T_{idle} + 1} - (\text{baseCost} + \beta \cdot N_{\text{redundancy}} + \gamma \cdot P_{\text{system}})$$

Where:
*   $P_{\text{system}}$: Real-time **Memory Pressure** (0.0 to 1.0).
*   $\gamma$ (Pressure Weight): Amplifies the cost of tabs when your physical RAM is nearly full.
*   **Outcome**: In high-pressure situations, the extension becomes more aggressive; in low-pressure situations, it stays lenient.

### 2. Native Desktop Kernel (`src/`)
A cross-platform (Windows/macOS) Python application that provides system-level management:
*   **CPU Affinity (Windows)**: Isolates background browser renders to "Efficiency Cores".
*   **Process Priority**: Sets background tabs to `IDLE` priority, preventing them from stealing CPU cycles from your active work.
*   **Memory Squashing (Windows)**: Uses `EmptyWorkingSet` to force background processes to release unneeded physical RAM.
*   **Active Focus Detection**: Dynamic detection of focus events to instantly restore full performance to the tab you just switched to.

## ✨ New in v2.2
*   **Cross-Platform Support**: Full support for macOS and Windows.
*   **Memory Pressure Awareness**: Extension now scales its aggressiveness based on actual physical RAM usage.
*   **Enhanced UI**: Modernized popup with a real-time system pressure gauge and utility scoring leaderboard.
*   **Proactive Protection**: Built-in whitelist for critical domains (Github, YouTube, Google Meet, etc.).

## 📦 Setup

### Browser Extension
1.  Navigate to `chrome://extensions/`.
2.  Enable **Developer mode**.
3.  Click **Load unpacked** and select the `extension/` folder.

### Native Component (Optional but Recommended)
1.  Run `pip install -r requirements.txt`.
2.  Run `python src/tray_app.py` or use the provided build scripts.

---
*Developed for the 21e8-miner ecosystem to ensure smooth mining and browsing concurrent operations.*
