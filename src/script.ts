/**
 * SpeedPulse - Main Application Script
 */

declare const html2canvas: any;

import { formatSpeed, playSound, calculateGrade, fireConfetti } from './utils.js';
import { initChart, updateChartTheme, addChartPoint, clearChart } from './dashboard-chart.js';
import { calculateReadiness, READINESS_ORDER } from './readiness.js';
import { runPingTest, runDownloadTest, runUploadTest, abortTest, explainTestError } from './speedtest.js';
import { getTestProfile, loadTestProfile, saveTestProfile, effectiveTestBudget } from './test-profiles.js';
import type { ServerBudgetLimits } from './test-profiles.js';
import type { SpeedServer } from './speedtest.js';
import { getHistory, saveResult, clearHistory, exportToCSV } from './history.js';

// Elements
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const shareBtn = document.getElementById('share-btn');
const themeToggle = document.getElementById('theme-toggle');
const soundToggle = document.getElementById('sound-toggle');

const gaugeSpeed = document.getElementById('gauge-speed');
const gaugePhase = document.getElementById('gauge-phase');
const gaugePath = document.getElementById('gauge-path');

const valPing = document.getElementById('val-ping');
const valJitter = document.getElementById('val-jitter');
const valDown = document.getElementById('val-down');
const valUp = document.getElementById('val-up');

const progDown = document.getElementById('prog-down');
const progUp = document.getElementById('prog-up');

// State
let isTesting = false;
let testGeneration = 0;
let currentPhase = 'idle'; // idle, ping, download, upload, finished
// Update UI
function setGaugePhase(phase) {
    gaugePhase.textContent = phase;
    currentPhase = phase;

    if (phase === 'ping' || phase === 'download' || phase === 'upload') {
        document.body.classList.add('testing-active');
    } else {
        document.body.classList.remove('testing-active');
    }
}

function updateGauge(value) {
    gaugeSpeed.textContent = formatSpeed(value, ((document.getElementById('unit-select') as HTMLSelectElement)).value);

    // Map 0-1000 Mbps to SVG dashoffset (283 to 0)
    // 283 is full empty, 0 is full
    let pct = Math.min(Math.max(value / 1000, 0), 1);
    // Non-linear scale to show low speeds better
    pct = Math.pow(pct, 0.5);
    gaugePath.style.strokeDashoffset = 283 - (283 * pct);
}

