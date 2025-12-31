/**
 * Chrome Tamer Core Engine - Real Tech
 * 
 * Uses chrome.debugger API to get ACTUAL per-tab memory usage
 * Not estimates. Real heap sizes from V8.
 */

class MemoryProfiler {
    constructor() {
        this.attached = new Set();
    }

    /**
     * Attach debugger to a tab and get its REAL heap usage
     * This is actual measurement, not estimation
     */
    async getTabMemory(tabId) {
        try {
            // Attach debugger
            await this.attachDebugger(tabId);

            // Get V8 heap statistics - REAL DATA
            const heapStats = await this.sendDebuggerCommand(
                tabId,
                'Runtime.getHeapUsage'
            );

            // Get detailed memory info
            const memoryInfo = await this.sendDebuggerCommand(
                tabId,
                'Memory.getDOMCounters'
            );

            // Detach to not slow things down
            await this.detachDebugger(tabId);

            return {
                success: true,
                heapUsedBytes: heapStats.usedSize,
                heapTotalBytes: heapStats.totalSize,
                domNodes: memoryInfo.nodes,
                jsEventListeners: memoryInfo.jsEventListeners,
                documents: memoryInfo.documents
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async attachDebugger(tabId) {
        if (this.attached.has(tabId)) return;

        return new Promise((resolve, reject) => {
            chrome.debugger.attach({ tabId }, '1.3', () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    this.attached.add(tabId);
                    resolve();
                }
            });
        });
    }

    async detachDebugger(tabId) {
        if (!this.attached.has(tabId)) return;

        return new Promise((resolve) => {
            chrome.debugger.detach({ tabId }, () => {
                this.attached.delete(tabId);
                resolve();
            });
        });
    }

    async sendDebuggerCommand(tabId, method, params = {}) {
        return new Promise((resolve, reject) => {
            chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(result);
                }
            });
        });
    }

    /**
     * Profile ALL tabs and get real memory data
     */
    async profileAllTabs() {
        const tabs = await chrome.tabs.query({});
        const profiles = [];

        for (const tab of tabs) {
            // Skip chrome:// and extension pages
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                continue;
            }

            const memory = await this.getTabMemory(tab.id);

            profiles.push({
                tabId: tab.id,
                title: tab.title,
                url: tab.url,
                ...memory
            });
        }

        // Sort by memory usage (highest first)
        profiles.sort((a, b) => (b.heapUsedBytes || 0) - (a.heapUsedBytes || 0));

        return profiles;
    }
}

/**
 * Information-theoretic tab importance scoring
 * Uses Shannon entropy to measure information content
 */
class EntropyScorer {
    constructor() {
        this.accessHistory = [];
        this.domainFrequency = {};
    }

    /**
     * Record tab access for entropy calculation
     */
    recordAccess(tabId, url) {
        this.accessHistory.push({
            tabId,
            url,
            timestamp: Date.now()
        });

        // Keep last 1000 accesses
        if (this.accessHistory.length > 1000) {
            this.accessHistory.shift();
        }

        // Update domain frequency
        try {
            const domain = new URL(url).hostname;
            this.domainFrequency[domain] = (this.domainFrequency[domain] || 0) + 1;
        } catch { }
    }

    /**
     * Calculate Shannon entropy of access patterns
     * Higher entropy = more unpredictable = potentially more important
     */
    calculateAccessEntropy() {
        const total = Object.values(this.domainFrequency).reduce((a, b) => a + b, 0);
        if (total === 0) return 0;

        let entropy = 0;
        for (const count of Object.values(this.domainFrequency)) {
            const p = count / total;
            if (p > 0) {
                entropy -= p * Math.log2(p);
            }
        }

        return entropy;
    }

    /**
     * Calculate tab importance using information theory
     * 
     * Importance = f(recency, frequency, uniqueness)
     * 
     * Where uniqueness is inverse probability (surprise)
     */
    calculateImportance(tab) {
        try {
            const domain = new URL(tab.url).hostname;
            const domainCount = this.domainFrequency[domain] || 1;
            const total = Object.values(this.domainFrequency).reduce((a, b) => a + b, 1);

            // Probability of this domain
            const p = domainCount / total;

            // Surprise (self-information) = -log2(p)
            // Higher surprise = rarer = potentially more important to keep
            const surprise = -Math.log2(p);

            // Recency factor (exponential decay)
            const lastAccess = tab.lastAccessed || Date.now();
            const ageHours = (Date.now() - lastAccess) / (1000 * 60 * 60);
            const recencyFactor = Math.exp(-ageHours / 24); // Half-life of 24 hours

            // Combined importance score
            const importance = surprise * recencyFactor;

            return {
                domain,
                probability: p,
                surprise,
                recencyFactor,
                importance
            };
        } catch {
            return { importance: 0 };
        }
    }
}

/**
 * Markov chain for tab transition prediction
 * Predicts which tabs you'll likely need next
 */
class TabPredictor {
    constructor() {
        this.transitionMatrix = {}; // domain -> domain -> count
        this.lastDomain = null;
    }

    /**
     * Record a tab transition for Markov chain learning
     */
    recordTransition(fromUrl, toUrl) {
        try {
            const fromDomain = fromUrl ? new URL(fromUrl).hostname : null;
            const toDomain = new URL(toUrl).hostname;

            if (fromDomain) {
                if (!this.transitionMatrix[fromDomain]) {
                    this.transitionMatrix[fromDomain] = {};
                }
                this.transitionMatrix[fromDomain][toDomain] =
                    (this.transitionMatrix[fromDomain][toDomain] || 0) + 1;
            }

            this.lastDomain = toDomain;
        } catch { }
    }

