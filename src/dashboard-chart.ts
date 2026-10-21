/**
 * SpeedPulse chart adapter: the dashboard owns no Chart.js globals or sample
 * arrays. This module remains safe if the optional Chart.js CDN is blocked.
 */
type Sample = number | null;

interface Axis {
    ticks?: { color?: string };
}
interface ChartInstance {
    options: { scales?: { x?: Axis; y?: Axis } };
    update(): void;
}
interface ChartLibrary {
    new (context: CanvasRenderingContext2D, configuration: object): ChartInstance;
    defaults: { color: string };
}
declare const Chart: ChartLibrary;

const MAX_SAMPLES = 50;
const labels: string[] = [];
const download: Sample[] = [];
const upload: Sample[] = [];
let chart: ChartInstance | null = null;

function textColor(): string {
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') return '#94a3b8';
    if (theme !== 'custom') return '#475569';
    try {
        const raw = localStorage.getItem('custom_theme_config') || '{"base":"dark"}';
        const config: unknown = JSON.parse(raw);
        if (config && typeof config === 'object' && 'base' in config) {
            return (config as { base: unknown }).base === 'light' ? '#475569' : '#94a3b8';
        }
    } catch {
        // Invalid, inaccessible or corrupted theme settings must not break charts.
    }
    return '#94a3b8';
}

export function initChart(): void {
    if (chart) return;
    try {
        const element = document.getElementById('speedChart') as HTMLCanvasElement | null;
        if (!element || typeof Chart === 'undefined') return;
        const context = element.getContext('2d');
        if (!context) return;
        Chart.defaults.color = textColor();
        chart = new Chart(context, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Download', data: download, borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)', borderWidth: 2,
                        tension: 0.4, fill: true, pointRadius: 0,
                    },
                    {
                        label: 'Upload', data: upload, borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)', borderWidth: 2,
                        tension: 0.4, fill: false,
                        // Fetch supplies one upload sample only after server ACK.
                        // Draw its real point rather than fabricating a line.
                        pointRadius: 4, pointHoverRadius: 6,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                scales: {
                    x: { display: false },
                    y: { beginAtZero: true, grid: { color: 'rgba(150, 150, 150, 0.1)' } },
                },
                plugins: { legend: { display: false } },
            },
        });
    } catch (error) {
        chart = null;
        console.warn('[SpeedPulse] Optional bandwidth chart unavailable:', error);
    }
}

export function updateChartTheme(): void {
    if (!chart || typeof Chart === 'undefined') return;
    try {
        const color = textColor();
        Chart.defaults.color = color;
        if (chart.options.scales?.x?.ticks) chart.options.scales.x.ticks.color = color;
        if (chart.options.scales?.y?.ticks) chart.options.scales.y.ticks.color = color;
        chart.update();
    } catch (error) {
        console.warn('[SpeedPulse] Chart theme update skipped:', error);
    }
}

export function addChartPoint(value: number, isDownload: boolean): void {
    if (!Number.isFinite(value) || value < 0) return;
    labels.push(new Date().toLocaleTimeString());
    download.push(isDownload ? value : null);
    upload.push(isDownload ? null : value);
    if (labels.length > MAX_SAMPLES) {
        labels.shift();
        download.shift();
        upload.shift();
    }
    try {
        chart?.update();
    } catch (error) {
        console.warn('[SpeedPulse] Optional chart update skipped:', error);
    }
}

export function clearChart(): void {
    labels.length = 0;
    download.length = 0;
    upload.length = 0;
    try {
        chart?.update();
    } catch (error) {
        console.warn('[SpeedPulse] Optional chart clearing skipped:', error);
    }
}

/** Read-only snapshot for diagnostics/tests (not shared mutable arrays). */
export function getChartSamples(): { labels: string[]; download: Sample[]; upload: Sample[] } {
    return { labels: labels.slice(), download: download.slice(), upload: upload.slice() };
}
