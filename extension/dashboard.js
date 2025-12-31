// Dashboard Data Management and Visualization

// Telemetry storage structure
const TELEMETRY_KEY = 'telemetryHistory';
const MAX_HISTORY_DAYS = 30;

// Initialize charts
let ramChart = null;
let pressureChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardData();
    setupExport();
});

async function loadDashboardData() {
    const history = await getTelemetryHistory();

    // Calculate aggregates
    const stats = calculateStats(history);
    updateStatCards(stats);

    // Render charts
    renderRAMChart(history);
    renderPressureChart(history);
    renderLeaderboard(history);
}

async function getTelemetryHistory() {
    const { telemetryHistory } = await chrome.storage.local.get(TELEMETRY_KEY);
    return telemetryHistory || [];
}

function calculateStats(history) {
    if (history.length === 0) {
        return {
            totalSaved: 0,
            totalTabs: 0,
            avgPressure: 0,
            uptime: 0
        };
    }

    const totalSaved = history.reduce((sum, entry) => sum + (entry.ramFreed || 0), 0);
    const totalTabs = history.reduce((sum, entry) => sum + (entry.tabsPruned || 0), 0);
    const avgPressure = history.reduce((sum, entry) => sum + (entry.pressure || 0), 0) / history.length;

    // Calculate uptime in days
    const firstTimestamp = history[0]?.timestamp || Date.now();
    const lastTimestamp = history[history.length - 1]?.timestamp || Date.now();
    const uptime = Math.ceil((lastTimestamp - firstTimestamp) / (1000 * 60 * 60 * 24));

    return {
        totalSaved: (totalSaved / 1024).toFixed(1), // Convert MB to GB
        totalTabs,
        avgPressure: (avgPressure * 100).toFixed(1),
        uptime: Math.max(1, uptime)
    };
}

function updateStatCards(stats) {
    document.getElementById('totalSaved').textContent = `${stats.totalSaved} GB`;
    document.getElementById('totalTabs').textContent = stats.totalTabs;
    document.getElementById('avgPressure').textContent = `${stats.avgPressure}%`;
    document.getElementById('uptime').textContent = `${stats.uptime}d`;
}

function renderRAMChart(history) {
    const ctx = document.getElementById('ramChart').getContext('2d');

    // Group by day
    const dailyData = groupByDay(history);

    // Destroy existing chart if present
    if (ramChart) ramChart.destroy();

    ramChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyData.map(d => d.date),
            datasets: [{
                label: 'RAM Freed (MB)',
                data: dailyData.map(d => d.ramFreed),
                borderColor: '#00d9ff',
                backgroundColor: 'rgba(0, 217, 255, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#888899' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#888899' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });
}

function renderPressureChart(history) {
    const ctx = document.getElementById('pressureChart').getContext('2d');

    const dailyData = groupByDay(history);

    if (pressureChart) pressureChart.destroy();

    pressureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyData.map(d => d.date),
            datasets: [{
                label: 'Avg Memory Pressure (%)',
                data: dailyData.map(d => d.avgPressure * 100),
                borderColor: '#ff00ff',
                backgroundColor: 'rgba(255, 0, 255, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '#888899', callback: (value) => value + '%' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#888899' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });
}

function renderLeaderboard(history) {
    // Aggregate by domain
    const domainStats = {};

    history.forEach(entry => {
        if (entry.domains) {
            entry.domains.forEach(domain => {
                if (!domainStats[domain]) {
                    domainStats[domain] = { count: 0, ramSaved: 0 };
                }
                domainStats[domain].count++;
                domainStats[domain].ramSaved += 250; // Avg per tab
            });
        }
    });

    // Sort by count
    const sorted = Object.entries(domainStats)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10);

    const tbody = document.getElementById('leaderboardBody');

    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-dim);">No data yet. Start using Chrome Tamer!</td></tr>';
        return;
    }

    tbody.innerHTML = sorted.map(([domain, stats], index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${domain}</td>
            <td>${stats.count}</td>
            <td>${(stats.ramSaved / 1024).toFixed(2)} GB</td>
        </tr>
    `).join('');
}

function groupByDay(history) {
    const grouped = {};

    history.forEach(entry => {
        const date = new Date(entry.timestamp).toLocaleDateString();
        if (!grouped[date]) {
            grouped[date] = {
                ramFreed: 0,
                pressures: [],
                count: 0
            };
        }
        grouped[date].ramFreed += entry.ramFreed || 0;
        grouped[date].pressures.push(entry.pressure || 0);
        grouped[date].count++;
    });

    return Object.entries(grouped).map(([date, data]) => ({
        date,
        ramFreed: data.ramFreed,
        avgPressure: data.pressures.reduce((a, b) => a + b, 0) / data.pressures.length
    }));
}

function setupExport() {
    document.getElementById('exportBtn').addEventListener('click', async () => {
        const history = await getTelemetryHistory();

        // Convert to CSV
        const csv = [
            ['Timestamp', 'RAM Freed (MB)', 'Tabs Pruned', 'Memory Pressure', 'Domains'].join(','),
            ...history.map(entry => [
                new Date(entry.timestamp).toISOString(),
                entry.ramFreed || 0,
                entry.tabsPruned || 0,
                (entry.pressure || 0).toFixed(3),
                (entry.domains || []).join(';')
            ].join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chrome-tamer-history-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

// Background script should log telemetry events
// Add this to background.js:
/*
async function logTelemetry(event) {
    const { telemetryHistory } = await chrome.storage.local.get('telemetryHistory');
    const history = telemetryHistory || [];
    
    history.push({
        timestamp: Date.now(),
        ramFreed: event.ramFreed,
        tabsPruned: event.tabsPruned,
        pressure: event.pressure,
        domains: event.domains
    });
    
    // Keep only last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filtered = history.filter(e => e.timestamp > thirtyDaysAgo);
    
    await chrome.storage.local.set({ telemetryHistory: filtered });
}
*/
