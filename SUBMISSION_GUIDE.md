# Chrome Web Store Submission Guide

## Assets Created ✅
1. **Main Screenshot** (1280x800): `store_screenshot_main.png` - Shows the extension popup with live data
2. **Extension Icon** (128x128): `extension_icon_128.png` - Lion logo for the store

## Assets to Create Manually ⚠️
3. **Small Promo Tile** (440x280): Create using Canva/Figma
   - Dark gradient background
   - "Chrome Tamer" text
   - Lion icon
   - Subtitle: "Reclaim RAM Automatically"

---

## Pre-Submission Checklist

### 1. Final MV3 Compliance Test
```bash
cd /Users/adamsussman/Desktop/chrome-tamer/extension
# Load in Chrome:
# 1. chrome://extensions → Developer mode ON
# 2. Load unpacked → Select extension/
# 3. Check for console errors
# 4. Test: Let it run for 5 minutes, verify alarm fires
# 5. Trigger high memory pressure (open 50+ tabs), verify pruning works
```

### 2. Files to Package
The Chrome Web Store will automatically package your extension, but verify these files exist:
```
extension/
├── manifest.json          ✅ (MV3, correct permissions)
├── background.js          ✅ (Uses chrome.alarms, not loops)
├── popup.html             ✅ (Modern UI)
├── popup.js               ✅ (Transparent scoring)
├── icon16.png             ⚠️ (Need to create/copy)
├── icon48.png             ⚠️ (Need to create/copy)
└── icon128.png            ✅ (Use extension_icon_128.png)
```

**Action Required**: Copy the generated icon to extension folder:
```bash
cp ~/.gemini/antigravity/brain/*/extension_icon_128*.png extension/icon128.png
# Scale down for other sizes (use Preview or online tool)
```

### 3. Store Listing Information

**Title** (max 45 chars):
```
Chrome Tamer - Smart RAM Manager
```

**Summary** (max 132 chars):
```
Automatically frees RAM when system memory runs low. Pressure-aware tab management with zero configuration required.
```

**Description** (max 16,000 chars):
```
Chrome Tamer monitors your system's memory pressure and automatically reclaims RAM by discarding idle background tabs. Unlike basic tab suspenders that rely on fixed timers, Chrome Tamer only acts when your system actually needs the relief.

⚡ HOW IT WORKS
• Checks system RAM availability every minute
• Only discards tabs when free memory drops below 25%
• Prioritizes tabs by: recency, domain redundancy, and system load
• Uses chrome.tabs.discard (tabs stay visible, reload when you visit them)

🎯 KEY FEATURES
• Pressure-Gated: No unnecessary discards when RAM is plentiful
• Transparent Scoring: See exactly why each tab is targeted ("Redundant", "Idle", "Sys Pressure")
• Protected Contexts: Never discards pinned, audible, or recently-used tabs
• Domain Safelist: Right-click any site → "Exclude Domain"
• Zero Telemetry: 100% local operation, no data collection

🔧 TECHNICAL DETAILS
• Manifest V3 compliant (future-proof)
• Uses chrome.alarms for reliable scheduling
• Minimal permissions (tabs, storage, alarms, system.memory)
• Fully open source: github.com/21e8-miner/chrome-tamer
• No remote code or analytics

💡 PRO TIP
Pair with the optional native desktop kernel (available on GitHub) for system-level CPU optimization and network throttling.

PRIVACY POLICY
Chrome Tamer does not collect, store, or transmit any personal data. All processing happens locally on your device. See full privacy policy at: github.com/21e8-miner/chrome-tamer/blob/main/PRIVACY_POLICY.md
```

**Category**:
```
Productivity
```

**Language**:
```
English
```

**Privacy Policy URL**:
```
https://raw.githubusercontent.com/21e8-miner/chrome-tamer/main/PRIVACY_POLICY.md
```

### 4. Submission Steps

1. **Go to Chrome Web Store Developer Dashboard**:
   https://chrome.google.com/webstore/devconsole

2. **Create New Item**:
   - Click "New Item"
   - Upload ZIP of `extension/` folder (or let dashboard auto-package)

3. **Fill Store Listing**:
   - Upload main screenshot
   - Upload small promo tile (if created)
   - Upload icon (128x128)
   - Paste title, summary, description from above
   - Add privacy policy URL
   - Select category: Productivity

4. **Set Visibility**:
   - **Public** (recommended for user acquisition)
   - OR **Unlisted** (only shareable via direct link)

5. **Submit for Review**:
   - Review can take 1-3 business days
   - You'll get email notifications for approval/rejection

---

## Post-Submission Monitoring

### Expected Review Feedback (If Any)
Common reasons for rejection:
1. **Permissions**: If reviewer questions why we need `system.memory`, respond:
   > "Required for chrome.system.memory.getInfo() to read available RAM and gate pruning on actual memory pressure."

2. **Privacy Policy**: Already provided (✅)

3. **Functionality Test**: Reviewers will test in Chrome. If they report bugs:
   - Check their Chrome version (MV3 requires Chrome 88+)
   - Verify alarms are firing (view service worker console)

### First 100 Users
Once approved, share the store link on:
- Reddit: r/chrome, r/productivity
- Hacker News: "Show HN: Chrome Tamer – Memory-Pressure Tab Manager"
- Product Hunt: Launch with "Honest tech, no AI slop" angle

---

## Quick Actions Needed Before Submission

1. **Copy icon to extension folder**:
```bash
cd ~/Desktop/chrome-tamer
cp ~/.gemini/antigravity/brain/*/extension_icon_128*.png extension/icon128.png
# Use Preview or online tool to create icon16.png and icon48.png from icon128.png
```

2. **Test in clean Chrome profile** (no dev flags):
```bash
# Open incognito or new profile
chrome://extensions → Load unpacked → Select extension/
# Open 50+ tabs, wait for pressure to hit 75%, verify it prunes
```

3. **Create ZIP** (or let dashboard do it):
```bash
cd extension
zip -r ../chrome-tamer-extension.zip . -x "*.DS_Store"
```

4. **Submit** at https://chrome.google.com/webstore/devconsole

**ETA to Live**: 2-5 business days after submission.

Let me know when you're ready to submit and I can walk through it in real-time!
