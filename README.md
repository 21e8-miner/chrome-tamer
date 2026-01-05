# Chrome Tamer: Equilibrium-Driven Resource Allocation [v2.2]

> *"Resource sparsity is corrected not by deletion, but by intelligent mechanism design."*

**Chrome Tamer** is a high-performance system-wide browser optimizer. It treats browser tabs as autonomous players in a **Non-Cooperative Resource Game**, enforcing a **Nash Equilibrium** where tab residence is strictly gated by its marginal utility relative to system-wide opportunity cost.

---

## The Equilibrium Engine (v2.4)

Chrome Tamer replaces crude LRU heuristics with a dynamic **Pruning Engine** that monitors system memory pressure in real-time.

1. **Memory-Pressure Awareness**: Integrates `chrome.system.memory` to gate all pruning actions.
2. **Social Cost Pricing**: As RAM usage increases, the "tax" (cost) of keeping a tab open escalates dynamically.
3. **Redundancy Penalty**: Domain-level externalities are penalized non-linearly to prevent "Tab Swarming".
4. **Transparent Scoring**: The Live Debugger exposes the internal utility calculations for every tab.

### The Scoring Formula (Mechanism Design)

The system calculates a **Utility Score (U)** for each tab:

```
U(t) = B(t) - [C_base(P) + C_redundancy(D, P) + C_pressure(P)]
```

Where:
- **B(t)**: **Individual Benefit**. Decays via `BenefitDecay / (IdleTime + 1)`.
- **C_base(P)**: **Dynamic Base Cost**. Scaled by system pressure `P` to simulate higher scarcity.
- **C_redundancy(D, P)**: **Redundancy Externality**. Non-linear penalty for multiple tabs from the same domain `D`, sharpened when pressure `P` is high.
- **C_pressure(P)**: **System Pressure Gate**. Direct quadratic penalty based on current RAM headroom.

If `U(t) < 0`, the tab is considered a **Dominated Strategy** and is deallocated via `chrome.tabs.discard()`.

---

## Features

- **Nash Equilibrium Pruning**: Adaptive eviction based on real-time system state.
- **Hyperfocus Mode**: "Middle-out" compression that aggressively targets low-utility clusters.
- **Built-in Safelist**: Intelligent protection for Meet, YouTube, GitHub, and localhost.
- **Cross-Platform**: Optimized for Windows (WorkingSet management) and macOS (QoS/Renice).

---

## Installation

### Browser Extension (Chrome/Edge/Brave)
1. Clone the repo: `git clone https://github.com/21e8-miner/chrome-tamer.git`
2. Open `chrome://extensions` → Enable "Developer mode"
3. Click "Load unpacked" → Select the `extension/` folder
4. (Optional) Download the pre-built `.zip` from the [Latest Release](https://github.com/21e8-miner/chrome-tamer/releases).

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
