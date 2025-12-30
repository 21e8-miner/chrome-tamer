document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    pollLiveScores();
});

// Focus Mode: The "Kill Switch"
document.getElementById('focusModeBtn').addEventListener('click', async () => {
    const btn = document.getElementById('focusModeBtn');
    const originalText = btn.innerHTML;

    btn.innerHTML = "<span>🧹 Squashing Tabs...</span>";
    btn.style.opacity = "0.7";

    // Message background script
    chrome.runtime.sendMessage({ action: "hyperfocus" }, (response) => {
        setTimeout(() => {
            btn.innerHTML = `<span>✨ Freed ${response.count} Tabs!</span>`;
            updateStats();
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.opacity = "1";
            }, 2000);
        }, 500); // Fake delay for UX "weight"
    });
});

// Whitelist Toggle
document.getElementById('whitelistBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const url = new URL(tab.url);
    const domain = url.hostname;

    chrome.runtime.sendMessage({ action: "toggleExclusion", domain }, (response) => {
        const btn = document.getElementById('whitelistBtn');
        btn.innerText = "✅ Added to Exclusions";
        setTimeout(() => btn.innerHTML = "<span>🛡️ Exclude Current Site</span>", 2000);
    });
});

async function updateStats() {
    const data = await chrome.storage.local.get("systemStats");
    const stats = data.systemStats || { deallocated: 0, reclaimedMB: 0 };

    const savedElem = document.getElementById('savedMem');
    if (stats.reclaimedMB > 1000) {
        savedElem.innerHTML = (stats.reclaimedMB / 1000).toFixed(1) + '<span style="font-size: 14px">GB</span>';
    } else {
        savedElem.innerHTML = stats.reclaimedMB + '<span style="font-size: 14px">MB</span>';
    }

    document.getElementById('tamedTabs').innerText = stats.deallocated;
}

function pollLiveScores() {
    chrome.runtime.sendMessage({ action: "getLiveScores" }, (response) => {
        const list = document.getElementById('debugList');
        if (!response.scores || response.scores.length === 0) {
            list.innerHTML = "No candidates for pruning.";
            return;
        }

        list.innerHTML = response.scores.map(s => `
            <div class="debug-row">
                <span>${s.title}</span>
                <span class="debug-score">${s.score.toFixed(2)}</span>
            </div>
        `).join('');
    });
}
