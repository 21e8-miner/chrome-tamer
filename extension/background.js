// Chrome Tamer Core Engine v2.3 (Pressure-Aware Eviction)
// Memory pressure monitoring + redundancy-penalized scoring

// Import all engine modules
try {
    importScripts('core_engine.js', 'pro_v3.js', 'value_features.js');
    console.log('[Background] All modules loaded');
} catch (e) {
    console.warn('[Background] Module load failed:', e);
}
const DEFAULT_CONFIG = {
    baseCost: 6,          // Base cost of keeping a tab loaded
    competitionFactor: 3, // Penalty for domain redundancy
    benefitDecay: 120,    // Scalar for importance decay
    pressureWeight: 1.5,  // How much RAM pressure amplifies cost
    protectedDomains: ["youtube.com", "music.apple.com", "spotify.com", "meet.google.com", "localhost", "github.com"]
};

let currentConfig = { ...DEFAULT_CONFIG };

// --- Initialization ---
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

    // Clean up old menus if any
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "exclude-domain",
            title: "🛡️ Exclude Domain (Utility Override)",
            contexts: ["page"]
        });
    });
});

// Load config on startup
chrome.storage.local.get("config", (data) => {
    if (data.config) currentConfig = { ...currentConfig, ...data.config };
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "exclude-domain" && tab.url) {
        try {
            const url = new URL(tab.url);
            await addExclusion(url.hostname);
        } catch (e) {
            console.error("Invalid URL for exclusion:", tab.url);
        }
    }
});

// --- Memory Pressure Monitor (Runs every minute) ---
chrome.alarms.create("memoryPressureCycle", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "memoryPressureCycle") {
        await pruneByMemoryPressure();
    }
});

async function getMemoryPressure() {
    return new Promise((resolve) => {
        if (!chrome.system || !chrome.system.memory) {
            resolve(0.5); // Fallback to neutral
            return;
        }
        chrome.system.memory.getInfo((info) => {
            const used = info.capacity - info.availableCapacity;
            const pressure = used / info.capacity;
            resolve(pressure);
        });
    });
}

async function pruneByMemoryPressure() {
    // 0. Check Current Memory Pressure
    const pressure = await getMemoryPressure();

    // CRITICAL: Only prune if pressure exceeds threshold (75%)
    const PRESSURE_THRESHOLD = 0.75;
    if (pressure < PRESSURE_THRESHOLD) {
        console.log(`[Skip] Memory pressure acceptable (${(pressure * 100).toFixed(1)}% < ${PRESSURE_THRESHOLD * 100}%)`);
        await chrome.storage.local.set({
            lastPressure: pressure,
            lastPruned: 0
        });
        return;
    }

    console.log(`[Prune] Memory pressure high (${(pressure * 100).toFixed(1)}%), starting eviction...`);

    // 1. Get inactive tabs
    const tabs = await chrome.tabs.query({ active: false, discarded: false, audible: false });
    const { userExclusions } = await chrome.storage.local.get("userExclusions");

    // 2. Calculate Domain Density for Redundancy Penalty
    const domainCounts = {};
    tabs.forEach(t => {
        try {
            if (t.url) {
                const domain = new URL(t.url).hostname;
                domainCounts[domain] = (domainCounts[domain] || 0) + 1;
            }
        } catch (e) { }
    });

    // 3. Score and Prune Low-Utility Tabs
    let prunedCount = 0;
    for (const tab of tabs) {
        if (!tab.url || isProtected(tab.url, userExclusions)) continue;

        const { score, reason } = calculateTabUtility(tab, domainCounts, pressure);

        // Discard tabs with negative utility
        if (score < 0) {
            console.log(`[Discard] ${tab.title} (Score: ${score.toFixed(2)}, Reason: ${reason})`);
            await deallocateResource(tab);
            prunedCount++;
        }
    }

    // Update telemetry for UI
    await chrome.storage.local.set({
        lastPressure: pressure,
        lastPruned: prunedCount
    });
}

