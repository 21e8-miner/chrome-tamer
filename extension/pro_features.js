// Pro Feature: Native Messaging Bridge
// Communicates with native host for system-level operations

let nativePort = null;
let isProVersion = false;

// Check if Pro license is valid
async function checkProLicense() {
    const { proLicenseKey } = await chrome.storage.local.get('proLicenseKey');
    if (proLicenseKey && validateLicenseKey(proLicenseKey)) {
        isProVersion = true;
        initNativeMessaging();
    }
}

// Initialize native messaging connection
function initNativeMessaging() {
    try {
        nativePort = chrome.runtime.connectNative('com.chrometamer.native');

        nativePort.onMessage.addListener((response) => {
            console.log('[Native] Response:', response);
            handleNativeResponse(response);
        });

        nativePort.onDisconnect.addListener(() => {
            console.log('[Native] Disconnected');
            if (chrome.runtime.lastError) {
                console.error('[Native] Error:', chrome.runtime.lastError.message);
            }
            nativePort = null;
        });

        // Ping to verify connection
        sendNativeMessage({ action: 'ping' });
        console.log('[Native] Connected to native host');
    } catch (e) {
        console.error('[Native] Connection failed:', e);
        isProVersion = false;
    }
}

// Send message to native host
function sendNativeMessage(message) {
    if (!nativePort) {
        console.warn('[Native] No connection to native host');
        return false;
    }

    try {
        nativePort.postMessage(message);
        return true;
    } catch (e) {
        console.error('[Native] Send failed:', e);
        return false;
    }
}

// Handle response from native host
function handleNativeResponse(response) {
    if (response.action === 'pong') {
        console.log('[Native] Host version:', response.version);
    }

    // Store response for UI to retrieve
    chrome.storage.local.set({ lastNativeResponse: response });
}

// Pro Feature: Throttle network for background tabs
async function throttleBackgroundTabs(bandwidthKbps = 100) {
    if (!isProVersion) {
        console.log('[Pro] Network throttling requires Pro license');
        return { success: false, error: 'Pro feature' };
    }

    const tabs = await chrome.tabs.query({ active: false });
    let throttledCount = 0;

    for (const tab of tabs) {
        // Get the process ID for this tab (requires chrome.processes API - dev channel only)
        // For MVP, we'll throttle the main browser process
        // TODO: Implement per-tab throttling when chrome.processes is stable

        const result = sendNativeMessage({
            action: 'throttle_network',
            pid: 0, // Placeholder - need actual tab PID
            bandwidth_kbps: bandwidthKbps
        });

        if (result) throttledCount++;
    }

    return { success: true, count: throttledCount };
}

// Pro Feature: Get enhanced system stats from native host
async function getEnhancedStats() {
    if (!isProVersion || !nativePort) {
        return null;
    }

    sendNativeMessage({ action: 'get_stats' });

    // Wait for response
    return new Promise((resolve) => {
        const checkResponse = setInterval(async () => {
            const { lastNativeResponse } = await chrome.storage.local.get('lastNativeResponse');
            if (lastNativeResponse && lastNativeResponse.stats) {
                clearInterval(checkResponse);
                resolve(lastNativeResponse.stats);
            }
        }, 100);

        // Timeout after 2 seconds
        setTimeout(() => {
            clearInterval(checkResponse);
            resolve(null);
        }, 2000);
    });
}

// Validate Pro license key (offline validation)
function validateLicenseKey(key) {
    // TODO: Implement actual license validation
    // For MVP, accept any key starting with "PRO-"
    return key && key.startsWith('PRO-');
}

// Message handler for Pro features
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'activatePro') {
        chrome.storage.local.set({ proLicenseKey: request.licenseKey });
        checkProLicense();
        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'throttleNetwork') {
        throttleBackgroundTabs(request.bandwidth || 100).then(sendResponse);
        return true;
    }

    if (request.action === 'getEnhancedStats') {
        getEnhancedStats().then(sendResponse);
        return true;
    }

    if (request.action === 'checkProStatus') {
        sendResponse({ isPro: isProVersion });
        return true;
    }
});

// Initialize on startup
checkProLicense();
