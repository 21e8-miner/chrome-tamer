# Privacy Policy for Chrome Tamer

**Last Updated**: December 30, 2025

## Overview
Chrome Tamer is a browser extension and optional native application designed to optimize system memory by intelligently managing browser tabs.

## Data Collection
**Chrome Tamer does NOT collect, store, or transmit any personal data.**

### What We Access (Locally Only)
- **Browser Tabs**: We read tab metadata (title, URL, last accessed time) to calculate utility scores. This data never leaves your device.
- **System Memory Info**: We use `chrome.system.memory.getInfo()` to monitor RAM usage. This data is used locally and is not stored or transmitted.
- **User Preferences**: Settings like excluded domains and configuration values are stored locally using `chrome.storage.local`.

### What We Do NOT Do
- ❌ No analytics or telemetry collection
- ❌ No tracking pixels or beacons
- ❌ No network requests (the extension operates 100% offline)
- ❌ No access to browsing history beyond active tabs
- ❌ No sharing of data with third parties
- ❌ No advertisements

## Permissions Explained
- **`tabs`**: Required to read tab metadata and execute `chrome.tabs.discard()`
- **`storage`**: Required to save user settings (excluded domains, configuration)
- **`alarms`**: Required for periodic memory pressure checks
- **`system.memory`**: Required to read system RAM availability
- **`idle`**: Required to detect user inactivity
- **`contextMenus`**: Required for right-click domain exclusion

## Open Source
Chrome Tamer is fully open source. You can inspect the entire codebase at:
https://github.com/21e8-miner/chrome-tamer

## Contact
For questions or concerns about this privacy policy:
- GitHub Issues: https://github.com/21e8-miner/chrome-tamer/issues
- Email: privacy@21e8miner.com

## Changes to This Policy
We will update this policy as needed. The "Last Updated" date will reflect the most recent changes.
