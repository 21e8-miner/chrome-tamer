// Popup Pro - Controller for the Pro UI
// Connects to core_engine.js for real data

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadMemoryPanel();
    checkProStatus();
});

// Tab navigation
function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.panel).classList.add('active');

            // Load panel data
            if (tab.dataset.panel === 'memory') loadMemoryPanel();
            if (tab.dataset.panel === 'predict') loadPredictPanel();
            if (tab.dataset.panel === 'clusters') loadClustersPanel();
        });
    });
}

// Check Pro status
async function checkProStatus() {
    chrome.runtime.sendMessage({ action: 'checkProStatus' }, (response) => {
        if (response && response.isPro) {
            document.getElementById('proBadge').style.display = 'block';
            document.getElementById('engineVersion').textContent = 'v2.1 Pro';
        }
    });
}

// Memory Panel
async function loadMemoryPanel() {
    const list = document.getElementById('memoryList');
    list.innerHTML = '<div class="loading"><div class="spinner"></div>Profiling tabs...</div>';

    chrome.runtime.sendMessage({ action: 'profileMemory' }, (profiles) => {
        if (!profiles || profiles.length === 0) {
            list.innerHTML = '<div class="loading">No tabs to profile</div>';
            return;
        }

        // Calculate totals
        let totalHeap = 0;
        let tabCount = 0;

        profiles.forEach(p => {
            if (p.heapUsedBytes) {
                totalHeap += p.heapUsedBytes;
                tabCount++;
            }
        });

        document.getElementById('totalHeap').textContent = formatBytes(totalHeap);
        document.getElementById('tabCount').textContent = tabCount;
        document.getElementById('refreshTime').textContent = new Date().toLocaleTimeString();

        // Render list (top 10)
        list.innerHTML = profiles.slice(0, 10).map(p => {
            if (!p.success) {
                return `
                    <div class="tab-row">
                        <div class="tab-favicon"></div>
                        <div class="tab-info">
                            <div class="tab-title">${escapeHtml(p.title || 'Unknown')}</div>
                            <div class="tab-url">${p.error || 'Could not profile'}</div>
                        </div>
                        <div class="tab-memory">--</div>
                    </div>
                `;
            }

            const memMB = p.heapUsedBytes / (1024 * 1024);
            const memClass = memMB > 100 ? 'high' : memMB > 50 ? 'med' : 'low';

            return `
                <div class="tab-row" data-tab-id="${p.tabId}">
                    <div class="tab-favicon"></div>
                    <div class="tab-info">
                        <div class="tab-title">${escapeHtml(p.title || 'Unknown')}</div>
                        <div class="tab-url">${escapeHtml(truncateUrl(p.url))}</div>
                    </div>
                    <div class="tab-memory ${memClass}">${memMB.toFixed(1)} MB</div>
                </div>
            `;
        }).join('');

        // Store for kill action
        window.topTabs = profiles.slice(0, 3).filter(p => p.tabId);
    });
}

// Predict Panel
async function loadPredictPanel() {
    const predictDiv = document.getElementById('predictions');
    predictDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Loading predictions...</div>';

    // Get entropy
    chrome.runtime.sendMessage({ action: 'getAccessEntropy' }, (response) => {
        const entropy = response?.entropy || 0;
        document.getElementById('entropyValue').textContent = entropy.toFixed(2) + ' bits';
    });

    // Get predictions
    chrome.runtime.sendMessage({ action: 'predictNext' }, (tabs) => {
        if (!tabs || tabs.length === 0) {
            predictDiv.innerHTML = '<div class="predict-card"><div style="color: var(--dim); text-align: center;">Not enough data yet. Keep browsing!</div></div>';
            return;
        }

        predictDiv.innerHTML = tabs.map(t => `
            <div class="predict-card" data-tab-id="${t.tabId}">
                <div class="predict-title">
                    <span>📊</span>
                    ${escapeHtml(t.title)}
                </div>
                <div style="font-size: 11px; color: var(--dim);">
                    ${(t.probability * 100).toFixed(0)}% likely to be needed next
                </div>
                <div class="predict-bar">
                    <div class="predict-fill" style="width: ${t.probability * 100}%"></div>
                </div>
            </div>
        `).join('');
    });
}

// Clusters Panel
async function loadClustersPanel() {
    const list = document.getElementById('clusterList');
    list.innerHTML = '<div class="loading"><div class="spinner"></div>Analyzing graph...</div>';

    chrome.runtime.sendMessage({ action: 'getTabClusters' }, async (response) => {
        if (!response?.clusters || response.clusters.length === 0) {
            list.innerHTML = '<div class="predict-card"><div style="color: var(--dim); text-align: center;">No clusters found. Need 3+ tabs from same domain.</div></div>';
            return;
        }

        // Get tab details for each cluster
        const clustersWithDetails = await Promise.all(
            response.clusters.map(async (cluster) => {
                const tabs = await Promise.all(
                    cluster.map(tabId =>
                        new Promise(resolve => chrome.tabs.get(tabId, resolve))
                    )
                );
                return tabs.filter(t => t);
            })
        );

        list.innerHTML = clustersWithDetails.map((tabs, i) => {
            if (tabs.length === 0) return '';

            const domain = getDomain(tabs[0].url);
            return `
                <div class="predict-card">
                    <div class="predict-title">
                        <span>🔗</span>
                        ${escapeHtml(domain)} (${tabs.length} tabs)
                    </div>
                    ${tabs.slice(0, 3).map(t => `
                        <div style="font-size: 11px; color: var(--dim); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            • ${escapeHtml(t.title)}
                        </div>
                    `).join('')}
                    ${tabs.length > 3 ? `<div style="font-size: 10px; color: var(--dim); margin-top: 4px;">+${tabs.length - 3} more</div>` : ''}
                </div>
            `;
        }).join('');

        // Store for group action
        window.clusters = response.clusters;
    });
}

// Actions
document.getElementById('refreshBtn').addEventListener('click', loadMemoryPanel);

document.getElementById('killTopBtn').addEventListener('click', () => {
    if (!window.topTabs || window.topTabs.length === 0) return;

    const ids = window.topTabs.map(t => t.tabId);
    chrome.tabs.remove(ids, () => {
        loadMemoryPanel();
    });
});

document.getElementById('groupBtn').addEventListener('click', async () => {
    if (!window.clusters || window.clusters.length === 0) return;

    for (const cluster of window.clusters) {
        if (cluster.length >= 2) {
            try {
                const groupId = await chrome.tabs.group({ tabIds: cluster });
                const tab = await chrome.tabs.get(cluster[0]);
                const domain = getDomain(tab.url);
                await chrome.tabGroups.update(groupId, {
                    title: domain,
                    collapsed: true
                });
            } catch (e) {
                console.warn('Could not group:', e);
            }
        }
    }

    loadClustersPanel();
});

// Utilities
function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function truncateUrl(url) {
    try {
        const u = new URL(url);
        return u.hostname + u.pathname.slice(0, 30);
    } catch {
        return url?.slice(0, 40) || '';
    }
}

function getDomain(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return 'unknown';
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}