// Start Test Flow
async function startTest() {
    if (isTesting) return;
    isTesting = true;
    const runId = ++testGeneration;
    const ensureActive = () => {
      if (!isTesting || runId !== testGeneration) {
        throw new DOMException("Speed test cancelled", "AbortError");
      }
    };

    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    shareBtn.classList.add('hidden');

    valPing.textContent = '--';
    valJitter.textContent = '--';
    valDown.textContent = '--';
    valUp.textContent = '--';
    progDown.style.width = '0%';
    progDown.setAttribute('aria-valuenow', '0');
    progUp.style.width = '0%';
    updateGauge(0);
    clearChart();

    document.getElementById('overall-grade').textContent = '-';
    document.getElementById('grade-desc').textContent = 'Testing in progress...';
    document.querySelectorAll('.status-indicator').forEach(el => el.className = 'status-indicator');

    try { playSound('start'); } catch (error) { console.warn('Audio notification skipped:', error); }

    const server = (document.getElementById('server-select') as HTMLSelectElement).value as SpeedServer;
    // Freeze the budget for this run, even if the user later changes preferences.
    const profile = getTestProfile((document.getElementById('test-profile-select') as HTMLSelectElement).value);
    const serverLimits = server === 'local'
        ? (window as Window & { speedpulseServerLimits?: ServerBudgetLimits }).speedpulseServerLimits
        : null;
    const budget = effectiveTestBudget(profile, serverLimits);
    let activeStage: 'ping' | 'download' | 'upload' = 'ping';
    const finalResult: { isp: string | null; profile: string; ping?: number; jitter?: number; packetLoss?: number; download?: number; upload?: number } =
        { isp: document.getElementById('info-isp').textContent, profile: profile.id };

    try {
        // Initialization / Warm-up Phase
        setGaugePhase('Finding Optimal Server...');
        gaugeSpeed.textContent = '...';
        await new Promise(resolve => setTimeout(resolve, 800));
        
        ensureActive();
          setGaugePhase('Connecting...');
        await new Promise(resolve => setTimeout(resolve, 800));

        // Ping
        activeStage = 'ping';
        ensureActive();
          setGaugePhase('Ping Test');
        gaugeSpeed.textContent = '...';
        const { ping, jitter, packetLoss } = await runPingTest(server, p => {
            valPing!.textContent = Math.round(p).toString();
        });
        valPing!.textContent = Math.round(ping).toString();
        valJitter!.textContent = Math.round(jitter).toString();
        finalResult.ping = ping;
        finalResult.jitter = jitter;
        finalResult.packetLoss = packetLoss; // fraction of failed HTTP probes, not network packet loss

        // Download
        activeStage = 'download';
        ensureActive();
          setGaugePhase('Download Test');
        let currentDown = 0;
        const finalDown = await runDownloadTest(server, (mbps, completedFraction) => {
            currentDown = mbps;
            if (typeof completedFraction === 'number') {
                const percent = (Math.min(1, Math.max(0, completedFraction)) * 100).toFixed(1);
                progDown.style.width = percent + '%';
                progDown.setAttribute('aria-valuenow', percent);
            }
            updateGauge(mbps);
            valDown.textContent = formatSpeed(mbps, ((document.getElementById('unit-select') as HTMLSelectElement)).value);
            addChartPoint(mbps, true);
        }, budget.downloadBytes);
        valDown.textContent = formatSpeed(finalDown, ((document.getElementById('unit-select') as HTMLSelectElement)).value);
        progDown.style.width = '100%';
        progDown.setAttribute('aria-valuenow', '100');
        finalResult.download = finalDown;

        // Brief pause
        updateGauge(0);
        await new Promise(r => setTimeout(r, 500));

        // Upload
        activeStage = 'upload';
        ensureActive();
          setGaugePhase('Upload Test');
        let currentUp = 0;
        let finalUp = null;
        let uploadError = '';
        try {
          finalUp = await runUploadTest(server, mbps => {
            currentUp = mbps;
            updateGauge(mbps);
            valUp.textContent = formatSpeed(mbps, ((document.getElementById('unit-select') as HTMLSelectElement)).value);
            addChartPoint(mbps, false);
          }, budget.uploadBytes);
          valUp.textContent = formatSpeed(finalUp, document.getElementById('unit-select').value);
          progUp.style.width = '100%';
          finalResult.upload = finalUp;
        } catch (error) {
          if (error && error.name === 'AbortError') throw error;
          uploadError = explainTestError(error, 'upload', server);
          console.warn('[SpeedPulse] Upload measurement unavailable:', error);
          valUp.textContent = '--';
          progUp.style.width = '0%';
        }

        // Finish
        ensureActive();
          setGaugePhase('Finished');
        updateGauge(finalDown); // Leave gauge at download speed

        // Calculate Grade
        const gradeObj = uploadError ? {
          grade: '-',
          text: 'Partial result: download and ping measured; upload unavailable. ' + uploadError
        } : calculateGrade(finalDown, finalUp, ping);
        document.getElementById('overall-grade').textContent = gradeObj.grade;
        document.getElementById('grade-desc').textContent = gradeObj.text;

        // Heuristic status: do not classify unavailable measurements as failures.
        const indicators = document.querySelectorAll('.status-indicator');
        const readiness = calculateReadiness({ download: finalDown, upload: finalUp, ping, jitter });
        READINESS_ORDER.forEach((key, index) => {
            const indicator = indicators[index];
            if (!indicator) return;
            const status = readiness[key];
            indicator.className = 'status-indicator' +
                (status === 'unknown' ? '' : ' status-' + status);
            indicator.setAttribute('aria-label', status === 'unknown'
                ? 'Not enough measured data' : (status === 'pass' ? 'Likely suitable' : 'May be unsuitable'));
        });
        saveResult(finalResult);
        renderHistory();

        try { playSound('finish'); } catch (error) { console.warn('Audio notification skipped:', error); }

        // Check personal best
        const history = getHistory();
        if (history.length > 1) {
            const previousBest = Math.max(...history.slice(1).map(h => h.download || 0));
            if (finalDown > previousBest) {
                try { fireConfetti(); } catch (error) { console.warn('Celebration animation skipped:', error); }
            }
        } else if (finalDown > 100) {
            try { fireConfetti(); } catch (error) { console.warn('Celebration animation skipped:', error); } // First time but really fast
        }

    } catch (e) {
          if (runId !== testGeneration) return;
        if (e.name !== 'AbortError') {
            console.error(e);
            setGaugePhase('Error');
            document.getElementById('grade-desc').textContent =
                'Could not complete the test: ' + explainTestError(e, activeStage, server);
        } else {
            setGaugePhase('Aborted');
        }
    } finally {
          if (runId !== testGeneration) return;
        isTesting = false;
        startBtn.classList.remove('hidden');
        startBtn.textContent = 'Retry Test';
        stopBtn.classList.add('hidden');
        if (Number.isFinite(finalResult.download)) shareBtn.classList.remove('hidden');
        else shareBtn.classList.add('hidden');
    }
}

