// developer.ts
// The project of the open source internet speed checker. (Source available at the GitHub via this link:- https://github.com/sanskarIN/SpeedPulse)
// ------------------------------------------------------------------------------------------------------
// Developer Options Logic - SpeedPulse PRO LABS
// ------------------------------------------------------------------------------------------------------

function initDevConsole() {
    const logContainer = document.getElementById("dev-log-container");
    const clearLogBtn = document.getElementById("dev-clear-log");

    setTimeout(
        () => addLog("[BOOT] Initializing Advanced Diagnostics...", "info"),
        100,
    );
    setTimeout(() => addLog("[BOOT] Injecting Telemetry Hooks...", "info"), 300);
    setTimeout(
        () => addLog("[BOOT] Sandbox Ready. Awaiting engine events.", "success"),
        600,
    );

    function addLog(
        message: string,
        type: "info" | "warn" | "error" | "success" = "info",
    ) {
        if (!logContainer) return;
        const div = document.createElement("div");
        div.className = `log-entry log-${type}`;

        const now = new Date();
        const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now.getMilliseconds().toString().padStart(3, "0")}`;

        div.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
        logContainer.appendChild(div);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = function (...args) {
        addLog(args.join(" "), "info");
        originalLog.apply(console, args);
    };
    console.warn = function (...args) {
        addLog(args.join(" "), "warn");
        originalWarn.apply(console, args);
    };
    console.error = function (...args) {
        addLog(args.join(" "), "error");
        originalError.apply(console, args);
    };

    if (clearLogBtn) {
        clearLogBtn.addEventListener("click", () => {
            if (logContainer) logContainer.innerHTML = "";
            addLog("[SYSTEM] Telemetry buffer flushed.", "info");
        });
    }
}

let fpsEnabled = false;

function initAdvancedDevControls() {
    const throttleEnabled = document.getElementById(
        "dev-throttle-enabled",
    ) as HTMLInputElement;
    const throttleDown = document.getElementById(
        "dev-throttle-down",
    ) as HTMLInputElement;
    const throttleUp = document.getElementById(
        "dev-throttle-up",
    ) as HTMLInputElement;
    const injectJitter = document.getElementById(
        "dev-inject-jitter",
    ) as HTMLInputElement;
    const packetLoss = document.getElementById(
        "dev-packet-loss",
    ) as HTMLInputElement;
    const bypassCache = document.getElementById(
        "dev-bypass-cache",
    ) as HTMLInputElement;
    const spoofCores = document.getElementById(
        "dev-spoof-cores",
    ) as HTMLSelectElement;
    const fpsToggle = document.getElementById(
        "dev-fps-toggle",
    ) as HTMLInputElement;

    const savedSettings = JSON.parse(
        localStorage.getItem("speedpulse_dev_settings") || "{}",
    );
    if (throttleEnabled)
        throttleEnabled.checked = savedSettings.throttleEnabled || false;
    if (throttleDown) throttleDown.value = savedSettings.throttleDown || "100";
    if (throttleUp) throttleUp.value = savedSettings.throttleUp || "50";
    if (injectJitter) injectJitter.value = savedSettings.injectJitter || "0";
    if (packetLoss) packetLoss.value = savedSettings.packetLoss || "0";
    if (bypassCache) bypassCache.checked = savedSettings.bypassCache !== false;
    if (spoofCores) spoofCores.value = savedSettings.spoofCores || "default";
    if (fpsToggle) fpsToggle.checked = savedSettings.fpsEnabled || false;

    fpsEnabled = savedSettings.fpsEnabled || false;
    updateFPSVisibility();

    function saveSettings() {
        const settings = {
            throttleEnabled: throttleEnabled?.checked,
            throttleDown: throttleDown?.value,
            throttleUp: throttleUp?.value,
            injectJitter: injectJitter?.value,
            packetLoss: packetLoss?.value,
            bypassCache: bypassCache?.checked,
            spoofCores: spoofCores?.value,
            fpsEnabled: fpsToggle?.checked,
        };
        localStorage.setItem("speedpulse_dev_settings", JSON.stringify(settings));
        console.log("[CONFIG] Advanced settings mutated to disk.");

        fpsEnabled = !!fpsToggle?.checked;
        updateFPSVisibility();
    }

    [
        throttleEnabled,
        throttleDown,
        throttleUp,
        injectJitter,
        packetLoss,
        bypassCache,
        spoofCores,
        fpsToggle,
    ].forEach((el) => {
        if (el) el.addEventListener("change", saveSettings);
    });

    document
        .getElementById("dev-clear-storage")
        ?.addEventListener("click", () => {
            if (confirm("WARNING: Nuking localStorage. Proceed?")) {
                localStorage.clear();
                console.error("[STORAGE] LocalStorage destroyed.");
                saveSettings();
                refreshStateInspector();
            }
        });

    document.getElementById("dev-clear-sw")?.addEventListener("click", () => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
                regs.forEach((r) => r.unregister());
                console.warn("[SW] Terminated all Service Workers.");
            });
        }
    });

    document
        .getElementById("dev-refresh-state")
        ?.addEventListener("click", refreshStateInspector);

    document
        .getElementById("dev-stress-confetti")
        ?.addEventListener("click", () => {
            console.warn("[GPU] Initiating 10,000 particle stress test...");
            spawnStressConfetti(10000);
        });

    document.getElementById("dev-crash-webgl")?.addEventListener("click", () => {
        console.error(
            "[GPU] Simulating WebGL context loss... (Not implemented in 2D context)",
        );
        const canvas = document.getElementById(
            "confetti-canvas",
        ) as HTMLCanvasElement;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    });

    refreshStateInspector();
    startFPSCounter();
}

function refreshStateInspector() {
    const inspector = document.getElementById("dev-state-inspector");
    if (!inspector) return;

    const state: any = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
            try {
                state[key] = JSON.parse(localStorage.getItem(key) || "");
            } catch (e) {
                state[key] = localStorage.getItem(key);
            }
        }
    }

    inspector.textContent = JSON.stringify(state, null, 2) || "{}";
}

function updateFPSVisibility() {
    const fpsDiv = document.getElementById("dev-fps-counter");
    if (fpsDiv) fpsDiv.style.display = fpsEnabled ? "block" : "none";
}

function startFPSCounter() {
    const fpsDiv = document.getElementById("dev-fps-counter");
    if (!fpsDiv) return;

    let lastTime = performance.now();
    let frames = 0;

    function loop() {
        const now = performance.now();
        frames++;
        if (now >= lastTime + 1000) {
            const fps = Math.round((frames * 1000) / (now - lastTime));
            fpsDiv!.textContent = `${fps} FPS`;
            if (fps < 30) fpsDiv!.style.color = "#ef4444";
            else if (fps < 50) fpsDiv!.style.color = "#f59e0b";
            else fpsDiv!.style.color = "#10b981";

            frames = 0;
            lastTime = now;
        }
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

function spawnStressConfetti(count: number) {
    const canvas = document.getElementById(
        "confetti-canvas",
    ) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        });
    }

    let frames = 0;
    function render() {
        if (frames > 120) {
            ctx!.clearRect(0, 0, canvas.width, canvas.height);
            console.info("[GPU] Stress test completed.");
            return;
        }
        ctx!.clearRect(0, 0, canvas.width, canvas.height);
        for (let p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            ctx!.fillStyle = p.color;
            ctx!.fillRect(p.x, p.y, 3, 3);
        }
        frames++;
        requestAnimationFrame(render);
    }
    render();
}

function initExtremeFeatures() {
    const spoofGps = document.getElementById("dev-spoof-gps");
    if (spoofGps)
        spoofGps.addEventListener("change", () =>
            console.log("[SENSOR] GPS Spoofed"),
        );

    const themeBtns = document.querySelectorAll(".theme-apply-btn");
    themeBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const target = e.currentTarget as HTMLElement;
            const primary = target.getAttribute("data-primary");
            const secondary = target.getAttribute("data-secondary");
            const bg = target.getAttribute("data-bg");
            const glass = target.getAttribute("data-glass");

            const styleId = "dev-theme-override";
            let styleEl = document.getElementById(styleId);
            if (!styleEl) {
                styleEl = document.createElement("style");
                styleEl.id = styleId;
                document.head.appendChild(styleEl);
            }

            styleEl.textContent = `
                :root { 
                    --bg-dark: ${bg} !important; 
                    --glass-bg: ${glass} !important; 
                    --accent-1: ${primary} !important; 
                    --accent-2: ${secondary} !important; 
                } 
                body { 
                    background-color: ${bg} !important; 
                    background-image: none !important; 
                }`;
            console.log(
                `[THEME ENGINE] Applied theme: Primary(${primary}), BG(${bg})`,
            );
        });
    });

    document
        .getElementById("dev-trigger-memory-leak")
        ?.addEventListener("click", () => {
            console.error(
                "[MEMORY] Simulating fatal V8 Engine Memory Leak threshold exceeded. Heap size > 1.2GB.",
            );
        });

    document
        .getElementById("dev-run-benchmark")
        ?.addEventListener("click", () => {
            console.warn("[BENCHMARK] Running CPU Crypto sequence...");
            const start = performance.now();
            let hash = 0;
            for (let i = 0; i < 10000000; i++) {
                hash = (hash << 5) - hash + i;
                hash |= 0;
            }
            const end = performance.now();
            console.info(
                `[BENCHMARK] Crypto sequence completed in ${(end - start).toFixed(2)}ms. Hash Output: ${hash}`,
            );
        });
}

document.addEventListener("DOMContentLoaded", () => {
    initDevConsole();
    initAdvancedDevControls();
    initExtremeFeatures();

    // Doomsday & Outages
    const outage503 = document.getElementById(
        "dev-outage-503",
    ) as HTMLInputElement;
    const corsFail = document.getElementById("dev-cors-fail") as HTMLInputElement;

    if (outage503)
        outage503.addEventListener("change", () => {
            if (outage503.checked)
                console.error(
                    "[DOOMSDAY] Global HTTP 503 Outage Simulation ENGAGED. All pipeline fetch requests will artificially collapse.",
                );
            else console.info("[DOOMSDAY] Outage simulation disengaged.");
        });

    if (corsFail)
        corsFail.addEventListener("change", () => {
            if (corsFail.checked)
                console.warn(
                    "[SECURITY] CORS Preflight strictly blocked. Simulating Origin failure.",
                );
        });

    document.getElementById("dev-nuke-cdn")?.addEventListener("click", () => {
        console.error(
            "[CRITICAL] CDN Edge Nodes forcefully unmapped from internal DNS lookup table. Traffic blackholed.",
        );
    });

    document.getElementById("dev-reroute-bgp")?.addEventListener("click", () => {
        console.info(
            "[BGP] Calculating alternative network trajectory via internal routing table...",
        );
        setTimeout(
            () =>
                console.info(
                    "[BGP] Trajectory stabilized. Edge node re-acquired via secondary ISP link.",
                ),
            1500,
        );
    });

    // Service Worker Cache Sandbox
    const cacheInspector = document.getElementById("dev-cache-inspector");

    document
        .getElementById("dev-inspect-cache")
        ?.addEventListener("click", async () => {
            if (!("caches" in window)) return;
            try {
                const cacheKeys = await caches.keys();
                if (cacheKeys.length === 0) {
                    if (cacheInspector) cacheInspector.textContent = "No Caches Found.";
                    return;
                }
                let out = "";
                for (let key of cacheKeys) {
                    out += `CACHE NODE: ${key}\n`;
                    const cache = await caches.open(key);
                    const reqs = await cache.keys();
                    reqs.forEach((req) => (out += `  -> ${req.url}\n`));
                }
                if (cacheInspector) cacheInspector.textContent = out;
                console.info("[CACHE API] Successfully crawled cache registries.");
            } catch (e) {
                console.error("[CACHE API] Extraction failed.", e);
            }
        });

    document
        .getElementById("dev-nuke-cache")
        ?.addEventListener("click", async () => {
            if (!("caches" in window)) return;
            const cacheKeys = await caches.keys();
            for (let key of cacheKeys) {
                await caches.delete(key);
            }
            if (cacheInspector)
                cacheInspector.textContent = "All caches strictly purged.";
            console.warn("[CACHE API] Completely purged Service Worker storage.");
        });

    document
        .getElementById("dev-seed-cache")
        ?.addEventListener("click", async () => {
            if (!("caches" in window)) return;
            try {
                const devCache = await caches.open("speedpulse-dev-sandbox-v1");
                const data = new Blob(
                    ['{"status": "simulated_offline", "code": 200}'],
                    { type: "application/json" },
                );
                await devCache.put("/api/simulated_offline_check", new Response(data));
                if (cacheInspector)
                    cacheInspector.textContent =
                        "Dummy payload seeded at '/api/simulated_offline_check' in cache 'speedpulse-dev-sandbox-v1'.";
                console.info("[CACHE API] Offline injection successful.");
            } catch (e) {
                console.error("[CACHE API] Seed fault.", e);
            }
        });

    // Packet Animation logic
    setInterval(() => {
        const packets = document.querySelectorAll(".data-packet");
        packets.forEach((p: any) => {
            let left = parseFloat(p.style.left || "0");
            left += 5;
            if (left > 40) left = 0;
            p.style.left = left + "px";
        });
    }, 50);
});
// The code ends here.
