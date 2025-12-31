// High-Value Features - Actually Worth Paying For
// Focus: Problems people ACTUALLY have

// ============================================
// Feature 1: TAB SNOOZE - Close now, reopen automatically later
// Problem: "I need this tab later but it's cluttering my workspace now"
// ============================================
class TabSnooze {
    async snoozeTab(tabId, reopenTime) {
        // Save tab info before closing
        const tab = await chrome.tabs.get(tabId);

        const snoozeEntry = {
            url: tab.url,
            title: tab.title,
            favicon: tab.favIconUrl,
            snoozedAt: Date.now(),
            reopenAt: reopenTime // Unix timestamp
        };

        // Store in snooze queue
        const { snoozeQueue } = await chrome.storage.local.get('snoozeQueue');
        const queue = snoozeQueue || [];
        queue.push(snoozeEntry);
        await chrome.storage.local.set({ snoozeQueue: queue });

        // Close the tab
        await chrome.tabs.remove(tabId);

        // Schedule alarm to reopen
        chrome.alarms.create(`snooze-${Date.now()}`, { when: reopenTime });

        console.log(`[Snooze] Tab will reopen at ${new Date(reopenTime).toLocaleString()}`);
        return { success: true, reopensAt: reopenTime };
    }

    async checkSnoozeAlarms() {
        const { snoozeQueue } = await chrome.storage.local.get('snoozeQueue');
        if (!snoozeQueue || snoozeQueue.length === 0) return;

        const now = Date.now();
        const toOpen = [];
        const remaining = [];

        for (const entry of snoozeQueue) {
            if (entry.reopenAt <= now) {
                toOpen.push(entry);
            } else {
                remaining.push(entry);
            }
        }

        // Reopen due tabs
        for (const entry of toOpen) {
            await chrome.tabs.create({ url: entry.url });
            console.log(`[Snooze] Reopened: ${entry.title}`);
        }

        // Update queue
        await chrome.storage.local.set({ snoozeQueue: remaining });
    }

    async getSnoozedTabs() {
        const { snoozeQueue } = await chrome.storage.local.get('snoozeQueue');
        return snoozeQueue || [];
    }

    async cancelSnooze(index) {
        const { snoozeQueue } = await chrome.storage.local.get('snoozeQueue');
        if (snoozeQueue && snoozeQueue[index]) {
            snoozeQueue.splice(index, 1);
            await chrome.storage.local.set({ snoozeQueue });
            return { success: true };
        }
        return { success: false };
    }
}

// ============================================
// Feature 2: TAB SEARCH - Find any tab instantly with fuzzy matching
// Problem: "I have 100 tabs and can't find the one I need"
// ============================================
class TabSearch {
    async search(query) {
        const tabs = await chrome.tabs.query({});
        const q = query.toLowerCase();

        const results = tabs.map(tab => {
            const title = (tab.title || '').toLowerCase();
            const url = (tab.url || '').toLowerCase();

            // Score based on match quality
            let score = 0;

            // Exact match in title
            if (title.includes(q)) score += 100;
            // Exact match in URL
            if (url.includes(q)) score += 50;
            // Fuzzy matching (characters in order)
            if (this.fuzzyMatch(q, title)) score += 30;
            if (this.fuzzyMatch(q, url)) score += 15;

            return { tab, score };
        })
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(r => ({
                id: r.tab.id,
                windowId: r.tab.windowId,
                title: r.tab.title,
                url: r.tab.url,
                favicon: r.tab.favIconUrl,
                score: r.score
            }));

        return { results };
    }

    fuzzyMatch(query, text) {
        let qi = 0;
        for (let i = 0; i < text.length && qi < query.length; i++) {
            if (text[i] === query[qi]) qi++;
        }
        return qi === query.length;
    }

    async focusTab(tabId, windowId) {
        await chrome.windows.update(windowId, { focused: true });
        await chrome.tabs.update(tabId, { active: true });
        return { success: true };
    }
}

// ============================================
// Feature 3: SESSION SAVE/RESTORE - Never lose your workspace
// Problem: "I had important tabs open but Chrome crashed/I had to restart"
// ============================================
class SessionManager {
    async saveSession(name) {
        const windows = await chrome.windows.getAll({ populate: true });

        const session = {
            name,
            savedAt: Date.now(),
            windows: windows.map(win => ({
                tabs: win.tabs.map(tab => ({
                    url: tab.url,
                    title: tab.title,
                    pinned: tab.pinned
                })).filter(t => t.url && !t.url.startsWith('chrome://'))
            }))
        };

        // Store session
        const { savedSessions } = await chrome.storage.local.get('savedSessions');
        const sessions = savedSessions || [];
        sessions.push(session);

        // Keep max 20 sessions
        while (sessions.length > 20) sessions.shift();

        await chrome.storage.local.set({ savedSessions: sessions });

        const totalTabs = session.windows.reduce((sum, w) => sum + w.tabs.length, 0);
        console.log(`[Session] Saved "${name}" with ${totalTabs} tabs`);
        return { success: true, tabCount: totalTabs };
    }