function stopCurrentTest() {
    if (!isTesting) return;
    testGeneration += 1;
        abortTest();
    isTesting = false;
    setGaugePhase('Aborted');
    updateGauge(0);
    progDown.setAttribute('aria-valuenow', '0');
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
        shareBtn.classList.add('hidden');
}

// Connection Details Fetch
async function fetchConnectionDetails() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();

        document.getElementById('info-isp').textContent = data.org || '--';
        document.getElementById('info-ip').textContent = data.ip || '--';
        document.getElementById('info-loc').textContent = `${data.city}, ${data.country_name}`;
    } catch (e) {
        console.warn("Primary ISP fetch failed, trying fallback...", e);
        try {
            const res = await fetch('https://ipwho.is/');
            const data = await res.json();
            document.getElementById('info-isp').textContent = data.connection?.isp || '--';
            document.getElementById('info-ip').textContent = data.ip || '--';
            document.getElementById('info-loc').textContent = `${data.city}, ${data.country}`;
        } catch (e2) {
            document.getElementById('info-isp').textContent = 'Unknown ISP';
        }
    }

    // Browser Info
    document.getElementById('info-browser').textContent = (function () {
        let ua = navigator.userAgent, tem,
            M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        if (/trident/i.test(M[1])) {
            tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
            return 'IE ' + (tem[1] || '');
        }
        if (M[1] === 'Chrome') {
            tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
            if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
        }
        M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
        if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
        return M.join(' ');
    })();

    // Connection type (if available)
    if ((navigator as any).connection) {
        document.getElementById('info-type').textContent = (navigator as any).connection.effectiveType || '--';
    }
}

// History Rendering
function renderHistory() {
    const history = getHistory();
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = '';

    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No tests run yet.</td></tr>';
        return;
    }

    history.forEach((item, index) => {
        const tr = document.createElement('tr');

        const tdCheck = document.createElement('td');
        const check = document.createElement('input');
        check.type = 'checkbox';
        check.className = 'history-checkbox';
        check.value = index;
        tdCheck.appendChild(check);

        const tdDate = document.createElement('td');
        tdDate.textContent = new Date(item.date).toLocaleDateString() + ' ' + new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const tdDown = document.createElement('td');
        tdDown.innerHTML = `<strong class="highlight-down">${Number.isFinite(item.download) ? item.download.toFixed(2) : '--'}</strong>`;

        const tdUp = document.createElement('td');
        tdUp.innerHTML = `<strong class="highlight-up">${Number.isFinite(item.upload) ? item.upload.toFixed(2) : '--'}</strong>`;

        const tdPing = document.createElement('td');
        tdPing.textContent = Number.isFinite(item.ping) ? Math.round(item.ping) + ' ms' : '--';

        const tdISP = document.createElement('td');
        tdISP.textContent = item.isp || 'Unknown';

        tr.append(tdCheck, tdDate, tdDown, tdUp, tdPing, tdISP);
        tbody.appendChild(tr);
    });
}

