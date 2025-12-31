# 🚀 Chrome Tamer - Launch Checklist

## ✅ PHASE 1: Store Submission (TODAY)

### Pre-Flight Check
- [x] Extension is MV3 compliant
- [x] manifest.json has all required permissions
- [x] Privacy policy created and published
- [x] Store assets generated (screenshots, icons)
- [x] ZIP package created (`chrome-tamer-v2.3-store.zip`)
- [x] Honest branding (no game-theory overclaiming)

### Submit to Chrome Web Store
📍 **URL**: https://chrome.google.com/webstore/devconsole

**Steps:**
1. **Pay developer fee** ($5 one-time) if first submission
2. **Upload ZIP**: Select `chrome-tamer-v2.3-store.zip`
3. **Fill listing** (copy from `SUBMISSION_GUIDE.md`):
   - Title: "Chrome Tamer - Smart RAM Manager"
   - Summary: (132 chars)
   - Description: (Full copy provided)
   - Privacy Policy URL: `https://raw.githubusercontent.com/21e8-miner/chrome-tamer/main/PRIVACY_POLICY.md`
4. **Upload screenshots**: `extension/store_screenshot.png`
5. **Set visibility**: PUBLIC
6. **Submit for review**

**Timeline**: 2-3 business days → Approved by Jan 2-3, 2026

---

## ✅ PHASE 2: Pro Launch (THIS WEEK)

### Create Gumroad Product
📍 **URL**: https://gumroad.com/products/new

**Configuration** (from `GUMROAD_PRODUCT.md`):
- **Title**: Chrome Tamer Pro - Lifetime License
- **Price**: $4.99
- **Category**: Software > Productivity Tools
- **Description**: (Full copy provided in GUMROAD_PRODUCT.md)
- **Digital Product**: License key (auto-generated)
- **Email Template**: Configured for key delivery

**License Key Generation** (implement this):
```python
import hashlib
import secrets

def generate_license_key():
    timestamp = str(int(time.time()))
    random_hash = secrets.token_hex(4)
    checksum_input = f"{random_hash}-{timestamp}"
    checksum = hashlib.sha256(checksum_input.encode()).hexdigest()[:8]
    return f"PRO-{random_hash.upper()}-{timestamp[-8:]}-{checksum.upper()}"

# Example: PRO-A3F2B8C1-20250103-D4E9F1A2
```

### Test Pro Features
```bash
# 1. Load extension
chrome://extensions → Load unpacked → Select extension/

# 2. Install native host
cd src
./install_native_host.sh
# Enter extension ID when prompted

# 3. Test in console
chrome.runtime.sendMessage({
    action: 'activatePro',
    licenseKey: 'PRO-TEST-KEY-2025'
});

# 4. Verify features unlocked
chrome.runtime.sendMessage({
    action: 'checkProStatus'
}, r => console.log(r));
```

---

## ✅ PHASE 3: Marketing (WEEK 1-2)

### Day 1: Soft Launch
- [ ] **Post to personal Twitter**: "Just shipped Chrome Tamer Pro 🦁"
- [ ] **GitHub README update**: Add badge "Get Pro: $4.99"
- [ ] **Create demo video** (2 mins):
  - Show memory pressure before/after
  - Demonstrate network throttling
  - Show E-Core switching
  - Profile demo (Work → Gaming mode)

### Day 3: Product Hunt
📍 **URL**: https://www.producthunt.com/ship

**Listing:**
- **Title**: Chrome Tamer Pro - OS-Level Browser Optimization
- **Tagline**: Network throttling & CPU core control (impossible for extensions)
- **First comment**: (Draft in GUMROAD_PRODUCT.md)
- **Media**: Upload demo video
- **Maker comment**: Reply to questions, highlight technical moat

### Day 5: Hacker News
📍 **URL**: https://news.ycombinator.com/submit

**Title**: "Show HN: Chrome Tamer – Browser Optimizer with OS-Level Network Control"

**Post body**:
```
I built a browser optimizer that goes beyond what extensions can do.

The problem: Chrome extensions are sandboxed. They can call `chrome.tabs.discard`, but they can't control network bandwidth or CPU affinity.

Chrome Tamer Pro uses native messaging to bridge to macOS `pfctl` + `dummynet` for actual packet-level bandwidth shaping, and `cpu_affinity()` for core isolation.

Free tier: Memory-pressure-aware tab eviction (Chrome Web Store)
Pro tier: Network throttling, E-Core pinning, workspace profiles ($4.99 lifetime)

Tech stack:
- Extension: MV3, TypeScript
- Native: Python + psutil
- macOS: pfctl, dummynet, taskpolicy
- Windows: CPU affinity (network throttling coming in v2.5)

Open source: github.com/21e8-miner/chrome-tamer

Happy to answer questions about the architecture or the moat strategy!
```

### Week 2: Reddit
- [ ] **r/chrome**: "How I reduced Chrome's RAM by 70%"
- [ ] **r/productivity**: "Game-changer for multitaskers"
- [ ] **r/macapps**: "Native macOS network throttling for Chrome"

---

## 📊 Success Metrics (30 Days)

### Chrome Web Store
- **Target installs**: 500 users
- **Active users**: 300 (60% retention)
- **Rating**: 4.5+ stars

### Gumroad Sales
- **Week 1**: 50 sales ($250)
- **Week 2-4**: 20/week ($60/week × 3 = $180)
- **Total Month 1**: ~$430

### Compound Effect
- **Month 2**: 100 sales ($500)
- **Month 3**: 150 sales ($750)
- **Quarter 1 Total**: ~$1,680

---

## 🛠️ Post-Launch Improvements

### v2.5 (February 2026)
- [ ] Windows network throttling (WFP driver)
- [ ] Per-domain bandwidth profiles
- [ ] Slack webhook alerts for Pro users

### v2.6 (March 2026)
- [ ] Enterprise tier ($49/seat/year)
- [ ] Multi-machine sync
- [ ] Team policy management

### v2.7 (Q2 2026)
- [ ] Firefox support
- [ ] Safari extension (if APIs allow)
- [ ] Mobile companion app (stats only)

---

## 🚨 Contingency Plans

### If Chrome Web Store Rejects:
**Most likely reason**: "Functionality unclear" or "Permissions excessive"

**Response**:
1. Add video demo to listing
2. Clarify each permission in description
3. Request specific feedback from reviewer
4. Resubmit within 24 hours

### If Pro Sales Are Slow (<10/week):
1. **Price test**: Try $2.99 for week 1
2. **Feature highlight**: Create GIFs of each Pro feature
3. **Testimonials**: Reach out to early users for quotes
4. **Bundle**: Offer with other 21e8-miner tools

### If Native Host Has Issues:
1. **Fallback mode**: Pro features degrade gracefully
2. **Better docs**: Video tutorial for installation
3. **Auto-installer**: macOS `.pkg` bundle

---

## ✅ TODAY'S ACTION ITEMS

**Priority 1 (30 minutes):**
- [ ] Submit to Chrome Web Store
- [ ] Create Gumroad product
- [ ] Generate first test license key

**Priority 2 (1 hour):**
- [ ] Record 2-minute demo video
- [ ] Write Product Hunt draft
- [ ] Tweet announcement

**Priority 3 (ongoing):**
- [ ] Monitor Chrome Web Store approval
- [ ] Reply to first Gumroad customer
- [ ] Prepare HN post for Day 5

---

**READY TO LAUNCH** ✅

Everything is built. The code is deployed. The store package is ready.

**Your move: Submit to Chrome Web Store NOW** →  https://chrome.google.com/webstore/devconsole