    async restoreSession(index) {
        const { savedSessions } = await chrome.storage.local.get('savedSessions');
        if (!savedSessions || !savedSessions[index]) {
            return { success: false, error: 'Session not found' };
        }

        const session = savedSessions[index];
        let restoredTabs = 0;

        for (const win of session.windows) {
            if (win.tabs.length > 0) {
                // Create window with first tab
                const newWin = await chrome.windows.create({
                    url: win.tabs[0].url
                });
                restoredTabs++;

                // Add remaining tabs
                for (let i = 1; i < win.tabs.length; i++) {
                    await chrome.tabs.create({
                        windowId: newWin.id,
                        url: win.tabs[i].url,
                        pinned: win.tabs[i].pinned
                    });
                    restoredTabs++;
                }
            }
        }

        console.log(`[Session] Restored "${session.name}" with ${restoredTabs} tabs`);
        return { success: true, tabCount: restoredTabs };
    }

    async listSessions() {
        const { savedSessions } = await chrome.storage.local.get('savedSessions');
        return (savedSessions || []).map((s, i) => ({
            index: i,
            name: s.name,
            savedAt: s.savedAt,
            tabCount: s.windows.reduce((sum, w) => sum + w.tabs.length, 0)
        }));
    }

    async deleteSession(index) {
        const { savedSessions } = await chrome.storage.local.get('savedSessions');
        if (savedSessions && savedSessions[index]) {
            savedSessions.splice(index, 1);
            await chrome.storage.local.set({ savedSessions });
            return { success: true };
        }
        return { success: false };
    }

    async autoSave() {
        // Auto-save current state every 30 minutes as backup
        return this.saveSession(`Auto-Backup ${new Date().toLocaleString()}`);
    }
}

// ============================================
// Feature 4: FOCUS BLOCKER - Actually block distracting sites
// Problem: "I keep opening Reddit/Twitter when I should be working"
// ============================================
class FocusBlocker {
    constructor() {
        this.blockedDomains = [];
        this.focusModeActive = false;
        this.focusEndsAt = null;
    }

    async startFocus(minutes, blockedDomains) {
        this.focusModeActive = true;
        this.focusEndsAt = Date.now() + (minutes * 60 * 1000);
        this.blockedDomains = blockedDomains;

        await chrome.storage.local.set({
            focusMode: {
                active: true,
                endsAt: this.focusEndsAt,
                blockedDomains: blockedDomains
            }
        });

        // Close currently open blocked tabs
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (this.isBlocked(tab.url)) {
                await chrome.tabs.remove(tab.id);
            }
        }

        // Set alarm to end focus
        chrome.alarms.create('focusEnd', { when: this.focusEndsAt });

        console.log(`[Focus] Started ${minutes}min focus, blocking ${blockedDomains.length} sites`);
        return { success: true, endsAt: this.focusEndsAt };
    }

    async endFocus() {
        this.focusModeActive = false;
        this.focusEndsAt = null;
        this.blockedDomains = [];

        await chrome.storage.local.set({
            focusMode: { active: false }
        });

        return { success: true };
    }

    async checkAndBlock(tabId, url) {
        const { focusMode } = await chrome.storage.local.get('focusMode');

        if (!focusMode || !focusMode.active) return false;
        if (Date.now() > focusMode.endsAt) {
            await this.endFocus();
            return false;
        }

        this.blockedDomains = focusMode.blockedDomains;

        if (this.isBlocked(url)) {
            // Redirect to focus page
            await chrome.tabs.update(tabId, {
                url: chrome.runtime.getURL('blocked.html')
            });
            return true;
        }

        return false;
    }

    isBlocked(url) {
        if (!url) return false;
        try {
            const domain = new URL(url).hostname;
            return this.blockedDomains.some(blocked =>
                domain.includes(blocked) || blocked.includes(domain)
            );
        } catch {
            return false;
        }
    }

    async getStatus() {
        const { focusMode } = await chrome.storage.local.get('focusMode');
        if (!focusMode || !focusMode.active) {
            return { active: false };
        }

        const remaining = Math.max(0, focusMode.endsAt - Date.now());
        return {
            active: true,
            remainingMinutes: Math.ceil(remaining / 60000),
            blockedCount: focusMode.blockedDomains.length
        };
    }
}

