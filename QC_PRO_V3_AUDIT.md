# 🔍 QC Audit - Pro v3.0 Features

**Date**: December 30, 2025 20:54  
**Status**: 🔴 CRITICAL ISSUES FOUND

---

## 🚨 CRITICAL ISSUE #1: Missing Permissions

**Problem**: `pro_v3.js` uses APIs not in `manifest.json`:

```javascript
// pro_v3.js line 23:
chrome.identity.getAuthToken({ interactive: true }, ...);
```

**Required permission**: `"identity"` 
**Current manifest**: ❌ MISSING

```javascript
// pro_v3.js line 215-216:
const groupId = await chrome.tabs.group({ tabIds });
await chrome.tabGroups.update(groupId, ...);
```

**Required permission**: `"tabGroups"`  
**Current manifest**: ❌ MISSING

**Impact**: Features will CRASH at runtime.

---

## 🚨 CRITICAL ISSUE #2: Backend Doesn't Exist

**Problem**: Cloud sync hits `https://api.chrometamer.com/sync`

```javascript
// pro_v3.js line 41:
const response = await fetch('https://api.chrometamer.com/sync', ...);
```

**Reality**: 
- ❌ No domain `api.chrometamer.com` exists
- ❌ No Firebase/backend has been set up
- ❌ This will return `fetch failed` error

**Impact**: Cloud Sync feature is **BROKEN until backend exists**

---

## 🚨 CRITICAL ISSUE #3: Scheduler Persistence Missing

**Problem**: Schedule rules are stored in-memory only:

```javascript
// pro_v3.js line 79-81:
class SmartScheduler {
    constructor() {
        this.schedule = []; // In-memory!
    }
}
```

**Reality**:
- Service workers go idle and restart
- On restart, `this.schedule = []` - all rules are LOST
- Users would have to re-add schedules every browser restart

**Impact**: Smart Scheduling is **BROKEN** (doesn't persist)

---

## 🚨 CRITICAL ISSUE #4: Analytics Has No Data Source

**Problem**: Analytics reads from `eventHistory` that doesn't exist:

```javascript
// pro_v3.js line 184:
const { eventHistory } = await chrome.storage.local.get('eventHistory');
```

**Reality**:
- ❌ `background.js` never writes to `eventHistory`
- ❌ Analytics will show empty data
- ❌ "Time saved" will always be 0

**Impact**: Analytics dashboard is **USELESS** (no data)

---

## 🚨 CRITICAL ISSUE #5: License Secret is Exposed

**Problem**:

```javascript
// pro_v3.js line 270:
const PRO_SECRET = 'REPLACE_WITH_REAL_SECRET';
```

**Reality**:
- Extensions are unminified and inspectable
- Anyone can extract the secret from the JS
- Offline license validation = trivially crackable

**Impact**: License system provides **ZERO security**

---

## ⚠️ MINOR ISSUES

### Issue #6: Tab Group API Check is Wrong

```javascript
// pro_v3.js line 192:
if (!chrome.tabGroups) {
```

**Problem**: `chrome.tabGroups` exists but requires permission  
**Should be**: Try-catch around the actual call

### Issue #7: No Pro Gate

**Problem**: All features are exposed even without Pro license  
**Should be**: Check `proActive` before executing features

---

## 🛠️ FIXES REQUIRED

### Fix 1: Add Missing Permissions to Manifest

```json
{
    "permissions": [
        "tabs",
        "storage", 
        "alarms",
        "system.memory",
        "identity",      // ADD
        "tabGroups"      // ADD
    ],
    "oauth2": {
        "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
        "scopes": ["email", "profile"]
    }
}
```

### Fix 2: Persist Schedule to Storage

```javascript
async addSchedule(rule) {
    this.schedule.push(rule);
    // PERSIST to storage
    await chrome.storage.local.set({ scheduleRules: this.schedule });
    this.startScheduler();
}

async loadSchedule() {
    const { scheduleRules } = await chrome.storage.local.get('scheduleRules');
    this.schedule = scheduleRules || [];
}
```

### Fix 3: Log Events in Background.js

```javascript
// Add to background.js after discarding a tab:
async function logEvent(tabsDiscarded, domains, pressure) {
    const { eventHistory } = await chrome.storage.local.get('eventHistory');
    const history = eventHistory || [];
    
    history.push({
        timestamp: Date.now(),
        tabsDiscarded,
        domains,
        pressure
    });
    
    // Keep only last 30 days
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filtered = history.filter(e => e.timestamp > cutoff);
    
    await chrome.storage.local.set({ eventHistory: filtered });
}
```

### Fix 4: Remove Cloud Sync Until Backend Exists

```javascript
// Either:
// A) Set up Firebase/backend (takes 4-8 hours)
// B) Remove feature from Pro tier (honest approach)
// C) Use chrome.storage.sync instead of custom backend
```

**Recommendation**: Use `chrome.storage.sync` (built-in, free, works)

```javascript
async uploadSettings() {
    const data = await chrome.storage.local.get(['userExclusions', 'config', 'activeProfile']);
    // chrome.storage.sync automatically syncs across devices!
    await chrome.storage.sync.set(data);
    return { success: true };
}
```

### Fix 5: Add Pro License Check

```javascript
async function isProActive() {
    const { proActive } = await chrome.storage.local.get('proActive');
    return proActive === true;
}

// Before any Pro feature:
if (!await isProActive()) {
    return { success: false, error: 'Pro license required' };
}
```

---

## 📊 WHAT ACTUALLY WORKS RIGHT NOW

| Feature | Works? | Why Not? |
|---------|--------|----------|
| Cloud Sync | ❌ | No backend, missing permission |
| Smart Scheduling | ❌ | Doesn't persist, loses rules |
| Analytics | ❌ | No data source |
| Tab Group Organize | ⚠️ | Missing permission, otherwise works |
| License Validation | ⚠️ | Works but trivially crackable |

**Honest status**: Pro v3.0 is **NOT shippable** in current state.

---

## ✅ WHAT TO BUILD (Revised)

### Phase 1: Ship Free Tier ONLY (Day 1)
- Remove all broken Pro features from package
- Submit working free tier to Chrome Web Store
- Get approved, gather 1000+ users

### Phase 2: Fix Tab Group Organize (Day 2)
- Add `tabGroups` permission to manifest
- Test feature works
- This is the easiest/highest-value fix

### Phase 3: Fix Smart Scheduling (Day 3)
- Add persistence to storage
- Add load-on-startup
- Test survives browser restart

### Phase 4: Fix Analytics (Day 4)
- Add event logging to background.js
- Test data accumulates
- Build simple dashboard UI

### Phase 5: Fix Cloud Sync (Day 5-7)
- OPTION A: Use `chrome.storage.sync` (free, 5 min to implement)
- OPTION B: Set up Firebase (8 hours, more control)
- Add `identity` permission + OAuth config

### Phase 6: Launch Pro Tier (Week 2)
- All features tested and working
- Stripe integration for $2.99/month
- Launch to existing free user base

---

## 🏆 VERDICT

**Is Pro v3.0 ready to ship?**  
❌ **NO** - Multiple critical bugs would crash at runtime

**What's the honest timeline?**  
- 1 week to fix all features properly
- 1 more week to test and polish
- **2 weeks to real Pro launch**

**What should you do TODAY?**  
1. Ship FREE tier only (it works)
2. Fix Pro features one by one
3. Launch Pro when it actually works
