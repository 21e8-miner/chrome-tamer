// Chrome Tamer Pro - Unified Background Service Worker
// All handlers consolidated to prevent conflicts

// ============================================
// IMPORTS (load all modules)
// ============================================
try {
    importScripts('core_engine.js');
    console.log('[Background] Core engine loaded');
} catch (e) {
    console.warn('[Background] Core engine failed:', e);
}

// ============================================
// CONFIGURATION
// ============================================
const DEFAULT_CONFIG = {
    baseCost: 10,
    competitionFactor: 5,
    benefitDecay: 150,
    pressureWeight: 2.0,
    criticalPressure: 0.90, // Aggressive pruning above this
    warningPressure: 0.70,  // Start pruning above this
    protectedDomains: ["youtube.com", "music.apple.com", "spotify.com", "meet.google.com", "localhost", "github.com", "docs.google.com", "sheets.google.com"]
};

let currentConfig = { ...DEFAULT_CONFIG };
let lastPressureValue = 0;

// ============================================
// INITIALIZATION
// ============================================
chrome.runtime.onInstalled.addListener(async () => {
    const data = await chrome.storage.local.get(["systemStats", "userExclusions", "config"]);

    await chrome.storage.local.set({
        systemStats: data.systemStats || { deallocated: 0 },
        userExclusions: data.userExclusions || [],
        config: data.config || DEFAULT_CONFIG
    });

    if (data.config) {
        currentConfig = { ...currentConfig, ...data.config };
    }

    // Setup alarms
    chrome.alarms.create("memoryPressureCycle", { periodInMinutes: 1 });
    chrome.alarms.create("autoSaveSession", { periodInMinutes: 30 });
    chrome.alarms.create("checkSnooze", { periodInMinutes: 1 });

    console.log("[Background] Initialized with config:", currentConfig);
});

// ============================================
// SINGLE UNIFIED ALARM HANDLER
// ============================================
chrome.alarms.onAlarm.addListener(async (alarm) => {
    switch (alarm.name) {
        case "memoryPressureCycle":
            await pruneByMemoryPressure();
            break;
        case "smartScheduler":
            if (typeof scheduler !== 'undefined') {
                await scheduler.checkSchedule();
            }
            break;
        case "autoSaveSession":
            if (typeof sessionManager !== 'undefined') {
                await sessionManager.autoSave();
            }
            break;
        case "checkSnooze":
            if (typeof tabSnooze !== 'undefined') {
                await tabSnooze.checkSnoozeAlarms();
            }
            break;
        case "focusEnd":
            if (typeof focusBlocker !== 'undefined') {
                await focusBlocker.endFocus();
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Focus Mode Ended',
                    message: 'Great work! Your focus session has ended.'
                });
            }
            break;
        default:
            if (alarm.name.startsWith('snooze-')) {
                if (typeof tabSnooze !== 'undefined') {
                    await tabSnooze.checkSnoozeAlarms();
                }
            }
    }
});

// ============================================
// MEMORY PRESSURE FUNCTIONS
// ============================================
function getMemoryPressure() {
    return new Promise((resolve) => {
        if (!chrome.system || !chrome.system.memory) {
            resolve(0.5);
            return;
        }
        chrome.system.memory.getInfo((info) => {
            const pressure = (info.capacity - info.availableCapacity) / info.capacity;
            resolve(pressure);
        });
    });
}

async function pruneByMemoryPressure() {
    const rawPressure = await getMemoryPressure();

    // SMOOTHED PRESSURE (EMA)
    // We update this globally once per cycle to avoid jitter in utility calculations.
    lastPressureValue = (lastPressureValue * 0.4) + (rawPressure * 0.6);
    const pressure = lastPressureValue;

    // Check if we even need to prune
    if (pressure < currentConfig.warningPressure) {
        console.log(`[Skip] Memory pressure acceptable (${(pressure * 100).toFixed(1)}%)`);
        await chrome.storage.local.set({ lastPressure: pressure, lastPruned: 0 });
        return;
    }

    console.log(`[Prune] Memory pressure elevated (${(pressure * 100).toFixed(1)}%), starting equilibrium search...`);

    const tabs = await chrome.tabs.query({ active: false, discarded: false, audible: false, pinned: false });
    const { userExclusions } = await chrome.storage.local.get("userExclusions");

    const domainCounts = {};
    tabs.forEach(t => {
        try {
            if (t.url) {
                const domain = new URL(t.url).hostname;
                domainCounts[domain] = (domainCounts[domain] || 0) + 1;
            }
        } catch (e) { }
    });

    // Sort tabs by utility (lowest first) to discard the least valuable ones first
    const scoredTabs = tabs.map(tab => {
        const { score, reason } = calculateTabUtility(tab, domainCounts, pressure);
        return { tab, score, reason };
    }).sort((a, b) => a.score - b.score);

    let prunedCount = 0;
    for (const { tab, score, reason } of scoredTabs) {
        if (!tab.url || isProtected(tab.url, userExclusions)) continue;

        // If score is negative, it's a dominated strategy in the resource game
        if (score < 0) {
            console.log(`[Discard] ${tab.title} (Score: ${score.toFixed(2)}, Reason: ${reason})`);
            await deallocateResource(tab);
            prunedCount++;

            // Re-check pressure after some discards to see if we reached equilibrium
            if (prunedCount % 3 === 0) {
                const currentPressure = await getMemoryPressure();
                if (currentPressure < currentConfig.warningPressure) {
                    console.log(`[Equilibrium] Resource equilibrium achieved after ${prunedCount} discards.`);
                    break;
                }
            }
        }
    }

    await chrome.storage.local.set({ lastPressure: pressure, lastPruned: prunedCount });
}

