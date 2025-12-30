# Chrome Tamer: Equilibrium-Driven Resource Allocation [v2.2]

> *"Resource sparsity is corrected not by deletion, but by intelligent reallocation."*

**Chrome Tamer** is a high-performance system-wide browser optimizer. It combines a **Game-Theoretic Extension Engine** with a **Native Desktop Kernel** to maintain peak system performance, regardless of how many tabs you have open.

# Chrome Tamer 🦁
**Memory-Pressure Eviction Engine for Chromium**

![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-blue)
![Build](https://img.shields.io/badge/Build-MV3%20Compliant-green)
![Version](https://img.shields.io/badge/Version-v2.3-orange)

---

## What It Does

Chrome Tamer is a **memory-pressure-aware eviction engine** that automatically reclaims RAM when your system is under stress. Instead of relying on fixed timers or manual tab management, it:

1. **Monitors system RAM** via `chrome.system.memory.getInfo()` every minute
2. **Only acts when pressure exceeds 75%** (configurable threshold)
3. **Scores background tabs** using: recency, domain redundancy, and system pressure
4. **Discards low-utility tabs** using `chrome.tabs.discard` (tabs stay visible, reload on revisit)

Unlike basic tab suspenders, Chrome Tamer penalizes **domain redundancy** (e.g., 20 duplicate documentation tabs) and adapts scoring based on **real-time memory headroom**.

---

## The Engine

### Browser Extension (v2.3)
- **Manifest V3 compliant**: Uses `chrome.alarms` for reliable scheduling (service workers go idle after 30s)
- **Pressure-gated pruning**: Only discards when `availableCapacity / capacity < 0.25`
- **Transparent scoring**: Shows "why" each tab is targeted (Idle, Redundant, Sys Pressure, or Aged Out)
- **Protected contexts**: Built-in safelist for GitHub, Meet, YouTube, localhost
- **Safety rails**: Never discards pinned, audible, or active tabs

**Scoring Formula**:
```
Utility(tab) = (BenefitDecay / (IdleMinutes + 1)) - (BaseCost + RedundancyPenalty + PressurePenalty)

where:
  RedundancyPenalty = CompetitionFactor × (DomainCount - 1)^1.2
  PressurePenalty = MemoryPressure × PressureWeight × 10
```

If `Utility(tab) < 0`, the tab is discarded.

### Native Desktop Kernel (Optional)
For system-level optimization beyond what browser extensions can achieve:
- **Windows**: E-Core isolation via CPU affinity, `EmptyWorkingSet` for memory squashing
- **macOS**: Background QoS via `taskpolicy -b`, priority renicing to IDLE class
- **Both**: Active focus detection to boost foreground processes to high priority

---

## Installation

### Browser Extension (Chrome/Edge/Brave)
1. Clone the repo: `git clone https://github.com/21e8-miner/chrome-tamer.git`
2. Open `chrome://extensions` → Enable "Developer mode"
3. Click "Load unpacked" → Select the `extension/` folder
4. The extension will start monitoring immediately

### Native Kernel (Advanced - Optional)
```bash
pip install -r requirements.txt.bak  # psutil, PyQt6
python src/chrome_tamer_core.py
```

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