    /**
     * Predict most likely next tabs based on current tab
     * Returns probability distribution
     */
    predictNext(currentUrl) {
        try {
            const currentDomain = new URL(currentUrl).hostname;
            const transitions = this.transitionMatrix[currentDomain];

            if (!transitions) {
                return [];
            }

            const total = Object.values(transitions).reduce((a, b) => a + b, 0);

            return Object.entries(transitions)
                .map(([domain, count]) => ({
                    domain,
                    probability: count / total
                }))
                .sort((a, b) => b.probability - a.probability)
                .slice(0, 5);
        } catch {
            return [];
        }
    }

    /**
     * Get tabs most likely to be needed soon
     * These should be kept in memory
     */
    async getPredictedNeededTabs() {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab || !activeTab.url) return [];

        const predictions = this.predictNext(activeTab.url);
        const allTabs = await chrome.tabs.query({});

        // Find tabs matching predicted domains
        const predictedTabs = [];
        for (const pred of predictions) {
            for (const tab of allTabs) {
                try {
                    if (new URL(tab.url).hostname === pred.domain) {
                        predictedTabs.push({
                            tabId: tab.id,
                            title: tab.title,
                            probability: pred.probability
                        });
                    }
                } catch { }
            }
        }

        return predictedTabs;
    }
}

/**
 * Graph-based tab relationship analysis
 * Finds clusters of related tabs
 */
class TabGraph {
    constructor() {
        this.edges = []; // { from, to, weight }
    }

    /**
     * Build graph from tab URLs using domain relationships
     */
    async buildGraph() {
        const tabs = await chrome.tabs.query({});
        this.edges = [];

        // Extract domains
        const tabDomains = tabs.map(tab => {
            try {
                return { tabId: tab.id, domain: new URL(tab.url).hostname };
            } catch {
                return null;
            }
        }).filter(Boolean);

        // Create edges between same-domain tabs
        for (let i = 0; i < tabDomains.length; i++) {
            for (let j = i + 1; j < tabDomains.length; j++) {
                const d1 = tabDomains[i].domain;
                const d2 = tabDomains[j].domain;

                // Same domain = strong connection
                if (d1 === d2) {
                    this.edges.push({
                        from: tabDomains[i].tabId,
                        to: tabDomains[j].tabId,
                        weight: 1.0
                    });
                }
                // Same base domain (e.g., api.github.com and github.com)
                else if (this.getBaseDomain(d1) === this.getBaseDomain(d2)) {
                    this.edges.push({
                        from: tabDomains[i].tabId,
                        to: tabDomains[j].tabId,
                        weight: 0.5
                    });
                }
            }
        }

        return this.edges;
    }

    getBaseDomain(domain) {
        const parts = domain.split('.');
        return parts.slice(-2).join('.');
    }

    /**
     * Find connected components (tab clusters)
     * Useful for group operations
     */
    findClusters() {
        const adjacency = {};

        for (const edge of this.edges) {
            if (!adjacency[edge.from]) adjacency[edge.from] = [];
            if (!adjacency[edge.to]) adjacency[edge.to] = [];
            adjacency[edge.from].push(edge.to);
            adjacency[edge.to].push(edge.from);
        }

        const visited = new Set();
        const clusters = [];

        const dfs = (node, cluster) => {
            if (visited.has(node)) return;
            visited.add(node);
            cluster.push(node);
            for (const neighbor of (adjacency[node] || [])) {
                dfs(neighbor, cluster);
            }
        };

        for (const node of Object.keys(adjacency).map(Number)) {
            if (!visited.has(node)) {
                const cluster = [];
                dfs(node, cluster);
                if (cluster.length > 1) {
                    clusters.push(cluster);
                }
            }
        }

        return clusters;
    }
}

// Initialize engines
const memoryProfiler = new MemoryProfiler();
const entropyScorer = new EntropyScorer();
const tabPredictor = new TabPredictor();
const tabGraph = new TabGraph();

// Track tab activations for prediction
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
        entropyScorer.recordAccess(activeInfo.tabId, tab.url);

        // Get previous tab for transition
        const lastUrl = tabPredictor.lastDomain
            ? `https://${tabPredictor.lastDomain}`
            : null;
        tabPredictor.recordTransition(lastUrl, tab.url);
    }
});

// Message handlers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'profileMemory') {
        memoryProfiler.profileAllTabs().then(sendResponse);
        return true;
    }

    if (request.action === 'getTabImportance') {
        chrome.tabs.get(request.tabId).then(tab => {
            sendResponse(entropyScorer.calculateImportance(tab));
        });
        return true;
    }

    if (request.action === 'predictNext') {
        tabPredictor.getPredictedNeededTabs().then(sendResponse);
        return true;
    }

    if (request.action === 'getTabClusters') {
        tabGraph.buildGraph().then(() => {
            sendResponse({ clusters: tabGraph.findClusters() });
        });
        return true;
    }

    if (request.action === 'getAccessEntropy') {
        sendResponse({ entropy: entropyScorer.calculateAccessEntropy() });
        return true;
    }
});

console.log('[Core Engine] Memory profiler, entropy scorer, Markov predictor, graph analyzer loaded');
