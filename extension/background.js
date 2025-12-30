// Chrome Tamer Core Engine v2.0 (Equilibrium-Driven Pruning)
// Implements Game-Theoretic Resource Allocation [Dec 2025 Standard]

const NASH_CONFIG = {
    baseCost: 5,        // Base metabolic cost of a tab
    competitionFactor: 2, // Penalty for domain redundancy
    benefitDecay: 100,    // Scalar for importance decay
    protectedDomains: ["youtube.com", "music.apple.com", "spotify.com", "meet.google.com", "localhost"]
};

// --- Initialization ---
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        systemStats: { deallocated: 0, reclaimedMB: 0 },
        userExclusions: []
    });

    chrome.contextMenus.create({
        id: "exclude-domain",
        title: "🛡️ Exclude Domain (Utility Override)",
        contexts: ["page"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "exclude-domain") {
        const url = new URL(tab.url);
        await addExclusion(url.hostname);
    }
});

// --- Equilibrium Heartbeat ---
chrome.alarms.create("equilibriumCycle", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "equilibriumCycle") {
        await computeNashEquilibrium();
    }
});

async function computeNashEquilibrium() {
    const tabs = await chrome.tabs.query({ active: false, discarded: false, audible: false });
    const { userExclusions } = await chrome.storage.local.get("userExclusions");

    // 1. Calculate Domain Density for Competition Cost
    const domainCounts = {};
    tabs.forEach(t => {
        try {
            const domain = new URL(t.url).hostname;
            domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        } catch (e) { }
    });

    // 2. Evaluate Utility for Each Player (Tab)
    for (const tab of tabs) {
        if (isProtected(tab.url, userExclusions)) continue;

        const utility = calculateTabUtility(tab, domainCounts);

        // 3. Prune Dominated Strategies (Negative Utility)
        if (utility < 0) {
            console.log(`[Outcome] Pruning ${tab.title} (Utility: ${utility.toFixed(2)})`);
            deallocateResource(tab);
        }
    }
}

function calculateTabUtility(tab, domainCounts) {
    // Benefit Term (B): Decays as idle time increases
    const idleTimeMinutes = (Date.now() - (tab.lastAccessed || Date.now())) / 1000 / 60;
    // Prevent divide by zero, add 1 minute smoothing
    const benefit = NASH_CONFIG.benefitDecay / (idleTimeMinutes + 1);

    // Cost Term (C): Base Cost + Redundancy Penalty (Self-Competition)
    let domain = "";
    try { domain = new URL(tab.url).hostname; } catch (e) { }

    const redundancy = domainCounts[domain] || 1;
    const cost = NASH_CONFIG.baseCost + (NASH_CONFIG.competitionFactor * redundancy);

    // Utility = B - C
    return benefit - cost;
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
});

// --- Core Algorithms ---

async function executeHyperfocus() {
    // "Middle-Out" Compression: Aggressively deallocate everything but the active context.
    const tabs = await chrome.tabs.query({ active: false, discarded: false, audible: false });
    let count = 0;
    for (const tab of tabs) {
        if (!tab.pinned) {
            await deallocateResource(tab);
            count++;
        }
    }
    return count;
}

function isProtected(url, userList = []) {
    if (!url) return false;
    const combined = [...NASH_CONFIG.protectedDomains, ...userList];
    return combined.some(domain => url.includes(domain));
}

async function addExclusion(domain) {
    const data = await chrome.storage.local.get("userExclusions");
    const list = data.userExclusions || [];
    if (!list.includes(domain)) {
        list.push(domain);
        await chrome.storage.local.set({ userExclusions: list });
    }
}

async function deallocateResource(tab) {
    try {
        await chrome.tabs.discard(tab.id);

        // Telemetry Update
        const data = await chrome.storage.local.get("systemStats");
        const newStats = {
            deallocated: (data.systemStats?.deallocated || 0) + 1,
            reclaimedMB: (data.systemStats?.reclaimedMB || 0) + 150
        };
        await chrome.storage.local.set({ systemStats: newStats });
    } catch (err) {
        // Silent fail is acceptable
    }
}