// Theme Management
// Theme Management
const ThemeManager = {
    modes: ['system', 'light', 'dark', 'custom'],
    currentMode: 'system',

    init() {
        console.log("SpeedPulse: Initializing ThemeManager...");
        this.currentMode = localStorage.getItem('theme_mode') || 'system';
        console.log("SpeedPulse: Current Mode:", this.currentMode);
        this.apply();

        // Listen for system changes
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', () => {
            if (this.currentMode === 'system') this.apply();
        });

        // Toggle Listener
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.onclick = () => this.cycle();
            console.log("SpeedPulse: Theme toggle listener attached.");
        }
        
        // Studio Listeners
        const studioBtn = document.getElementById('theme-studio-btn');
        if (studioBtn) {
            console.log("SpeedPulse: Theme studio button found.");
            studioBtn.onclick = () => this.openStudio();
            
            const closeBtn = document.getElementById('close-studio-btn');
            if (closeBtn) closeBtn.onclick = () => this.closeStudio();
            
            const applyBtn = document.getElementById('apply-theme-btn');
            if (applyBtn) applyBtn.onclick = () => this.saveCustom();
            
            document.querySelectorAll('.mode-btn').forEach(btn => {
                btn.onclick = (e) => {
                    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                };
            });
        } else {
            console.warn("SpeedPulse: Theme studio button NOT found in DOM.");
        }
    },

    apply() {
        let themeToSet = this.currentMode;
        if (this.currentMode === 'system') {
            themeToSet = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', this.currentMode === 'custom' ? 'custom' : themeToSet);
        
        if (this.currentMode === 'custom') {
            this.injectCustomStyles();
        } else {
            this.removeCustomStyles();
        }

        this.updateIcons();
        if (typeof updateChartTheme === 'function') updateChartTheme();
    },

    cycle() {
        const idx = this.modes.indexOf(this.currentMode);
        this.currentMode = this.modes[(idx + 1) % this.modes.length];
        localStorage.setItem('theme_mode', this.currentMode);
        this.apply();
    },

    updateIcons() {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        btn.querySelectorAll('svg').forEach(svg => svg.classList.add('hidden'));
        const activeIcon = btn.querySelector(`.theme-icon-${this.currentMode}`);
        if (activeIcon) activeIcon.classList.remove('hidden');
    },

    openStudio() {
        const modal = document.getElementById('theme-studio-modal');
        if (!modal) return;
        
        const config = JSON.parse(localStorage.getItem('custom_theme_config') || '{"accent1":"#00f2fe","accent2":"#4facfe","base":"dark"}');
        (document.getElementById('accent-1') as HTMLInputElement).value = config.accent1;
        (document.getElementById('accent-2') as HTMLInputElement).value = config.accent2;
        
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        const baseBtn = document.getElementById(`base-mode-${config.base}`);
        if (baseBtn) baseBtn.classList.add('active');
        
        modal.classList.remove('hidden');
    },

    closeStudio() {
        const modal = document.getElementById('theme-studio-modal');
        if (modal) modal.classList.add('hidden');
    },

    saveCustom() {
        const activeModeBtn = document.querySelector('.mode-btn.active');
        if (!activeModeBtn) return;
        
        const config = {
            accent1: (document.getElementById('accent-1') as HTMLInputElement).value,
            accent2: (document.getElementById('accent-2') as HTMLInputElement).value,
            base: activeModeBtn.id.replace('base-mode-', '')
        };
        localStorage.setItem('custom_theme_config', JSON.stringify(config));
        this.currentMode = 'custom';
        localStorage.setItem('theme_mode', 'custom');
        this.apply();
        this.closeStudio();
    },

    injectCustomStyles() {
        const config = JSON.parse(localStorage.getItem('custom_theme_config') || '{"accent1":"#00f2fe","accent2":"#4facfe","base":"dark"}');
        let styleTag = document.getElementById('custom-theme-style');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'custom-theme-style';
            document.head.appendChild(styleTag);
        }

        const isDark = config.base === 'dark';
        styleTag.innerHTML = `
            :root[data-theme="custom"] {
                --bg-base: ${isDark ? '#030712' : '#f0f2f5'};
                --bg-glass: ${isDark ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.7), rgba(17, 24, 39, 0.3))' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.65))'};
                --text-primary: ${isDark ? '#f8fafc' : '#0f172a'};
                --text-secondary: ${isDark ? '#94a3b8' : '#475569'};
                --accent-primary: ${config.accent1};
                --accent-secondary: ${config.accent2};
                --border-glass: ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)'};
                --card-shadow: ${isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)' : '0 20px 40px -10px rgba(0, 0, 0, 0.05)'};
            }
        `;
    },

    removeCustomStyles() {
        const styleTag = document.getElementById('custom-theme-style');
        if (styleTag) styleTag.remove();
    }
};

