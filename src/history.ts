/**
 * SpeedPulse - History Management
 */

const STORAGE_KEY = 'speedpulse_history';

export function getHistory() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to load history", e);
        return [];
    }
}

export function saveResult(result) {
    const history = getHistory();
    // Add date/id if not present
    const entry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        ...result
    };
    history.unshift(entry); // Add to beginning

    // Keep max 50 entries
    if (history.length > 50) history.length = 50;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.error("Failed to save history", e);
    }
    return history;
}

export function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    return [];
}

export function exportToCSV() {
    const history = getHistory();
    if (history.length === 0) return;

    const headers = ['Date', 'Download (Mbps)', 'Upload (Mbps)', 'Ping (ms)', 'Jitter (ms)', 'ISP'];
    const rows = history.map(item => [
        new Date(item.date).toLocaleString(),
        Number.isFinite(item.download) ? item.download.toFixed(2) : '',
        Number.isFinite(item.upload) ? item.upload.toFixed(2) : '',
        Number.isFinite(item.ping) ? Math.round(item.ping) : '',
        Number.isFinite(item.jitter) ? Math.round(item.jitter) : '',
        `"${item.isp || 'Unknown'}"` // wrap in quotes to handle commas
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `speedpulse_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
