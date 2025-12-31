# Chrome Tamer Pro - Gumroad Product Page

## Product Title
Chrome Tamer Pro - Lifetime License

## Tagline
The only browser optimizer with OS-level network and CPU control

## Price
$4.99 (one-time payment, lifetime access)

## Product Description

### Transform Your Browser Into a Performance Machine

Chrome Tamer Pro unlocks system-level optimizations that browser extensions fundamentally cannot achieve. Stop treating tabs as abstract resources—control them at the kernel level.

**What You Get:**

🌐 **Network Bandwidth Throttling**  
Limit background tabs to 100 Kbps using macOS `pfctl` + `dummynet`. Force idle Slack/Notion/YouTube Music to stop hogging your bandwidth during video calls. *This is impossible for browser extensions.*

⚙️ **E-Core Pinning (Intel 12th Gen+)**  
Isolate background browser processes to Efficiency Cores, freeing up Performance Cores for your active work. Automatic or manual core policies. macOS users get equivalent QoS class control.

💼 **Hyperfocus Profiles**  
One-click workspace modes:
- **Work Mode**: Protect Gmail/Slack/Notion, kill social media
- **Gaming Mode**: Protect wikis/Discord, destroy everything else
- **Research Mode**: Protect docs/StackOverflow, throttle news
- **Deep Focus**: Only your active tab survives

📊 **Historical Dashboard**  
30-day telemetry showing:
- RAM freed over time (Chart.js visualizations)
- Memory pressure history
- "Most Pruned Domains" leaderboard
- CSV export for power users

### Technical Specs

- **Requires**: macOS 11+ or Windows 10+ (network throttling is macOS-only in v2.4)
- **No Subscription**: Pay once, own forever
- **Native Messaging**: Python host bridges extension to system calls
- **Open Source Base**: Free tier available on Chrome Web Store

### Installation

1. Install the free Chrome Tamer extension from the Chrome Web Store
2. Run the native host installer: `./src/install_native_host.sh`
3. Paste your Pro license key in the extension popup
4. All features unlock immediately (offline validation, no phone-home)

### License Key Format
`PRO-XXXX-XXXX-XXXX` (delivered via email)

### Support
- GitHub Issues: [github.com/21e8-miner/chrome-tamer](https://github.com/21e8-miner/chrome-tamer)
- Email: support@21e8miner.com
- Response time: <24 hours

### What Makes This "Pro"?

**Free Tier (Chrome Web Store):**
- Pressure-aware tab eviction
- Manual domain exclusions
- Basic stats

**Pro Tier (This Product):**
- Network throttling (kernel-level)
- CPU core affinity control
- Workspace profiles
- Historical analytics
- All future Pro features

### Refund Policy
30-day money-back guarantee. If Pro features don't work on your system, full refund—no questions asked.

---

## Gumroad Settings

**Category**: Software > Productivity Tools  
**File Delivery**: License key sent via email (automated)  
**Access**: Instant (no download required, just the key)  

**Email Template** (auto-sent on purchase):
```
Subject: Your Chrome Tamer Pro License Key

Hi {customer_name},

Thank you for purchasing Chrome Tamer Pro! 

Your license key: PRO-{unique_hash}

Steps to activate:
1. Install Chrome Tamer from the Chrome Web Store (free): [link]
2. Run the native host installer from GitHub: github.com/21e8-miner/chrome-tamer
3. Open the extension popup and paste your key
4. Pro features unlock immediately!

Need help? Reply to this email or open an issue on GitHub.

Enjoy your tamed browser!
- The Chrome Tamer Team
```

---

## Marketing Copy (for Twitter/HN/Product Hunt)

**Twitter Thread:**
```
1/ Just shipped Chrome Tamer Pro 🦁

The only browser optimizer that controls network bandwidth and CPU cores at the OS level.

Extensions can't do this. Here's why it matters: 🧵

2/ Ever been on a Zoom call while Slack/Notion hog bandwidth in the background?

Chrome Tamer Pro throttles idle tabs to 100 Kbps using macOS pfctl + dummynet.

Kernel-level packet shaping. Extensions can't touch the network stack.

3/ Got an Intel 12th gen CPU with E-Cores?

Chrome Tamer pins background browser processes to Efficiency Cores, freeing Performance Cores for your active work.

Again: extensions can't call `cpu_affinity()`.

4/ Four workspace profiles:
💼 Work: Protect productivity, kill distractions
🎮 Gaming: Protect wikis/Discord, destroy else
📚 Research: Protect docs, throttle news
🎯 Deep Focus: Only active tab survives

One click. Instant context switch.

5/ $4.99 lifetime. No subscription. Open source base.

Free tier on Chrome Web Store for standard tab management.

Pro tier for system-level control.

Try it: [link]
```

**Product Hunt Launch:**
```
Title: Chrome Tamer Pro - OS-Level Browser Optimization

Tagline: Network throttling and CPU core control for Chrome (impossible for extensions)

First Comment:
Hey Product Hunt! 👋

I built Chrome Tamer because I was tired of "tab managers" that just suspend tabs on timers.

Chrome Tamer Pro goes deeper:
- pfctl + dummynet bandwidth shaping for background tabs
- E-Core isolation for Intel 12th gen+
- One-click workspace profiles (Work/Gaming/Research)
- 30-day historical analytics

The key insight: browser extensions are sandboxed. To actually control resource allocation, you need native OS access.

This is the missing link between Chrome's built-in "Memory Saver" and a $2000 RAM upgrade.

Try the free tier first, upgrade if you want the moat features.

Questions? AMA!
```

---

## Revenue Projections (Conservative)

**Month 1-3**: 50 sales = $250  
**Month 4-6**: 100 sales = $500  
**Month 7-12**: 200 sales = $1,000  

**Year 1 Total**: ~$2,000 (assuming slow organic growth)

**With Product Hunt/HN Launch Spike**:  
Week 1: 500 sales = $2,500  
Sustainable: 50-100/month = $250-500/month recurring

---

**Next Steps:**
1. Create Gumroad account (if not already)
2. Set up product with above copy
3. Configure automated email delivery for license keys
4. Launch!