function initTheme() {
    ThemeManager.init();
}

// Sound Handling
function initSound() {
    const muted = localStorage.getItem('sound_muted') === 'true';
    if (muted) document.body.classList.add('sound-muted');

    soundToggle.addEventListener('click', () => {
        const isMuted = document.body.classList.toggle('sound-muted');
        localStorage.setItem('sound_muted', isMuted);
    });
}

// Share Handling (html2canvas)
async function shareResult() {
    shareBtn.textContent = 'Generating...';
    try {
        const element = document.getElementById('capture-area');
        const canvas = await html2canvas(element, {
            backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#0f172a' : '#f1f5f9',
            scale: 2
        });

        canvas.toBlob(async (blob) => {
            const filesArray = [new File([blob], 'speedpulse-result.png', { type: 'image/png' })];

            if (navigator.canShare && navigator.canShare({ files: filesArray })) {
                try {
                    await navigator.share({
                        title: 'SpeedPulse Result',
                        text: 'Check out my internet speed on SpeedPulse!',
                        files: filesArray
                    });
                } catch (e) {
                    console.log('Share canceled or failed', e);
                }
            } else {
                // Fallback: download image
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'speedpulse-result.png';
                a.click();
                URL.revokeObjectURL(url);
            }
        });
    } catch (e) {
        console.error("Error generating image", e);
        alert("Failed to generate image.");
    } finally {
        shareBtn.textContent = 'Share Result';
    }
}

// Compare Handling
function compareResults() {
    const checked = Array.from(document.querySelectorAll('.history-checkbox:checked'));
    if (checked.length !== 2) {
        alert("Please select exactly two results to compare.");
        return;
    }

    const history = getHistory();
    const res1 = history[checked[0].value];
    const res2 = history[checked[1].value];

    const modal = document.getElementById('compare-modal');
    const grid = document.getElementById('compare-grid');

    grid.innerHTML = `
        <div class="glass-panel" style="background:var(--hover-bg)">
            <h3>Result 1</h3>
            <p><strong>Date:</strong> ${new Date(res1.date).toLocaleDateString()}</p>
            <p><strong>Download:</strong> ${res1.download?.toFixed(2)} Mbps</p>
            <p><strong>Upload:</strong> ${res1.upload?.toFixed(2)} Mbps</p>
            <p><strong>Ping:</strong> ${Math.round(res1.ping)} ms</p>
        </div>
        <div class="glass-panel" style="background:var(--hover-bg)">
            <h3>Result 2</h3>
            <p><strong>Date:</strong> ${new Date(res2.date).toLocaleDateString()}</p>
            <p><strong>Download:</strong> ${res2.download?.toFixed(2)} Mbps</p>
            <p><strong>Upload:</strong> ${res2.upload?.toFixed(2)} Mbps</p>
            <p><strong>Ping:</strong> ${Math.round(res2.ping)} ms</p>
        </div>
    `;

    modal.classList.remove('hidden');
}