function calculateTabUtility(tab, domainCounts, pressure) {
    // 1. Benefit Term (B): Recency value
    // B = benefitDecay / (time + 1)
    const idleTimeMinutes = (Date.now() - (tab.lastAccessed || Date.now())) / 1000 / 60;
    const benefit = currentConfig.benefitDecay / (Math.max(0.1, idleTimeMinutes) + 1);

    // 2. Cost Term (C): Resources + Competition + Dampened Pressure
    // Pressure dampening: move only 20% toward current reading to avoid spike-induced panic
    lastPressureValue = (lastPressureValue * 0.8) + (pressure * 0.2);

    let domain = "";
    try { domain = new URL(tab.url).hostname; } catch (e) { }

    const redundancy = domainCounts[domain] || 1;
    const baseCost = currentConfig.baseCost;

    // Competition is non-linear: each extra tab costs more than the last
    const competitionCost = currentConfig.competitionFactor * Math.pow(redundancy - 1, 1.2);

    // Pressure Penalty: Amplified by dampening state
    const pressurePenalty = lastPressureValue * currentConfig.pressureWeight * 10;

    const cost = baseCost + competitionCost + pressurePenalty;
    const score = benefit - cost;

    // 3. Determine Primary Driver (Reason)
    let reason = "Idle";
    if (redundancy > 1 && (competitionCost > baseCost)) reason = "Redundant";
    if (pressurePenalty > competitionCost && pressurePenalty > baseCost) reason = "Sys Pressure";
    if (idleTimeMinutes > 60) reason = "Aged Out";

    return { score, reason };
}

// --- Message Bus ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "hyperfocus") {
        executeHyperfocus().then(count => sendResponse({ count }));
        return true;
    }
    if (request.action === "toggleExclusion") {
        addExclusion(request.domain).then(status => sendResponse(status));
        return true;
    }
    if (request.action === "getLiveScores") {
        calculateAllScores().then(data => sendResponse(data));
        return true;
    }
});

// --- Core Algorithms ---

async function calculateAllScores() {
    const tabs = await chrome.tabs.query({ active: false, discarded: false, audible: false });
    const { userExclusions } = await chrome.storage.local.get("userExclusions");
    const pressure = await getMemoryPressure();

    const domainCounts = {};
    tabs.forEach(t => {
        try { if (t.url) { const d = new URL(t.url).hostname; domainCounts[d] = (domainCounts[d] || 0) + 1; } } catch (e) { }
    });

    const scoredTabs = tabs.map(tab => {
        if (!tab.url || isProtected(tab.url, userExclusions)) return null;
        const { score, reason } = calculateTabUtility(tab, domainCounts, pressure);
        return {
            title: (tab.title || "Untitled").substring(0, 30) + (tab.title?.length > 30 ? "..." : ""),
            score: score,
            reason: reason,
            id: tab.id,
            favIconUrl: tab.favIconUrl
        };
    }).filter(t => t !== null);

    // Sort by Utility (Lowest first)
    scoredTabs.sort((a, b) => a.score - b.score);

    return {
        scores: scoredTabs.slice(0, 5), // Return top 5 candidates
        pressure: pressure,
        tabCount: tabs.length
    };
}

async function executeHyperfocus() {
    // "Middle-Out" Compression: Aggressively deallocate everything but protected or active contexts.
    const tabs = await chrome.tabs.query({ active: false, discarded: false, audible: false });
    const { userExclusions } = await chrome.storage.local.get("userExclusions");

    let count = 0;
    for (const tab of tabs) {
        if (!tab.pinned && !isProtected(tab.url, userExclusions)) {
            await deallocateResource(tab);
            count++;
        }
    }
    return count;
}

function isProtected(url, userList = []) {
    if (!url) return true; // Protect empty URLs/internal pages by default
    const combined = [...currentConfig.protectedDomains, ...userList];
    return combined.some(domain => url.toLowerCase().includes(domain.toLowerCase()));
}

async function addExclusion(domain) {
    const data = await chrome.storage.local.get("userExclusions");
    const list = data.userExclusions || [];
    if (!list.includes(domain)) {
        list.push(domain);
        await chrome.storage.local.set({ userExclusions: list });
    }
    return { status: "success", domain };
}

async function deallocateResource(tab) {
    try {
        await chrome.tabs.discard(tab.id);

        // Extract domain for analytics
        let domain = '';
        try {
            domain = new URL(tab.url).hostname;
        } catch (e) { }

        // Simple counter (for free tier display)
        const data = await chrome.storage.local.get("systemStats");
        const stats = data.systemStats || { deallocated: 0 };
        await chrome.storage.local.set({
            systemStats: { deallocated: stats.deallocated + 1 }
        });

        // Detailed event log (for Pro analytics)
        await logEvent(1, [domain]);

    } catch (err) {
        console.warn(`Failed to discard tab ${tab.id}:`, err);
    }
}

// Event logging for Pro analytics (stores real data only)
async function logEvent(tabsDiscarded, domains) {
    const { eventHistory, lastPressure } = await chrome.storage.local.get(['eventHistory', 'lastPressure']);
    const history = eventHistory || [];

    history.push({
        timestamp: Date.now(),
        tabsDiscarded,
        domains: domains.filter(d => d), // Remove empty strings
        pressure: lastPressure || 0
    });

    // Keep only last 30 days (avoid storage bloat)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filtered = history.filter(e => e.timestamp > thirtyDaysAgo);

    await chrome.storage.local.set({ eventHistory: filtered });
}
