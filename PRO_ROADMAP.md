# Chrome Tamer Pro - Feature Roadmap

## Differentiated "Moat" Features (What Extensions Can't Do)

### 1. Network Bandwidth Taming (v2.4)
**Problem**: Heavy background tabs (Slack, Notion, YouTube Music) consume bandwidth even when idle, causing lag in video calls or downloads.

**Solution**: Implement OS-level network throttling for background browser processes.
- **Windows**: Use `NetLimitSetTrafficLimit` API to throttle background renders
- **macOS**: Use `pfctl` (packet filter) to rate-limit by PID
- **UI**: Popup slider: "Background tab bandwidth: Unlimited / 1 Mbps / 100 Kbps"

**Monetization Hook**: This is a **system-level capability** that browser extensions fundamentally cannot implement (requires native access to network stack).

---

### 2. E-Core Pinning Control UI (v2.5)
**Problem**: Intel 12th-gen+ CPUs have "Efficiency Cores" (E-Cores) and "Performance Cores" (P-Cores). Background tabs waste P-Cores.

**Solution**: Native UI for E-Core management policies.
- **Auto Mode**: Background tabs → E-Cores, Active tab → P-Cores
- **Manual Mode**: User-defined per-domain rules (e.g., "Pin Figma to P-Cores always")
- **Visual Feedback**: Tray icon shows current core allocation

**Monetization Hook**: macOS doesn't have E-Cores, but the "priority renicing" is the equivalent moat. Market this as "CPU Policy Control."

---

### 3. Hyperfocus Profiles (v2.6)
**Problem**: Users have different needs in different contexts (work vs gaming vs research).

**Solution**: One-click "Profiles" that change the entire tamer policy.
- **Work Profile**: Protect Gmail, Slack, Calendar; aggressive on social media
- **Gaming Profile**: Protect game wikis, Discord; kill everything else
- **Research Profile**: Protect docs, PDFs, localhost; kill news sites

**Monetization Hook**: This is **configuration automation**—technically possible in base extension, but the UX (one-click switching + profile sync) is Pro.

---

### 4. Historical Performance Dashboard (v2.7)
**Problem**: Users don't trust "RAM saved" metrics without proof.

**Solution**: Time-series telemetry dashboard.
- **Graph**: "System RAM over time" (before/after tamer activation)
- **Leaderboard**: "Top 10 most-discarded domains" (prove redundancy penalty is working)
- **Export**: CSV of all discard events for power users

**Monetization Hook**: The extension can do this, but **storing 30 days of telemetry** and rendering graphs is a premium UX feature.

---

## Chrome Web Store Submission (Option 1 - Free Tier)

### Immediate Actions
1. ✅ Remove game-theory overclaiming (DONE)
2. ✅ Add pressure threshold gate (DONE - 75%)
3. ✅ Privacy policy (DONE)
4. 🔲 Store listing assets:
   - 1280x800 screenshot (popup + pressure gauge)
   - 440x280 small promo tile
   - 128x128 icon
5. 🔲 Test on fresh Chrome profile (no dev flags)
6. 🔲 Submit via [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

### Store Listing Copy (Draft)
**Title**: Chrome Tamer - Memory-Pressure Tab Manager

**Short Description**: Automatically reclaim RAM by discarding idle background tabs when system memory runs low. No manual intervention required.

**Long Description**:
> Chrome Tamer monitors your system's memory pressure and automatically discards low-priority background tabs when RAM runs low. Unlike basic tab suspenders that use fixed timers, Chrome Tamer adapts to your system's real-time needs.
>
> **How it works:**
> - Checks memory pressure every minute
> - Only acts when available RAM drops below 25%
> - Penalizes duplicate tabs (e.g., 20 open Stack Overflow pages)
> - Protects pinned, audible, and recently-used tabs
> - Shows exactly why each tab was discarded
>
> **Technical details:**
> - Manifest V3 compliant
> - Uses `chrome.tabs.discard` (tabs reload on revisit)
> - Fully open source: github.com/21e8-miner/chrome-tamer
> - Zero telemetry or data collection
>
> **Pro Tip:** Pair with the optional native desktop kernel for system-level CPU and network optimization.

---

## Monetization Strategy (Option 2 - Pro Features)

### Pricing Model
- **Free (Extension Only)**: Standard pressure-aware eviction, 75% threshold
- **Pro ($4.99 one-time)**: Network throttling, E-Core control, Profiles, Dashboard
- **Enterprise ($49/seat/year)**: Multi-machine policy sync, Slack integration for team alerts

### Distribution
1. **Chrome Web Store**: Free tier submitted immediately
2. **Gumroad/Stripe**: Pro license keys verified via extension (no payment in-store)
3. **GitHub Releases**: Native binaries with license activation

### License Verification (Store-Compliant)
```javascript
// extension/background.js addition
chrome.storage.local.get('proLicenseKey', (data) => {
    if (validateLicenseKey(data.proLicenseKey)) {
        // Enable Pro features: network throttling UI, profiles
    }
});

function validateLicenseKey(key) {
    // Offline validation using public-key signature
    // No phone-home required (store policy compliant)
}
```

---

## Next Steps (You Choose the Path)

**Option A: Ship Free to Store ASAP**
- I'll create the store assets (screenshots, icons)
- Final MV3 compliance check
- Submit within 24 hours

**Option B: Build Pro Features First**
- I'll implement Network Throttling (native messaging bridge)
- E-Core UI in the tray app
- Ship with monetization layer ready

**Which do you want me to execute first?**
