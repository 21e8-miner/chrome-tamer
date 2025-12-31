document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    pollLiveScores();
    // Refresh scores every 5 seconds for "live" feel
    setInterval(pollLiveScores, 5000);
});

// Focus Mode: The "Kill Switch"
document.getElementById('focusModeBtn').addEventListener('click', async () => {
    const btn = document.getElementById('focusModeBtn');
    const originalText = btn.innerHTML;

    btn.innerHTML = "<span>🧹 Squashing Tabs...</span>";
    btn.style.opacity = "0.7";
    btn.style.pointerEvents = "none";

    chrome.runtime.sendMessage({ action: "hyperfocus" }, (response) => {
        setTimeout(() => {
            btn.innerHTML = `<span>✨ Freed ${response?.count || 0} Tabs!</span>`;
            updateStats();
            pollLiveScores();
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.opacity = "1";
                btn.style.pointerEvents = "auto";
            }, 2000);
        }, 800);
    });
});

// Whitelist Toggle
document.getElementById('whitelistBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    try {
        const url = new URL(tab.url);
        const domain = url.hostname;

        chrome.runtime.sendMessage({ action: "toggleExclusion", domain }, (response) => {
            const btn = document.getElementById('whitelistBtn');
            const original = btn.innerHTML;
            btn.innerHTML = "<span>✅ Site Protected</span>";
            btn.style.background = "rgba(0, 255, 136, 0.1)";
            setTimeout(() => {
                btn.innerHTML = original;
                btn.style.background = "";
            }, 2000);
        });
    } catch (e) {
        console.error("Invalid URL for whitelist");
    }
});

async function updateStats() {
    const data = await chrome.storage.local.get("systemStats");
    const stats = data.systemStats || { deallocated: 0 };

    // HONEST: We can only count tabs discarded, not RAM freed
    // Chrome extensions cannot measure actual memory usage
    document.getElementById('savedMem').innerHTML = stats.deallocated + '<span style="font-size: 12px">tabs</span>';
    document.getElementById('tamedTabs').innerText = stats.deallocated;
}

function pollLiveScores() {
    chrome.runtime.sendMessage({ action: "getLiveScores" }, (response) => {
        if (!response) return;

        // Update Pressure Gauge
        const pressure = response.pressure || 0;
        const gauge = document.getElementById('pressureGauge');
        const pressVal = document.getElementById('pressureVal');

        if (gauge) gauge.style.width = `${(pressure * 100).toFixed(0)}%`;
        if (pressVal) pressVal.innerText = `${(pressure * 100).toFixed(0)}%`;

        // Update Tab List
        const list = document.getElementById('debugList');
        if (!response.scores || response.scores.length === 0) {
            list.innerHTML = '<div style="font-size: 11px; color: #555; text-align: center; padding: 10px;">Equilibrium Reached. No candidates.</div>';
            return;
        }

        list.innerHTML = response.scores.map(s => `
            <div class="tab-row">
                <div class="tab-info">
                    ${s.favIconUrl ? `<img src="${s.favIconUrl}" class="tab-icon">` : '<div class="tab-icon" style="background: #222"></div>'}
                    <span class="tab-title">${s.title}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 9px; opacity: 0.5; color: var(--accent);">${s.reason}</span>
                    <span class="tab-score">${s.score.toFixed(1)}</span>
                </div>
            </div>
        `).join('');
    });
}
