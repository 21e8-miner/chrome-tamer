# Chrome Tamer: Equilibrium-Driven Resource Allocation [v2.1]

> *"Sparsity is not an imposed constraint, but an emergent property of competition."*

**Chrome Tamer** is a high-performance browser extension that replaces traditional "timeout-based" tab suspenders with a **Game-Theoretic Resource Allocator**.

Instead of arbitrarily killing tabs after 10 minutes, Chrome Tamer treats every background process as a player in a non-cooperative game. Tabs must "bid" for system resources based on their **Utility Score**. When competition for RAM exceeds the system's supply, dominated strategies (tabs with low utility) are pruned via the native `chrome.tabs.discard` API.

![Version](https://img.shields.io/badge/build-v2.1_Nash-00d9ff)
![License](https://img.shields.io/badge/license-MIT-white)

## 🧠 The Math (How it Works)

The engine runs a `computeNashEquilibrium()` cycle every minute. The utility function $U(t)$ for a given tab $t$ is calculated as:

$$U(t) = \frac{\alpha}{T_{idle} + 1} - (C_{base} + \beta \cdot N_{redundancy})$$

Where:
*   $T_{idle}$: Time since last interaction (Recency Benefit).
*   $C_{base}$: Base metabolic cost of a Chrome renderer capability (approx. 150MB).
*   $N_{redundancy}$: The number of other tabs open from the same domain (Penalty for clutter).

If $U(t) < 0$, the tab is considered a **Dominated Strategy** and is immediately deallocated.

## ✨ Features

*   **Logic-Based Pruning**: Kills clutter (50 duplicate documentation tabs) faster than unique, important pages.
*   **Hyperfocus Mode ("The Panic Button")**: A single click forces a "Middle-Out" compression event, deallocating *every* background resource to free up maximum CPU/RAM for your active task (Gaming/Calls).
*   **Zero-Injection**: Uses pure native browser APIs. No content scripts injected into your pages. Secure and lightweight.
*   **Visual Debugger**: Real-time view of the Utility Scores for active tabs.

## 📦 Installation (Developer Mode)

1.  Clone this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle **Developer mode** (top right).
4.  Click **Load unpacked**.
5.  Select the `extension/` directory from this repo.

## 🏗️ Architecture

*   **Kernel**: `background.js` (Event-driven service worker).
*   **Input**: `popup.html` (Spectral UI System).
*   **Logic**: `Utility Calculation` (Game Theory Model).

---
*Built for the 21e8 mining rig ecosystem context.*
