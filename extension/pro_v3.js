// Pro Features v3.0 - Actually Worth Paying For
// Zero native host needed - all features work in-extension

// Feature 1: Cloud Sync (Cross-Device Settings/Profiles)
// Uses chrome.identity + Firebase for backend

const PRO_FEATURES = {
    cloudSync: true,
    smartScheduling: true,
    advancedAnalytics: true,
    teamPolicies: false, // Enterprise only
};

class CloudSyncManager {
    constructor() {
        this.syncEnabled = false;
        this.lastSync = null;
    }

    async enableSync() {
        // Use chrome.identity.getAuthToken for Google OAuth
        return new Promise((resolve) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError || !token) {
                    resolve({ success: false, error: 'Auth failed' });
                    return;
                }

                this.syncEnabled = true;
                this.uploadSettings(token).then(resolve);
            });
        });
    }

    async uploadSettings(token) {
        // Get current settings
        const data = await chrome.storage.local.get(['userExclusions', 'config', 'activeProfile']);

        // Upload to Firebase/backend
        try {
            const response = await fetch('https://api.chrometamer.com/sync', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.lastSync = Date.now();
                return { success: true, syncedAt: this.lastSync };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async downloadSettings(token) {
        try {
            const response = await fetch('https://api.chrometamer.com/sync', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                await chrome.storage.local.set(data);
                return { success: true, data };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Feature 2: Smart Scheduling (Automatic Profile Switching)
class SmartScheduler {
    constructor() {
        this.schedule = [];
    }

    addSchedule(rule) {
        // rule: { days: [1,2,3,4,5], timeStart: "09:00", timeEnd: "17:00", profile: "work" }
        this.schedule.push(rule);
        this.startScheduler();
    }

    startScheduler() {
        // Check every 5 minutes
        chrome.alarms.create("smartScheduler", { periodInMinutes: 5 });

        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === "smartScheduler") {
                this.checkSchedule();
            }
        });
    }

    async checkSchedule() {
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        for (const rule of this.schedule) {
            if (rule.days.includes(currentDay)) {
                if (currentTime >= rule.timeStart && currentTime <= rule.timeEnd) {
                    // Apply profile
                    await chrome.runtime.sendMessage({
                        action: 'applyProfile',
                        profileId: rule.profile
                    });
                    console.log(`[Scheduler] Applied ${rule.profile} profile`);
                    break;
                }
            }
        }
    }
}

// Feature 3: Advanced Analytics (No Fake Data!)
class AnalyticsEngine {
    async getDetailedStats() {
        // Get REAL metrics we can actually measure
        const history = await this.getEventHistory();

        return {
            // Real metric: tabs per hour (we track this)
            discardRate: this.calculateDiscardRate(history),

            // Real metric: most discarded domains (we know this)
            topDomains: this.getTopDomains(history),

            // Real metric: pressure over time (from Chrome API)
            pressureTrend: this.getPressureTrend(history),

            // Real metric: hours saved (estimated conservatively)
            hoursSaved: this.estimateTimeSaved(history),
        };
    }

    calculateDiscardRate(history) {
        // Group by hour and count
        const hourly = {};
        history.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            hourly[hour] = (hourly[hour] || 0) + event.tabsDiscarded;
        });

        return hourly;
    }

    getTopDomains(history) {
        // Count actual domains discarded
        const counts = {};
        history.forEach(event => {
            (event.domains || []).forEach(domain => {
                counts[domain] = (counts[domain] || 0) + 1;
            });
        });

        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([domain, count]) => ({ domain, count }));
    }

    getPressureTrend(history) {
        // Show actual pressure readings over time
        return history.map(event => ({
            time: event.timestamp,
            pressure: event.pressure
        }));
    }

    estimateTimeSaved(history) {
        // Conservative estimate: each discard saves 5 seconds of manual work
        const totalDiscards = history.reduce((sum, e) => sum + (e.tabsDiscarded || 0), 0);
        const secondsSaved = totalDiscards * 5;
        return (secondsSaved / 3600).toFixed(1); // Hours
    }

    async getEventHistory() {
        const { eventHistory } = await chrome.storage.local.get('eventHistory');
        return eventHistory || [];
    }
}

// Feature 4: Tab Group Auto-Organization (Pro Only)
class TabGroupOrganizer {
    async autoOrganize() {
        if (!chrome.tabGroups) {
            console.warn('[TabGroups] API not available');
            return { success: false, error: 'API unavailable' };
        }

        const tabs = await chrome.tabs.query({});
        const grouped = {};

        // Group by domain
        for (const tab of tabs) {
            if (!tab.url) continue;

            try {
                const domain = new URL(tab.url).hostname;
                if (!grouped[domain]) grouped[domain] = [];
                grouped[domain].push(tab.id);
            } catch (e) { }
        }

        // Create groups for domains with 3+ tabs
        let groupsCreated = 0;
        for (const [domain, tabIds] of Object.entries(grouped)) {
            if (tabIds.length >= 3) {
                const groupId = await chrome.tabs.group({ tabIds });
                await chrome.tabGroups.update(groupId, {
                    title: domain,
                    collapsed: true
                });
                groupsCreated++;
            }
        }

        return { success: true, groupsCreated };
    }
}

// Pro License Validation (Offline, No Phone-Home)
class ProLicenseManager {
    validateKey(key) {
        // Format: PRO-{uid}-{expiry}-{signature}
        // Uses HMAC with pre-shared secret for offline validation

        try {
            const parts = key.split('-');
            if (parts.length !== 4 || parts[0] !== 'PRO') return false;

            const [, uid, expiry, signature] = parts;

            // Check expiry
            const expiryDate = parseInt(expiry, 16);
            if (Date.now() > expiryDate) return false;

            // Verify signature (simplified - use crypto.subtle in production)
            const expectedSig = this.generateSignature(uid, expiry);
            return signature === expectedSig;
        } catch {
            return false;
        }
    }

    generateSignature(uid, expiry) {
        // In production: Use crypto.subtle.sign with EC key
        // For now: Simple hash (replace with real crypto)
        const data = `${uid}${expiry}${PRO_SECRET}`;
        return this.simpleHash(data).substring(0, 8);
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }
}

// Initialize Pro Features
const PRO_SECRET = 'REPLACE_WITH_REAL_SECRET';
const cloudSync = new CloudSyncManager();
const scheduler = new SmartScheduler();
const analytics = new AnalyticsEngine();
const tabGroups = new TabGroupOrganizer();
const licenseManager = new ProLicenseManager();

// Message Handler for Pro Features
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'enableCloudSync') {
        cloudSync.enableSync().then(sendResponse);
        return true;
    }

    if (request.action === 'addSchedule') {
        scheduler.addSchedule(request.rule);
        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'getAnalytics') {
        analytics.getDetailedStats().then(sendResponse);
        return true;
    }

    if (request.action === 'autoOrganizeTabs') {
        tabGroups.autoOrganize().then(sendResponse);
        return true;
    }

    if (request.action === 'validateProKey') {
        const valid = licenseManager.validateKey(request.key);
        if (valid) {
            chrome.storage.local.set({ proLicenseKey: request.key, proActive: true });
        }
        sendResponse({ success: valid });
        return true;
    }
});

// Export for testing
if (typeof module !== 'undefined') {
    module.exports = {
        CloudSyncManager,
        SmartScheduler,
        AnalyticsEngine,
        TabGroupOrganizer,
        ProLicenseManager
    };
}