function isProtected(url, userExclusions = []) {
    const allProtected = [...currentConfig.protectedDomains, ...userExclusions];
    try {
        const domain = new URL(url).hostname;
        return allProtected.some(p => domain.includes(p) || p.includes(domain));
    } catch {
        return true;
    }
}

function calculateTabUtility(tab, domainCounts, pressure) {
    // 1. INDIVIDUAL BENEFIT (B)
    // Benefit decays as time since last interaction increases.
    const idleTimeMinutes = (Date.now() - (tab.lastAccessed || Date.now())) / 1000 / 60;
    const decay = currentConfig.benefitDecay;
    let benefit = decay / (Math.max(0.1, idleTimeMinutes) + 1);

    // 1b. INFO-THEORETIC WEIGHTING
    // Add weights from entropy (uniqueness) and Markov predictor (future need)
    if (typeof entropyScorer !== 'undefined') {
        const info = entropyScorer.calculateImportance(tab);
        benefit *= (1 + (info.surprise || 0) * 0.2); // Surprise tabs get a "rarity bonus"
    }

    // 2. RESOURCE SCARCITY PRICING
    // The "Social Cost" factor. As RAM pressure (P) increases, the cost of occupancy
    // escalates non-linearly to force higher-utility activities to the top.
    const P = lastPressureValue;

    // 3. DYNAMIC SOCIAL COST (C)
    let domain = "";
    try { domain = new URL(tab.url).hostname; } catch (e) { }

    const redundancy = domainCounts[domain] || 1;

    // Base cost escalates exponentially as we hit RAM limits (Pricing Scarcity)
    // Formula: C_base * e^(k * P) where k=3 simulations hyper-inflation of resource value
    const dynamicBaseCost = currentConfig.baseCost * Math.exp(3.0 * P);

    // Redundancy penalty scales non-linearly when memory is tight
    const adaptiveCompetitionFactor = currentConfig.competitionFactor * (1 + P * 3);
    const competitionCost = adaptiveCompetitionFactor * Math.pow(redundancy - 1, 2);

    // Direct pressure penalty (cubic)
    const pressurePenalty = Math.pow(P, 3) * currentConfig.pressureWeight * 100;

    const totalCost = dynamicBaseCost + competitionCost + pressurePenalty;
    const score = benefit - totalCost;

    // Pruning Reason Selection
    let reason = "Equilibrium";
    if (redundancy > 1 && (competitionCost > dynamicBaseCost)) reason = "Redundancy Externalities";
    if (pressurePenalty > competitionCost && pressurePenalty > dynamicBaseCost) reason = "System Pressure Gate";
    if (idleTimeMinutes > 180) reason = "Information Decay";
    if (score < -50) reason = "Dominated Strategy";

    return { score, reason };
}

async function deallocateResource(tab) {
    try {
        await chrome.tabs.discard(tab.id);

        let domain = '';
        try { domain = new URL(tab.url).hostname; } catch (e) { }

        const data = await chrome.storage.local.get("systemStats");
        const stats = data.systemStats || { deallocated: 0 };
        await chrome.storage.local.set({
            systemStats: { deallocated: stats.deallocated + 1 }
        });

        await logEvent(1, [domain]);
    } catch (err) {
        console.warn(`Failed to discard tab ${tab.id}:`, err);
    }
}

async function logEvent(tabsDiscarded, domains) {
    const { eventHistory, lastPressure } = await chrome.storage.local.get(['eventHistory', 'lastPressure']);
    const history = eventHistory || [];

    history.push({
        timestamp: Date.now(),
        tabsDiscarded,
        domains: domains.filter(d => d),
        pressure: lastPressure || 0
    });

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filtered = history.filter(e => e.timestamp > thirtyDaysAgo);

    await chrome.storage.local.set({ eventHistory: filtered });
}