// Unit Change
(document.getElementById('unit-select') as HTMLSelectElement).addEventListener('change', () => {
    // Re-format currently displayed values if test is finished
    if (!isTesting && valDown.textContent !== '--') {
        const history = getHistory();
        if (history.length > 0) {
            const last = history[0];
            valDown.textContent = formatSpeed(last.download, ((document.getElementById('unit-select') as HTMLSelectElement)).value);
            valUp.textContent = Number.isFinite(last.upload) ? formatSpeed(last.upload, ((document.getElementById('unit-select') as HTMLSelectElement)).value) : '--';
            updateGauge(last.download);
        }
    }
    document.querySelectorAll('.unit-label').forEach(el => el.textContent = ((document.getElementById('unit-select') as HTMLSelectElement)).value);
});


// Test-profile selector is persisted separately from measured history.
const profileSelect = document.getElementById('test-profile-select') as HTMLSelectElement;
const budgetNote = document.getElementById('profile-budget-note');
function showProfileBudget(): void {
    const chosen = getTestProfile(profileSelect.value);
    const totalMiB = (chosen.downloadBytes + chosen.uploadBytes) / (1024 * 1024);
    if (budgetNote) budgetNote.textContent =
        chosen.id + ': about ' + totalMiB + ' MiB payload per test (plus network overhead).';
}
profileSelect.value = loadTestProfile().id;
showProfileBudget();
profileSelect.addEventListener('change', () => {
    saveTestProfile(profileSelect.value);
    showProfileBudget();
});

// Event Listeners
startBtn.addEventListener('click', startTest);
stopBtn.addEventListener('click', stopCurrentTest);
shareBtn.addEventListener('click', shareResult);
document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);
document.getElementById('clear-history-btn').addEventListener('click', () => {
    if (confirm("Clear all history?")) {
        clearHistory();
        renderHistory();
    }
});
document.getElementById('compare-btn').addEventListener('click', compareResults);
document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('compare-modal').classList.add('hidden');
});
document.getElementById('select-all-history')!.addEventListener('change', (e) => {
    document.querySelectorAll('.history-checkbox').forEach(cb => (cb as HTMLInputElement).checked = (e.target as HTMLInputElement).checked);
});

// Init PWA Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js?v=7.0').catch(console.error);
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Programmatic Cache & SW Reset on Version Update
    const CURRENT_VERSION = '6.0';
    const lastVersion = localStorage.getItem('app_version');
    if (lastVersion !== CURRENT_VERSION) {
        console.log(`SpeedPulse: Version update detected (${lastVersion} -> ${CURRENT_VERSION}). Clearing caches & Service Workers...`);
        
        // 1. Unregister all service workers
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (let registration of registrations) {
              if (registration.scope === new URL('./', window.location.href).href) registration.unregister();
            }
            });
        }
        
        // 2. Delete all caches
        if ('caches' in window) {
            caches.keys().then(names => {
                for (let name of names) {
              if (name.startsWith('speedpulse-')) caches.delete(name);
            }
            });
        }
        
        localStorage.setItem('app_version', CURRENT_VERSION);
        console.log("SpeedPulse: Caches and Service Workers cleared. Reloading page...");
        setTimeout(() => {
            window.location.reload(true);
        }, 500);
        return;
    }

    console.log("SpeedPulse: Starting Safe Boot...");
    
    // 1. Theme (Critical)
    try { initTheme(); } catch(e) { console.error("Theme Error:", e); }
    
    // 2. Sound (Non-critical)
    try { initSound(); } catch(e) { console.error("Sound Error:", e); }
    
    // 3. Chart (Non-critical, often fails if CDN blocked)
    try { initChart();
    } catch(e) { console.error("Chart Error:", e); }
    
    // 4. Data Fetching (Non-critical)
    try { fetchConnectionDetails(); } catch(e) { console.error("ISP Fetch Error:", e); }
    
    // 5. History (Non-critical)
    try { renderHistory(); } catch(e) { console.error("History Error:", e); }
    
    console.log("SpeedPulse: Safe Boot complete.");
});
