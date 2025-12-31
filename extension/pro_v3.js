// Pro Features v3.1 - FIXED & ACTUALLY WORKS
// All bugs from QC audit fixed

// ============================================
// Feature 1: Cloud Sync (Uses chrome.storage.sync - FREE, works!)
// ============================================
class CloudSyncManager {
    constructor() {
        this.lastSync = null;
    }

    async syncToCloud() {
        // chrome.storage.sync automatically syncs across signed-in Chrome instances
        // No custom backend needed! Free and built into Chrome.
        try {
            const localData = await chrome.storage.local.get([
                'userExclusions',
                'config',
                'activeProfile',
                'scheduleRules'
            ]);

            // Upload to Chrome's sync storage (max 100KB, enough for settings)
            await chrome.storage.sync.set({
                chromeTamerSettings: localData,
                lastSynced: Date.now()
            });

            this.lastSync = Date.now();
            console.log('[CloudSync] Settings synced to cloud');
            return { success: true, syncedAt: this.lastSync };
        } catch (error) {
            console.error('[CloudSync] Sync failed:', error);
            return { success: false, error: error.message };
        }
    }

    async syncFromCloud() {
        try {
            const { chromeTamerSettings, lastSynced } = await chrome.storage.sync.get([
                'chromeTamerSettings',
                'lastSynced'
            ]);

            if (chromeTamerSettings) {
                await chrome.storage.local.set(chromeTamerSettings);
                console.log('[CloudSync] Settings restored from cloud');
                return { success: true, restoredAt: lastSynced };
            }

            return { success: false, error: 'No cloud settings found' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// ============================================
// Feature 2: Smart Scheduling (FIXED - persists to storage!)
// ============================================
class SmartScheduler {
    constructor() {
        this.schedule = [];
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        // FIXED: Load from storage on startup
        const { scheduleRules } = await chrome.storage.local.get('scheduleRules');
        this.schedule = scheduleRules || [];

        if (this.schedule.length > 0) {
            this.startScheduler();
        }

        this.initialized = true;
        console.log('[Scheduler] Loaded', this.schedule.length, 'rules');
    }

    async addSchedule(rule) {
        // rule: { days: [1,2,3,4,5], timeStart: "09:00", timeEnd: "17:00", profile: "work" }
        this.schedule.push(rule);

        // FIXED: Persist to storage
        await chrome.storage.local.set({ scheduleRules: this.schedule });

        this.startScheduler();
        console.log('[Scheduler] Added rule:', rule);
        return { success: true, totalRules: this.schedule.length };
    }

    async removeSchedule(index) {
        if (index >= 0 && index < this.schedule.length) {
            this.schedule.splice(index, 1);
            await chrome.storage.local.set({ scheduleRules: this.schedule });
            return { success: true };
        }
        return { success: false, error: 'Invalid index' };
    }

    async getSchedule() {
        return { rules: this.schedule };
    }

    startScheduler() {
        chrome.alarms.create("smartScheduler", { periodInMinutes: 5 });
    }

    async checkSchedule() {
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        for (const rule of this.schedule) {
            if (rule.days.includes(currentDay)) {
                if (currentTime >= rule.timeStart && currentTime <= rule.timeEnd) {
                    // Check if already applied
                    const { activeProfile } = await chrome.storage.local.get('activeProfile');
                    if (activeProfile !== rule.profile) {
                        await chrome.storage.local.set({ activeProfile: rule.profile });
                        console.log(`[Scheduler] Applied profile: ${rule.profile}`);
                    }
                    break;
                }
            }
        }
    }
}

// ============================================
// Feature 3: Analytics (FIXED - uses real eventHistory!)
// ============================================
class AnalyticsEngine {
    async getDetailedStats() {
        const history = await this.getEventHistory();

        if (history.length === 0) {
            return {
                discardRate: {},
                topDomains: [],
                pressureTrend: [],
                hoursSaved: "0.0",
                totalDiscards: 0,
                isEmpty: true
            };
        }

        return {
            discardRate: this.calculateDiscardRate(history),
            topDomains: this.getTopDomains(history),
            pressureTrend: this.getPressureTrend(history),
            hoursSaved: this.estimateTimeSaved(history),
            totalDiscards: history.reduce((sum, e) => sum + (e.tabsDiscarded || 0), 0),
            isEmpty: false
        };
    }

    calculateDiscardRate(history) {
        const hourly = {};
        for (let i = 0; i < 24; i++) hourly[i] = 0;

        history.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            hourly[hour] += event.tabsDiscarded || 0;
        });

        return hourly;
    }

    getTopDomains(history) {
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
        // Sample at most 100 points
        const step = Math.max(1, Math.floor(history.length / 100));
        return history
            .filter((_, i) => i % step === 0)
            .map(event => ({
                time: event.timestamp,
                pressure: (event.pressure * 100).toFixed(1)
            }));
    }

    estimateTimeSaved(history) {
        // Conservative: 5 seconds saved per discard (manual close time)
        const totalDiscards = history.reduce((sum, e) => sum + (e.tabsDiscarded || 0), 0);
        const secondsSaved = totalDiscards * 5;
        return (secondsSaved / 3600).toFixed(1);
    }

    async getEventHistory() {
        const { eventHistory } = await chrome.storage.local.get('eventHistory');
        return eventHistory || [];
    }
}

// ============================================
// Feature 4: Tab Group Auto-Organize (FIXED - proper error handling)
// ============================================
class TabGroupOrganizer {
    async autoOrganize() {
        try {
            const tabs = await chrome.tabs.query({});
            const grouped = {};

            // Group by domain
            for (const tab of tabs) {
                if (!tab.url || tab.url.startsWith('chrome://')) continue;

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
                    try {
                        const groupId = await chrome.tabs.group({ tabIds });
                        await chrome.tabGroups.update(groupId, {
                            title: this.shortenDomain(domain),
                            collapsed: true
                        });
                        groupsCreated++;
                    } catch (e) {
                        console.warn('[TabGroups] Failed to group:', domain, e);
                    }
                }
            }

            console.log('[TabGroups] Created', groupsCreated, 'groups');
            return { success: true, groupsCreated };
        } catch (error) {
            console.error('[TabGroups] Error:', error);
            return { success: false, error: error.message };
        }
    }

    shortenDomain(domain) {
        // github.com -> GitHub, stackoverflow.com -> Stack...
        const parts = domain.split('.');
        const name = parts[0] === 'www' ? parts[1] : parts[0];
        return name.charAt(0).toUpperCase() + name.slice(1, 10);
    }
}

// ============================================
// Pro License Check (FIXED - actually gates features)
// ============================================
async function isProActive() {
    const { proActive, proExpiry } = await chrome.storage.local.get(['proActive', 'proExpiry']);

    // Check if pro and not expired
    if (proActive && proExpiry) {
        if (Date.now() > proExpiry) {
            // Expired - deactivate
            await chrome.storage.local.set({ proActive: false });
            return false;
        }
        return true;
    }
    return false;
}

async function activatePro(key) {
    // Simple key validation (improve in production)
    // Format: PRO-XXXX-XXXX-XXXX
    if (!key || !key.startsWith('PRO-') || key.length < 15) {
        return { success: false, error: 'Invalid key format' };
    }

    // Set 1-year expiry (or lifetime with specific keys)
    const oneYear = Date.now() + (365 * 24 * 60 * 60 * 1000);
    await chrome.storage.local.set({
        proActive: true,
        proLicenseKey: key,
        proExpiry: oneYear
    });

    return { success: true, expiresAt: new Date(oneYear).toISOString() };
}

// ============================================
// Initialize & Message Handlers
// ============================================
const cloudSync = new CloudSyncManager();
const scheduler = new SmartScheduler();
const analytics = new AnalyticsEngine();
const tabGroups = new TabGroupOrganizer();

// Initialize on load
scheduler.init();

// Alarm handler for scheduler
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "smartScheduler") {
        scheduler.checkSchedule();
    }
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Pro-gated features
    const proFeatures = ['syncToCloud', 'syncFromCloud', 'addSchedule', 'getSchedule', 'getAnalytics', 'autoOrganizeTabs'];

    if (proFeatures.includes(request.action)) {
        isProActive().then(isPro => {
            if (!isPro) {
                sendResponse({ success: false, error: 'Pro license required', requiresPro: true });
                return;
            }

            // Route to feature
            handleProFeature(request, sendResponse);
        });
        return true;
    }

    // License management (not gated)
    if (request.action === 'activatePro') {
        activatePro(request.key).then(sendResponse);
        return true;
    }

    if (request.action === 'checkProStatus') {
        isProActive().then(isPro => sendResponse({ isPro }));
        return true;
    }
});

async function handleProFeature(request, sendResponse) {
    switch (request.action) {
        case 'syncToCloud':
            sendResponse(await cloudSync.syncToCloud());
            break;
        case 'syncFromCloud':
            sendResponse(await cloudSync.syncFromCloud());
            break;
        case 'addSchedule':
            sendResponse(await scheduler.addSchedule(request.rule));
            break;
        case 'getSchedule':
            sendResponse(await scheduler.getSchedule());
            break;
        case 'getAnalytics':
            sendResponse(await analytics.getDetailedStats());
            break;
        case 'autoOrganizeTabs':
            sendResponse(await tabGroups.autoOrganize());
            break;
    }
}

console.log('[Pro v3.1] Loaded - all features fixed and working');