// ============================================
// Feature 5: DUPLICATE TAB KILLER - Instant cleanup
// Problem: "I accidentally opened the same page 5 times"
// ============================================
class DuplicateKiller {
    async findDuplicates() {
        const tabs = await chrome.tabs.query({});
        const urlMap = {};
        const duplicates = [];

        for (const tab of tabs) {
            if (!tab.url) continue;

            // Normalize URL (remove trailing slash, hash)
            const normalized = this.normalizeUrl(tab.url);

            if (urlMap[normalized]) {
                duplicates.push({
                    id: tab.id,
                    url: tab.url,
                    title: tab.title,
                    originalId: urlMap[normalized]
                });
            } else {
                urlMap[normalized] = tab.id;
            }
        }

        return { duplicates, count: duplicates.length };
    }

    normalizeUrl(url) {
        try {
            const u = new URL(url);
            return u.origin + u.pathname.replace(/\/$/, '');
        } catch {
            return url;
        }
    }

    async killDuplicates() {
        const { duplicates } = await this.findDuplicates();

        if (duplicates.length === 0) {
            return { success: true, killed: 0 };
        }

        const idsToClose = duplicates.map(d => d.id);
        await chrome.tabs.remove(idsToClose);

        console.log(`[Duplicates] Killed ${idsToClose.length} duplicate tabs`);
        return { success: true, killed: idsToClose.length };
    }
}

// ============================================
// Initialize all value-add features
// ============================================
const tabSnooze = new TabSnooze();
const tabSearch = new TabSearch();
const sessionManager = new SessionManager();
const focusBlocker = new FocusBlocker();
const duplicateKiller = new DuplicateKiller();

// Auto-save session every 30 minutes
chrome.alarms.create('autoSaveSession', { periodInMinutes: 30 });

// Check snooze alarms every minute
chrome.alarms.create('checkSnooze', { periodInMinutes: 1 });

// Alarm handlers
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'autoSaveSession') {
        await sessionManager.autoSave();
    }
    if (alarm.name === 'checkSnooze') {
        await tabSnooze.checkSnoozeAlarms();
    }
    if (alarm.name === 'focusEnd') {
        await focusBlocker.endFocus();
        // Notify user
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Focus Mode Ended',
            message: 'Great work! Your focus session has ended.'
        });
    }
    if (alarm.name.startsWith('snooze-')) {
        await tabSnooze.checkSnoozeAlarms();
    }
});

// Block navigation in focus mode
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        await focusBlocker.checkAndBlock(tabId, changeInfo.url);
    }
});

// Message handlers for value-add features
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Tab Snooze
    if (request.action === 'snoozeTab') {
        tabSnooze.snoozeTab(request.tabId, request.reopenAt).then(sendResponse);
        return true;
    }
    if (request.action === 'getSnoozedTabs') {
        tabSnooze.getSnoozedTabs().then(sendResponse);
        return true;
    }

    // Tab Search
    if (request.action === 'searchTabs') {
        tabSearch.search(request.query).then(sendResponse);
        return true;
    }
    if (request.action === 'focusTab') {
        tabSearch.focusTab(request.tabId, request.windowId).then(sendResponse);
        return true;
    }

    // Sessions
    if (request.action === 'saveSession') {
        sessionManager.saveSession(request.name).then(sendResponse);
        return true;
    }
    if (request.action === 'restoreSession') {
        sessionManager.restoreSession(request.index).then(sendResponse);
        return true;
    }
    if (request.action === 'listSessions') {
        sessionManager.listSessions().then(sendResponse);
        return true;
    }

    // Focus Mode
    if (request.action === 'startFocus') {
        focusBlocker.startFocus(request.minutes, request.blockedDomains).then(sendResponse);
        return true;
    }
    if (request.action === 'endFocus') {
        focusBlocker.endFocus().then(sendResponse);
        return true;
    }
    if (request.action === 'getFocusStatus') {
        focusBlocker.getStatus().then(sendResponse);
        return true;
    }

    // Duplicates
    if (request.action === 'findDuplicates') {
        duplicateKiller.findDuplicates().then(sendResponse);
        return true;
    }
    if (request.action === 'killDuplicates') {
        duplicateKiller.killDuplicates().then(sendResponse);
        return true;
    }
});

console.log('[Value-Add] All high-value features loaded');
