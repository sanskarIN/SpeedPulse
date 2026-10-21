/**
 * Local-only speed-test history. Stored entries are considered untrusted:
 * browser extensions, older app versions, and users can all modify storage.
 */
export interface SpeedTestResult {
    isp?: string | null;
    profile?: string;
    download?: number;
    upload?: number;
    ping?: number;
    jitter?: number;
    packetLoss?: number;
}

export interface SpeedTestEntry extends SpeedTestResult {
    id: string;
    date: string;
}

const STORAGE_KEY = 'speedpulse_history';
const MAX_ENTRIES = 50;

function cleanNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value : undefined;
}

function cleanEntry(input: unknown): SpeedTestEntry | null {
    if (!input || typeof input !== 'object') return null;
    const item = input as Record<string, unknown>;
    if (typeof item.id !== 'string' || item.id.length > 100 ||
        typeof item.date !== 'string' || !Number.isFinite(Date.parse(item.date))) {
        return null;
    }
    return {
        id: item.id,
        date: item.date,
        isp: typeof item.isp === 'string' ? item.isp.slice(0, 200) : 'Unknown',
        profile: ['quick', 'standard', 'thorough'].includes(String(item.profile))
            ? String(item.profile) : undefined,
        download: cleanNumber(item.download),
        upload: cleanNumber(item.upload),
        ping: cleanNumber(item.ping),
        jitter: cleanNumber(item.jitter),
        packetLoss: cleanNumber(item.packetLoss),
    };
}

export function getHistory(): SpeedTestEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.slice(0, MAX_ENTRIES).map(cleanEntry).filter((item): item is SpeedTestEntry => item !== null)
            : [];
    } catch {
        return [];
    }
}

export function saveResult(result: SpeedTestResult): SpeedTestEntry[] {
    const now = new Date();
    const candidate = cleanEntry({
        ...result,
        id: String(now.getTime()) + '-' + Math.random().toString(36).slice(2, 8),
        date: now.toISOString(),
    });
    if (!candidate) return getHistory();
    const history = [candidate, ...getHistory()].slice(0, MAX_ENTRIES);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
        // Testing and the visible result must work even without local storage.
    }
    return history;
}

export function clearHistory(): SpeedTestEntry[] {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    return [];
}

function csvCell(value: unknown): string {
    // Quote every cell, escape embedded quotes and disarm spreadsheet formulas.
    const raw = value == null ? '' : String(value);
    const safe = /^[=+@\-\t\r]/.test(raw) ? "'" + raw : raw;
    return '"' + safe.replace(/"/g, '""') + '"';
}

export function exportToCSV(): void {
    const history = getHistory();
    if (!history.length) return;
    const header = ['Date', 'Download (Mbps)', 'Upload (Mbps)', 'Ping (ms)',
        'Jitter (ms)', 'ISP', 'Profile', 'Status'];
    const rows = history.map(item => [
        item.date,
        item.download?.toFixed(2) ?? '',
        item.upload?.toFixed(2) ?? '',
        item.ping?.toFixed(0) ?? '',
        item.jitter?.toFixed(0) ?? '',
        item.isp ?? 'Unknown',
        item.profile ?? 'legacy',
        item.upload == null ? 'Partial' : 'Complete',
    ]);
    const csvContent = [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `speedpulse_history_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