// ============================================
// SINGLE UNIFIED MESSAGE HANDLER
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true; // Keep channel open for async
});

async function handleMessage(request, sender, sendResponse) {
    const { action } = request;

    try {
        // Core tab management
        if (action === "hyperfocus") {
            const count = await executeHyperfocus();
            sendResponse({ count });
            return;
        }

        if (action === "toggleExclusion") {
            const status = await addExclusion(request.domain);
            sendResponse(status);
            return;
        }

        if (action === "getLiveScores") {
            const data = await calculateAllScores();
            sendResponse(data);
            return;
        }

        // Memory profiling (from core_engine.js)
        if (action === "profileMemory") {
            if (typeof memoryProfiler !== 'undefined') {
                const profiles = await memoryProfiler.profileAllTabs();
                sendResponse(profiles);
            } else {
                sendResponse({ error: 'Profiler not loaded' });
            }
            return;
        }

        if (action === "getTabImportance") {
            if (typeof entropyScorer !== 'undefined') {
                const tab = await chrome.tabs.get(request.tabId);
                sendResponse(entropyScorer.calculateImportance(tab));
            } else {
                sendResponse({ error: 'Scorer not loaded' });
            }
            return;
        }

        if (action === "predictNext") {
            if (typeof tabPredictor !== 'undefined') {
                const predictions = await tabPredictor.getPredictedNeededTabs();
                sendResponse(predictions);
            } else {
                sendResponse([]);
            }
            return;
        }

        if (action === "getTabClusters") {
            if (typeof tabGraph !== 'undefined') {
                await tabGraph.buildGraph();
                sendResponse({ clusters: tabGraph.findClusters() });
            } else {
                sendResponse({ clusters: [] });
            }
            return;
        }

        if (action === "getAccessEntropy") {
            if (typeof entropyScorer !== 'undefined') {
                sendResponse({ entropy: entropyScorer.calculateAccessEntropy() });
            } else {
                sendResponse({ entropy: 0 });
            }
            return;
        }

        // Pro features
        if (action === "checkProStatus") {
            const { proActive } = await chrome.storage.local.get('proActive');
            sendResponse({ isPro: proActive === true });
            return;
        }

        if (action === "activatePro") {
            const key = request.key;
            if (!key || !key.startsWith('PRO-') || key.length < 15) {
                sendResponse({ success: false, error: 'Invalid key' });
                return;
            }
            const oneYear = Date.now() + (365 * 24 * 60 * 60 * 1000);
            await chrome.storage.local.set({ proActive: true, proLicenseKey: key, proExpiry: oneYear });
            sendResponse({ success: true });
            return;
        }

        // Cloud sync
        if (action === "syncToCloud") {
            const localData = await chrome.storage.local.get(['userExclusions', 'config', 'activeProfile']);
            await chrome.storage.sync.set({ chromeTamerSettings: localData, lastSynced: Date.now() });
            sendResponse({ success: true });
            return;
        }

        if (action === "syncFromCloud") {
            const { chromeTamerSettings } = await chrome.storage.sync.get('chromeTamerSettings');
            if (chromeTamerSettings) {
                await chrome.storage.local.set(chromeTamerSettings);
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'No cloud data' });
            }
            return;
        }

        // Tab operations
        if (action === "snoozeTab") {
            if (typeof tabSnooze !== 'undefined') {
                const result = await tabSnooze.snoozeTab(request.tabId, request.reopenAt);
                sendResponse(result);
            } else {
                sendResponse({ success: false });
            }
            return;
        }

        if (action === "searchTabs") {
            if (typeof tabSearch !== 'undefined') {
                const results = await tabSearch.search(request.query);
                sendResponse(results);
            } else {
                sendResponse({ results: [] });
            }
            return;
        }

        if (action === "saveSession") {
            if (typeof sessionManager !== 'undefined') {
                const result = await sessionManager.saveSession(request.name);
                sendResponse(result);
            } else {
                sendResponse({ success: false });
            }
            return;
        }

        if (action === "restoreSession") {
            if (typeof sessionManager !== 'undefined') {
                const result = await sessionManager.restoreSession(request.index);
                sendResponse(result);
            } else {
                sendResponse({ success: false });
            }
            return;
        }

        if (action === "listSessions") {
            if (typeof sessionManager !== 'undefined') {
                const sessions = await sessionManager.listSessions();
                sendResponse(sessions);
            } else {
                sendResponse([]);
            }
            return;
        }

        if (action === "startFocus") {
            if (typeof focusBlocker !== 'undefined') {
                const result = await focusBlocker.startFocus(request.minutes, request.blockedDomains);
                sendResponse(result);
            } else {
                sendResponse({ success: false });
            }
            return;
        }

        if (action === "endFocus") {
            if (typeof focusBlocker !== 'undefined') {
                const result = await focusBlocker.endFocus();
                sendResponse(result);
            } else {
                sendResponse({ success: false });
            }
            return;
        }

        if (action === "getFocusStatus") {
            if (typeof focusBlocker !== 'undefined') {
                const status = await focusBlocker.getStatus();
                sendResponse(status);
            } else {
                sendResponse({ active: false });
            }
            return;
        }

        if (action === "findDuplicates") {
            if (typeof duplicateKiller !== 'undefined') {
                const result = await duplicateKiller.findDuplicates();
                sendResponse(result);
            } else {
                sendResponse({ duplicates: [], count: 0 });
            }
            return;
        }

        if (action === "killDuplicates") {
            if (typeof duplicateKiller !== 'undefined') {
                const result = await duplicateKiller.killDuplicates();
                sendResponse(result);
            } else {
                sendResponse({ success: false, killed: 0 });
            }
            return;
        }

        if (action === "autoOrganizeTabs") {
            const tabs = await chrome.tabs.query({});
            const grouped = {};

            for (const tab of tabs) {
                if (!tab.url || tab.url.startsWith('chrome://')) continue;
                try {
                    const domain = new URL(tab.url).hostname;
                    if (!grouped[domain]) grouped[domain] = [];
                    grouped[domain].push(tab.id);
                } catch { }
            }

            let groupsCreated = 0;
            for (const [domain, tabIds] of Object.entries(grouped)) {
                if (tabIds.length >= 3) {
                    try {
                        const groupId = await chrome.tabs.group({ tabIds });
                        const name = domain.split('.')[0];
                        await chrome.tabGroups.update(groupId, {
                            title: name.charAt(0).toUpperCase() + name.slice(1, 8),
                            collapsed: true
                        });
                        groupsCreated++;
                    } catch { }
                }
            }

            sendResponse({ success: true, groupsCreated });
            return;
        }

        // Default
        sendResponse({ error: 'Unknown action: ' + action });

    } catch (error) {
        console.error('[Message Handler Error]', action, error);
        sendResponse({ error: error.message });
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
async function executeHyperfocus() {
    const tabs = await chrome.tabs.query({ active: false, discarded: false, pinned: false, audible: false });
    let closedCount = 0;

    for (const tab of tabs) {
        if (!tab.url || tab.url.startsWith('chrome://')) continue;
        try {
            await chrome.tabs.discard(tab.id);
            closedCount++;
        } catch { }
    }

    return closedCount;
}

async function addExclusion(domain) {
    const { userExclusions } = await chrome.storage.local.get("userExclusions");
    const exclusions = userExclusions || [];

    if (!exclusions.includes(domain)) {
        exclusions.push(domain);
        await chrome.storage.local.set({ userExclusions: exclusions });
    }

    return { success: true, exclusions };
}

async function calculateAllScores() {
    const pressure = await getMemoryPressure();
    const tabs = await chrome.tabs.query({ active: false, discarded: false });
    const { userExclusions } = await chrome.storage.local.get("userExclusions");

    const domainCounts = {};
    tabs.forEach(t => {
        try {
            if (t.url) {
                const domain = new URL(t.url).hostname;
                domainCounts[domain] = (domainCounts[domain] || 0) + 1;
            }
        } catch { }
    });

    const scores = tabs
        .filter(t => t.url && !isProtected(t.url, userExclusions))
        .map(tab => {
            const { score, reason } = calculateTabUtility(tab, domainCounts, pressure);
            return {
                tabId: tab.id,
                title: tab.title,
                url: tab.url,
                score,
                reason
            };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 15);

    return { pressure, scores };
}

// ============================================
// TAB ACTIVATION TRACKING (for predictions)
// ============================================
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url && typeof entropyScorer !== 'undefined') {
            entropyScorer.recordAccess(activeInfo.tabId, tab.url);
        }
        if (tab.url && typeof tabPredictor !== 'undefined') {
            const lastUrl = tabPredictor.lastDomain ? `https://${tabPredictor.lastDomain}` : null;
            tabPredictor.recordTransition(lastUrl, tab.url);
        }
    } catch { }
});

// ============================================
// FOCUS MODE NAVIGATION BLOCKING
// ============================================
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url && typeof focusBlocker !== 'undefined') {
        await focusBlocker.checkAndBlock(tabId, changeInfo.url);
    }
});

console.log('[Background] Unified service worker ready');
