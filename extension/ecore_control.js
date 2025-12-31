// E-Core Pinning Control Panel
// Pro Feature: Windows 12th Gen+ CPU Core Management

// Detect CPU topology
async function detectCPUTopology() {
    const response = await sendNativeMessageAsync({ action: 'get_cpu_topology' });
    return response;
}

// Pin process to specific core class
async function setCoreAffinity(pid, coreClass) {
    // coreClass: 'auto', 'ecores', 'pcores'
    const response = await sendNativeMessageAsync({
        action: 'set_cpu_affinity',
        pid: pid,
        coreClass: coreClass
    });
    return response;
}

// UI: Add E-Core control to popup
function initECoreUI() {
    if (!isProVersion) return;

    // Add section to popup
    const ecoreSection = document.createElement('div');

    ecoreSection.className = 'pro-feature-section';
    ecoreSection.innerHTML = `
        <div class="feature-header">
            <span class="feature-icon">⚙️</span>
            <span class="feature-title">CPU Policy (Pro)</span>
        </div>
        <select id="cpuPolicy" class="policy-selector">
            <option value="auto" selected>Auto (Smart)</option>
            <option value="ecores">E-Cores Only</option>
            <option value="pcores">P-Cores Only</option>
        </select>
        <div id="coreStatus" class="status-text"></div>
    `;

    document.getElementById('actionsContainer').appendChild(ecoreSection);

    // Handle policy changes
    document.getElementById('cpuPolicy').addEventListener('change', async (e) => {
        const policy = e.target.value;
        await applyCPUPolicy(policy);
    });

    // Show current status
    updateCoreStatus();
}

async function applyCPUPolicy(policy) {
    const tabs = await chrome.tabs.query({});
    const activeTab = tabs.find(t => t.active);

    for (const tab of tabs) {
        if (!tab.id) continue;

        // Determine cores based on policy and tab state
        let cores;
        if (policy === 'auto') {
            // Active tab → P-Cores, Background → E-Cores
            cores = (tab.id === activeTab?.id) ? 'pcores' : 'ecores';
        } else {
            cores = policy;
        }

        // Apply via native host
        // Note: chrome.processes API is dev-channel only, so we estimate PID
        await setCoreAffinity(0, cores); // TODO: Get actual tab PID
    }

    updateCoreStatus();
}

async function updateCoreStatus() {
    const topology = await detectCPUTopology();
    const statusEl = document.getElementById('coreStatus');

    if (topology?.success) {
        statusEl.textContent = `${topology.pcores || 0} P-Cores, ${topology.ecores || 0} E-Cores detected`;
        statusEl.style.color = 'var(--success)';
    } else {
        statusEl.textContent = 'CPU topology detection unavailable';
        statusEl.style.color = 'var(--text-dim)';
    }
}

// Helper: Send native message with promise
function sendNativeMessageAsync(message) {
    return new Promise((resolve) => {
        if (!nativePort) {
            resolve({ success: false, error: 'Native host not connected' });
            return;
        }

        // Store callback
        const callbackId = Math.random().toString(36).substring(7);
        message.callbackId = callbackId;

        const listener = (response) => {
            if (response.callbackId === callbackId) {
                nativePort.onMessage.removeListener(listener);
                resolve(response);
            }
        };

        nativePort.onMessage.addListener(listener);
        nativePort.postMessage(message);

        // Timeout after 5s
        setTimeout(() => {
            nativePort.onMessage.removeListener(listener);
            resolve({ success: false, error: 'Timeout' });
        }, 5000);
    });
}

// Initialize when Pro is active
chrome.storage.local.get('proLicenseKey', (data) => {
    if (data.proLicenseKey && validateLicenseKey(data.proLicenseKey)) {
        initECoreUI();
    }
});
