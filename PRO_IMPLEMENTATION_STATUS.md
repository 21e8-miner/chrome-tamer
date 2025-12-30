# Chrome Tamer Pro Features - Implementation Guide

## ✅ Completed: Network Throttling Foundation (v2.4)

### What Was Built:
1. **Native Messaging Bridge** (`src/chrome_tamer_host.py`)
   - Bi-directional communication between extension and native Python host
   - JSON-based message protocol via stdin/stdout
   - Handlers for network throttling, CPU affinity, enhanced stats

2. **Extension Pro Module** (`extension/pro_features.js`)
   - License key validation (offline, no phone-home)
   - Native port management with auto-reconnect
   - Pro feature gating

3. **macOS/Linux Installer** (`src/install_native_host.sh`)
   - Automated setup of native messaging manifest
   - Python dependencies check
   - Extension ID setup

### How It Works:

```
Chrome Extension (pro_features.js)
         ↓ (Native Messaging)
Native Host (chrome_tamer_host.py)
         ↓ (System Calls)
OS-Level Network/CPU Management
```

### Current Network Throttling Implementation:

#### macOS:
- Uses `taskpolicy -b` to set background QoS
- Indirect throttling via process priority
- **Next**: Implement direct `pfctl` packet filtering (requires root)

#### Windows:
- **Status**: Documented as "coming soon"
- **Requirement**: Windows Filtering Platform or NetLimitSetTrafficLimit
- **Next**: Implement WFP driver or find user-mode alternative

### Testing the Native Bridge:

```bash
# 1. Install the native host
cd src
./install_native_host.sh

# 2. Get your extension ID from chrome://extensions
# 3. Enter it when prompted

# 4. Test manually:
echo '{"action":"ping"}' | python3 chrome_tamer_host.py
# Should output: {"success": true, "pong": true, "version": "2.4.0"}
```

### Enabling Pro in the Extension:

```javascript
// In console (chrome://extensions → Service Worker → Console):
chrome.runtime.sendMessage({
    action: 'activatePro',
    licenseKey: 'PRO-TEST-KEY-2025'
}, response => console.log(response));

// Verify:
chrome.runtime.sendMessage({
    action: 'checkProStatus'
}, response => console.log('Pro Active:', response.isPro));
```

---

## 🚧 Next Pro Features to Build

### 2. E-Core Pinning UI (v2.5)
**Status**: Foundation ready, needs UI

**Implementation Plan**:
1. **Native Host Addition**:
   ```python
   def get_cpu_topology():
       # Use psutil to detect P-cores vs E-cores
       # Return core list with performance class
   
   def pin_to_ecores(pid):
       # Windows: Set affinity to cores 0-3 (E-cores on 12th gen+)
       # macOS: Not applicable, use QoS instead
   ```

2. **Extension UI**:
   - Add popup section: "CPU Policy"
   - Dropdown: "Auto / E-Cores Only / Performance Cores Only"
   - Show live core allocation per tab

**ETA**: 2-3 hours

---

### 3. Hyperfocus Profiles (v2.6)
**Status**: Concept ready, needs config system

**Implementation Plan**:
1. **Profile Schema** (`extension/profiles.js`):
   ```javascript
   const PROFILES = {
       work: {
           protected: ['gmail.com', 'slack.com', 'calendar.google.com'],
           aggressive: ['twitter.com', 'reddit.com', 'youtube.com'],
           bandwidth: 1000 // Kbps for background tabs
       },
       gaming: {
           protected: ['wiki.*, discord.com'],
           aggressive: ['*'], // Kill everything else
           bandwidth: 100
       }
   };
   ```

2. **One-Click Switching**:
   - Add to popup: Profile selector
   - Apply domain rules + bandwidth limits instantly
   - Store active profile in `chrome.storage.local`

**ETA**: 3-4 hours

---

### 4. Historical Dashboard (v2.7)
**Status**: Telemetry exists, needs aggregation

**Implementation Plan**:
1. **Time-Series Storage**:
   ```javascript
   // Store every prune event
   {
       timestamp: Date.now(),
       tabs_pruned: 5,
       memory_pressure: 0.82,
       reason: 'pressure_spike'
   }
   ```

2. **Dashboard Page** (`extension/dashboard.html`):
   - Chart.js for "RAM Freed Over Time"
   - Table: "Most Pruned Domains" (leaderboard)
   - Export button → CSV download

**ETA**: 4-5 hours

---

## 💰 Monetization Integration

### License Key System (Already Implemented)

**Free Tier**:
- Standard pressure-aware eviction (75% threshold)
- Manual domain exclusion
- Basic stats

**Pro Tier ($4.99)**:
- Network throttling (when native host installed)
- E-Core pinning
- Hyperfocus profiles
- Historical dashboard
- Priority support

### License Validation:

```javascript
// Offline validation (no server required)
function validateLicenseKey(key) {
    // Format: PRO-[HASH]-[TIMESTAMP]-[CHECKSUM]
    const parts = key.split('-');
    if (parts.length !== 4 || parts[0] !== 'PRO') return false;
    
    // Verify checksum
    const expectedChecksum = sha256(parts.slice(0, 3).join('-') + SECRET_SALT);
    return parts[3] === expectedChecksum.substring(0, 8);
}
```

### Distribution:

1. **Chrome Web Store**: Free tier (already submitted)
2. **Gumroad/Stripe**: Sell Pro license keys
3. **Email Delivery**: Send `PRO-xxxx-xxxx-xxxx` key to buyer
4. **Activation**: User pastes key in extension popup

---

## 📊 Current Status Summary

| Feature | Status | Moat Strength | ETA to Complete |
|---------|--------|---------------|-----------------|
| Pressure-Aware Eviction | ✅ Live | Medium | - |
| Native Messaging Bridge | ✅ Built | High | - |
| Network Throttling (macOS) | 🟡 Basic | High | 2 hours |
| Network Throttling (Windows) | ❌ Planned | High | 8 hours |
| E-Core Pinning UI | 🟡 Backend Ready | High | 3 hours |
| Hyperfocus Profiles | ❌ Designed | Medium | 4 hours |
| Historical Dashboard | ❌ Designed | Low | 5 hours |
| License Validation | ✅ Built | - | - |

**Total Dev Time to Full Pro**: ~20 hours
**Most Valuable Next**: Network Throttling (macOS) - it's the biggest differentiator

---

## 🎯 Recommended Path Forward

### Option 1: Ship Pro MVP (Fastest Revenue)
1. Finish macOS network throttling (2 hours)
2. Add E-Core UI (3 hours)
3. Launch Pro tier with Gumroad link
4. **Revenue Start**: This week

### Option 2: Full Feature Set (Best Product)
1. All of Option 1
2. Add Hyperfocus Profiles (4 hours)
3. Add Dashboard (5 hours)
4. Launch with "complete" feature set
5. **Revenue Start**: Next week

**Which option do you want me to execute?**
