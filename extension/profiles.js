// Hyper focus Profiles System
// Pro Feature: One-click workspace optimization

const PROFILES = {
    work: {
        name: "💼 Work Mode",
        description: "Protect productivity tools, aggressive on distractions",
        protected: [
            'gmail.com', 'mail.google.com',
            'slack.com', 'teams.microsoft.com',
            'calendar.google.com', 'outlook.office.com',
            'notion.so', 'docs.google.com',
            'github.com', 'gitlab.com',
            'localhost', '127.0.0.1'
        ],
        aggressive: [
            'youtube.com', 'reddit.com', 'twitter.com', 'x.com',
            'facebook.com', 'instagram.com', 'tiktok.com',
            'netflix.com', 'twitch.tv'
        ],
        bandwidth_limit: 1000, // 1 Mbps for background tabs
        pressure_threshold: 0.7 // Start pruning at 70% instead of 75%
    },

    gaming: {
        name: "🎮 Gaming Mode",
        description: "Protect gaming resources, kill everything else",
        protected: [
            'wiki.', // Game wikis
            'discord.com',
            'steampowered.com', 'epicgames.com',
            'twitch.tv' // For streams
        ],
        aggressive: ['*'], // Kill everything not protected
        bandwidth_limit: 50, // Very aggressive - 50 Kbps
        pressure_threshold: 0.6 // Even more aggressive pruning
    },

    research: {
        name: "📚 Research Mode",
        description: "Protect documentation and references",
        protected: [
            'wikipedia.org', 'scholar.google.com',
            'arxiv.org', 'researchgate.net',
            'stackoverflow.com', 'github.com',
            'docs.', 'developer.', // Documentation sites
            'localhost', '127.0.0.1'
        ],
        aggressive: [
            'youtube.com', 'reddit.com', 'twitter.com',
            'news.', // News sites
        ],
        bandwidth_limit: 500,
        pressure_threshold: 0.75
    },

    focus: {
        name: "🎯 Deep Focus",
        description: "Ultra-aggressive, only active tab survives",
        protected: [], // Nothing is protected except active tab
        aggressive: ['*'],
        bandwidth_limit: 10, // Nearly disable network
        pressure_threshold: 0.5 // Prune very early
    }
};

// Active profile state
let activeProfile = null;

// Apply a profile
async function applyProfile(profileId) {
    const profile = PROFILES[profileId];
    if (!profile) {
        console.error('Invalid profile:', profileId);
        return { success: false, error: 'Profile not found' };
    }

    console.log(`[Profile] Applying: ${profile.name}`);

    // 1. Update protected domains
    await chrome.storage.local.set({
        userExclusions: profile.protected
    });

    // 2. Update pressure threshold
    await chrome.storage.local.set({
        pressureThreshold: profile.pressure_threshold
    });

    // 3. Apply bandwidth limits (Pro feature)
    if (isProVersion && nativePort) {
        const tabs = await chrome.tabs.query({ active: false });
        for (const tab of tabs) {
            // TODO: Get process ID and throttle
            sendNativeMessage({
                action: 'throttle_network',
                pid: 0,  // Placeholder
                bandwidth_kbps: profile.bandwidth_limit
            });
        }
    }

    // 4. Immediate prune of aggressive domains
    const tabs = await chrome.tabs.query({ discarded: false });
    let prunedCount = 0;

    for (const tab of tabs) {
        if (!tab.url || tab.active || tab.pinned) continue;

        // Check if in aggressive list
        const isAggressive = profile.aggressive.some(pattern => {
            if (pattern === '*') return true;
            return tab.url.includes(pattern);
        });

        // Check if NOT in protected list
        const isProtected = profile.protected.some(domain =>
            tab.url.includes(domain)
        );

        if (isAggressive && !isProtected) {
            await chrome.tabs.discard(tab.id);
            prunedCount++;
        }
    }

    // 5. Store active profile
    activeProfile = profileId;
    await chrome.storage.local.set({ activeProfile: profileId });

    console.log(`[Profile] ${profile.name} applied, pruned ${prunedCount} tabs`);

    return {
        success: true,
        profile: profile.name,
        pruned: prunedCount
    };
}

// Get current profile
async function getCurrentProfile() {
    const { activeProfile: storedProfile } = await chrome.storage.local.get('activeProfile');
    return storedProfile || null;
}

// Reset to default (no profile)
async function resetProfile() {
    await chrome.storage.local.set({
        activeProfile: null,
        pressureThreshold: 0.75, // Back to default
        userExclusions: []
    });

    activeProfile = null;
    console.log('[Profile] Reset to default');

    return { success: true };
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'applyProfile') {
        applyProfile(request.profileId).then(sendResponse);
        return true;
    }

    if (request.action === 'getCurrentProfile') {
        getCurrentProfile().then(sendResponse);
        return true;
    }

    if (request.action === 'resetProfile') {
        resetProfile().then(sendResponse);
        return true;
    }

    if (request.action === 'listProfiles') {
        const profileList = Object.keys(PROFILES).map(id => ({
            id,
            name: PROFILES[id].name,
            description: PROFILES[id].description
        }));
        sendResponse({ profiles: profileList });
        return true;
    }
});

// Restore active profile on startup
chrome.runtime.onStartup.addListener(async () => {
    const profile = await getCurrentProfile();
    if (profile) {
        console.log('[Profile] Restoring from startup:', profile);
        await applyProfile(profile);
    }
});
