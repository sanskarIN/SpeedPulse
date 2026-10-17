// SpeedPulse Developer Diagnostics v1.0 release candidate.
// Runs on the Developer Labs page. Read-only probes are limited to the
// self-hosted same-origin ASP.NET Core API; simulations never change real tests.
(function () {
  "use strict";

  var report = {
    schemaVersion: 1,
    generatedAt: null,
    backend: { status: "not-checked" },
    latency: null,
    simulation: null,
    capabilities: null
  };
  var activeController = null;
  var running = false;
  var labels = {};
  var maxSamples = 5;

  function text(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = String(value);
  }

  function setStatus(id, value, kind) {
    var node = document.getElementById(id);
    if (!node) return;
    node.textContent = value;
    node.dataset.status = kind || "neutral";
  }

  function isStaticHosting() {
    return location.protocol === "file:" || location.hostname.endsWith(".github.io");
  }

  function capabilities() {
    return {
      secureContext: window.isSecureContext === true,
      serviceWorker: "serviceWorker" in navigator,
      cacheStorage: "caches" in window,
      localStorage: storageAvailable(),
      fetch: typeof fetch === "function",
      performanceTiming: typeof performance !== "undefined",
      connectionEstimate: Boolean(navigator.connection)
    };
  }

  function storageAvailable() {
    try {
      var key = "__speedpulse_test__";
      localStorage.setItem(key, "1");
      localStorage.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function record() {
    report.generatedAt = new Date().toISOString();
    report.capabilities = capabilities();
  }

  async function getJSON(path, signal) {
    var response = await fetch(path, { method: "GET", cache: "no-store", signal: signal });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json();
  }

  async function checkBackend() {
    if (running) return;
    if (isStaticHosting()) {
      report.backend = { status: "static", note: "ASP.NET endpoints do not run on GitHub Pages." };
      setStatus("spd-backend", "Static website — ASP.NET not available", "neutral");
      text("spd-backend-detail", "Use dotnet run locally to test the ASP.NET diagnostics API.");
      return;
    }
    running = true;
    activeController = new AbortController();
    var timeout = setTimeout(function () { activeController?.abort(); }, 4000);
    setStatus("spd-backend", "Checking local API…", "neutral");
    try {
      var health = await getJSON("/api/health", activeController.signal);
      if (health.service !== "SpeedPulseBackend" || health.status !== "ok") {
        throw new Error("This server is not the SpeedPulse backend");
      }
      var config = await getJSON("/api/config", activeController.signal);
      report.backend = {
        status: "online",
        version: String(health.version || "unknown"),
        mode: String(health.mode || "self-hosted"),
        maxDownloadBytes: Number(config.maxDownloadBytes) || null,
        maxUploadBytes: Number(config.maxUploadBytes) || null,
        rateLimitPerMinute: Number(config.rateLimitRequestsPerMinute) || null
      };
      setStatus("spd-backend", "ASP.NET Core online", "success");
      text("spd-backend-detail", "v" + report.backend.version +
        " • download cap " + formatMiB(report.backend.maxDownloadBytes) +
        " • upload cap " + formatMiB(report.backend.maxUploadBytes) +
        " • limit " + report.backend.rateLimitPerMinute + " requests/min");
    } catch (error) {
      report.backend = { status: "unavailable", note: "No compatible local API found." };
      setStatus("spd-backend", "Local API unavailable", "warning");
      text("spd-backend-detail", "Health check could not complete: " + friendlyError(error));
    } finally {
      clearTimeout(timeout);
      running = false;
      activeController = null;
      record();
    }
  }

  function friendlyError(error) {
    if (error && error.name === "AbortError") return "request cancelled or timed out";
    return error instanceof Error ? error.message : "unknown error";
  }

  function formatMiB(bytes) {
    return bytes == null ? "n/a" : (bytes / 1048576).toFixed(0) + " MiB";
  }

  async function probeLatency() {
    if (running) return;
    if (isStaticHosting()) {
      setStatus("spd-latency", "Unavailable on GitHub Pages", "warning");
      return;
    }
    running = true;
    activeController = new AbortController();
    var signal = activeController.signal;
    var elapsed = [];
    var failed = 0;
    var samples = maxSamples;
    setStatus("spd-latency", "Measuring same-origin HTTP latency…", "neutral");
    try {
      for (var i = 0; i < samples; i++) {
        if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
        var timeoutId = setTimeout(function () { activeController?.abort(); }, 3500);
        var start = performance.now();
        try {
          var response = await fetch("/api/down?bytes=0&probe=" + i + "&t=" + Date.now(), {
            method: "GET",
            cache: "no-store",
            signal: signal
          });
          if (!response.ok) throw new Error("HTTP " + response.status);
          elapsed.push(performance.now() - start);
        } catch (error) {
          if (signal.aborted) throw error;
          failed += 1;
        } finally {
          clearTimeout(timeoutId);
        }
      }
      if (!elapsed.length) throw new Error("Every probe failed");
      var mean = elapsed.reduce(function (a, b) { return a + b; }, 0) / elapsed.length;
      var delta = 0;
      for (var j = 1; j < elapsed.length; j++) delta += Math.abs(elapsed[j] - elapsed[j - 1]);
      var jitter = elapsed.length > 1 ? delta / (elapsed.length - 1) : 0;
      report.latency = {
        measurement: "HTTP request duration, not ICMP ping",
        successful: elapsed.length,
        failed: failed,
        averageMs: Number(mean.toFixed(2)),
        jitterMs: Number(jitter.toFixed(2)),
        failedSamplePercent: (failed / samples) * 100
      };
      setStatus("spd-latency", mean.toFixed(1) + " ms average", "success");
      text("spd-latency-detail", "Jitter " + jitter.toFixed(1) +
        " ms • " + failed + "/" + samples + " HTTP samples failed. Not IP packet loss.");
    } catch (error) {
      setStatus("spd-latency", "Probe not completed", "warning");
      text("spd-latency-detail", friendlyError(error));
    } finally {
      running = false;
      activeController = null;
      record();
    }
  }

  function simulate() {
    var jitter = clamp(document.getElementById("spd-jitter").value, 0, 200);
    var failure = clamp(document.getElementById("spd-failure").value, 0, 100);
    var offline = Boolean(document.getElementById("dev-force-offline")?.checked);
    if (offline) failure = 100;
    var throttle = Boolean(document.getElementById("dev-throttle-enabled")?.checked);
    var downCap = throttle ? clamp(document.getElementById("dev-throttle-down")?.value, 1, 10000) : null;
    var upCap = throttle ? clamp(document.getElementById("dev-throttle-up")?.value, 1, 10000) : null;
    var wsDrops = Boolean(document.getElementById("dev-wss-drops")?.checked);
    var wsLatency = clamp(document.getElementById("dev-wss-latency")?.value, 0, 5000);
    var durations = [];
    var failed = 0;
    for (var i = 0; i < 20; i++) {
      if (Math.random() * 100 < failure) {
        failed++;
      } else {
        durations.push(20 + Math.random() * jitter);
      }
    }
    var average = durations.length ?
      durations.reduce(function (a, b) { return a + b; }, 0) / durations.length : null;
    report.simulation = {
      simulated: true,
      configuredJitterMs: jitter,
      configuredFailurePercent: failure,
      simulatedOffline: offline,
      downCapMbps: downCap,
      upCapMbps: upCap,
      mockWebSocket: { connected: !wsDrops, delayMs: wsLatency },
      successful: durations.length,
      failed: failed,
      averageMs: average == null ? null : Number(average.toFixed(2))
    };
    setStatus("spd-simulation", "Simulation only: " + failed + "/20 failed", "neutral");
    text("spd-simulation-detail", "Synthetic average " +
      (average == null ? "n/a" : average.toFixed(1) + " ms") +
      (offline ? ". Offline preview active." : "") +
      (throttle ? ". Mock cap: down " + downCap + " Mbps, up " + upCap + " Mbps." : "") +
      (wsDrops ? ". Mock WebSocket disconnected." : ". Mock WebSocket delay " + wsLatency + " ms.") +
      " No requests were sent or real connection settings changed.");
    record();
  }

  async function clearAppCaches() {
    if (!("caches" in window)) {
      setStatus("spd-cache", "Cache API unavailable", "warning");
      return;
    }
    var cacheKeys = await caches.keys();
    var appKeys = cacheKeys.filter(function (key) { return key.startsWith("speedpulse-"); });
    if (!appKeys.length) {
      setStatus("spd-cache", "No SpeedPulse cache entries", "neutral");
      return;
    }
    if (!confirm("Delete " + appKeys.length + " SpeedPulse cache(s)? Other app caches will remain untouched.")) return;
    await Promise.all(appKeys.map(function (key) { return caches.delete(key); }));
    setStatus("spd-cache", "Deleted " + appKeys.length + " SpeedPulse cache(s)", "success");
  }

  function clearAppPreferences() {
    if (!storageAvailable()) {
      setStatus("spd-cache", "Local storage unavailable", "warning");
      return;
    }
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && (key.startsWith("speedpulse_") || key.startsWith("speedpulse-"))) keys.push(key);
    }
    if (!keys.length) {
      setStatus("spd-cache", "No SpeedPulse-prefixed preferences found", "neutral");
      return;
    }
    if (!confirm("Delete " + keys.length + " SpeedPulse-prefixed preference key(s)?")) return;
    keys.forEach(function (key) { localStorage.removeItem(key); });
    setStatus("spd-cache", "Cleared " + keys.length + " SpeedPulse preference(s)", "success");
  }

  function stop() {
    if (activeController) activeController.abort();
    setStatus("spd-latency", "Stopped", "neutral");
  }

  function exportReport() {
    record();
    // No IP address, browser storage contents or test history are included.
    var blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "speedpulse-diagnostics.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    setStatus("spd-export", "Diagnostic report saved", "success");
  }

  function wireLegacySimulators() {
    // The original controls are simulation inputs, not real browser/network overrides.
    var mappings = [
      ["dev-inject-jitter", "spd-jitter", "spd-jitter-value", 200],
      ["dev-packet-loss", "spd-failure", "spd-failure-value", 100]
    ];
    mappings.forEach(function (pair) {
      var legacy = document.getElementById(pair[0]);
      var slider = document.getElementById(pair[1]);
      if (!legacy || !slider) return;
      var sync = function () {
        var value = clamp(legacy.value, 0, pair[3]);
        slider.value = String(value);
        text(pair[2], value);
      };
      legacy.addEventListener("input", sync);
      legacy.addEventListener("change", sync);
      sync();
    });

    var gps = document.getElementById("dev-spoof-gps");
    var latitude = document.getElementById("dev-gps-lat");
    var longitude = document.getElementById("dev-gps-lng");
    if (gps && latitude && longitude) {
      var preview = document.createElement("div");
      preview.className = "spd-status";
      preview.setAttribute("role", "status");
      preview.style.fontSize = ".8rem";
      gps.closest(".dev-panel")?.appendChild(preview);
      var updateGPS = function () {
        var lat = Number(latitude.value);
        var lon = Number(longitude.value);
        if (!gps.checked) preview.textContent = "GPS preview disabled; real location unchanged.";
        else if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
          preview.textContent = "Enter valid latitude and longitude for preview.";
        else preview.textContent = "Mock coordinates: " + lat.toFixed(4) + ", " + lon.toFixed(4) + " (simulation only)";
      };
      [gps, latitude, longitude].forEach(function (el) {
        el.addEventListener("change", updateGPS);
        el.addEventListener("input", updateGPS);
      });
      updateGPS();
    }

    var observeToggle = document.getElementById("dev-dom-observer");
    if (observeToggle && typeof MutationObserver === "function") {
      var observer = null;
      var count = 0;
      var summary = document.createElement("span");
      summary.className = "spd-note";
      observeToggle.closest(".setting-row")?.appendChild(summary);
      observeToggle.addEventListener("change", function () {
        if (observer) { observer.disconnect(); observer = null; }
        if (!observeToggle.checked) {
          summary.textContent = " DOM observation stopped";
          return;
        }
        count = 0;
        // Watch a small diagnostics subtree, never the entire large developer page.
        var root = document.getElementById("speedpulse-diagnostics");
        if (!root) return;
        observer = new MutationObserver(function (mutations) {
          count += mutations.length;
          summary.textContent = " " + count + " diagnostics DOM changes observed";
        });
        observer.observe(root, { childList: true, subtree: true, characterData: true });
        summary.textContent = " Watching diagnostic updates";
      });
    }
  }

  function init() {
    if (document.getElementById("speedpulse-diagnostics")) return;
    var css = document.createElement("style");
    css.textContent =
      "#speedpulse-diagnostics{max-width:1200px;margin:22px auto;padding:24px;border-radius:18px;background:#111d33;color:#e5edf8;border:1px solid #52627e;font:15px/1.5 system-ui,sans-serif;position:relative;z-index:2}" +
      "#speedpulse-diagnostics h2{margin:0 0 8px;font-size:1.5rem;color:#e5edf8}" +
      "#speedpulse-diagnostics p{margin:0 0 14px;color:#b3c4da}" +
      ".spd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:14px}" +
      ".spd-card{padding:16px;background:#1a2944;border-radius:12px;border:1px solid #415574}" +
      ".spd-card h3{margin:0 0 8px;color:#f4f7fc;font-size:1rem}" +
      ".spd-status{font-weight:700;color:#edf3ff;margin-bottom:8px}" +
      ".spd-status[data-status=success]{color:#79e0b3}" +
      ".spd-status[data-status=warning]{color:#ffd18d}" +
      ".spd-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}" +
      "#speedpulse-diagnostics button{padding:9px 12px;border:1px solid #728eb9;border-radius:8px;background:#294975;color:#fff;cursor:pointer;font:inherit}" +
      "#speedpulse-diagnostics button:hover{background:#355d93}" +
      "#speedpulse-diagnostics button:focus-visible,#speedpulse-diagnostics input:focus-visible{outline:3px solid #ffdc80;outline-offset:2px}" +
      "#speedpulse-diagnostics label{display:block;margin:9px 0;color:#d6e6f8}" +
      "#speedpulse-diagnostics input[type=range]{width:100%;accent-color:#5dbdeb}" +
      "#speedpulse-diagnostics .spd-note{font-size:.86rem;color:#c8d7eb}";
    document.head.appendChild(css);
    var panel = document.createElement("section");
    panel.id = "speedpulse-diagnostics";
    panel.setAttribute("aria-label", "SpeedPulse developer diagnostics");
    // Only constant HTML appears here. Dynamic responses are assigned as textContent.
    panel.innerHTML =
      '<h2>Developer Diagnostics</h2>' +
      '<p>Real read-only ASP.NET checks and isolated simulations. These controls do not spoof GPS, change Internet routing, or modify real speed-test results.</p>' +
      '<div class="spd-grid">' +
      '<div class="spd-card"><h3>ASP.NET Core backend</h3><div id="spd-backend" class="spd-status" role="status">Not checked</div><p id="spd-backend-detail" class="spd-note">Local backend diagnostics only.</p><div class="spd-actions"><button id="spd-check-backend" type="button">Check backend</button></div></div>' +
      '<div class="spd-card"><h3>HTTP latency probe</h3><div id="spd-latency" class="spd-status" role="status">Not measured</div><p id="spd-latency-detail" class="spd-note">Five short, same-origin API requests; this is not ICMP ping.</p><div class="spd-actions"><button id="spd-run-probe" type="button">Run 5 probes</button><button id="spd-stop" type="button">Cancel</button></div></div>' +
      '<div class="spd-card"><h3>Isolated network simulation</h3><label>Added jitter (ms): <output id="spd-jitter-value">25</output><input id="spd-jitter" type="range" min="0" max="200" value="25"></label><label>Simulated HTTP failure (%): <output id="spd-failure-value">10</output><input id="spd-failure" type="range" min="0" max="100" value="10"></label><div id="spd-simulation" class="spd-status" role="status">Not simulated</div><p id="spd-simulation-detail" class="spd-note">Runs locally with synthetic samples.</p><button id="spd-run-simulation" type="button">Simulate 20 samples</button></div>' +
      '<div class="spd-card"><h3>Local diagnostics & report</h3><div id="spd-capabilities" class="spd-status">Inspecting browser…</div><p class="spd-note">Reports exclude IP address, storage contents and history.</p><div id="spd-cache" class="spd-status" role="status"></div><div id="spd-export" class="spd-status" role="status"></div><div class="spd-actions"><button id="spd-clear-caches" type="button">Clear SpeedPulse caches</button><button id="spd-clear-prefs" type="button">Clear SpeedPulse preferences</button><button id="spd-export-report" type="button">Export JSON report</button></div></div>' +
      '</div>';
    var main = document.querySelector("main");
    if (main && main.parentNode) main.parentNode.insertBefore(panel, main);
    else document.body.insertBefore(panel, document.body.firstChild);
    report.capabilities = capabilities();
    text("spd-capabilities", Object.entries(report.capabilities).filter(function (entry) { return entry[1]; }).length +
      " / " + Object.keys(report.capabilities).length + " browser capabilities available");
    document.getElementById("spd-check-backend").addEventListener("click", checkBackend);
    document.getElementById("spd-run-probe").addEventListener("click", probeLatency);
    document.getElementById("spd-stop").addEventListener("click", stop);
    document.getElementById("spd-run-simulation").addEventListener("click", simulate);
    document.getElementById("spd-clear-caches").addEventListener("click", function () {
      clearAppCaches().catch(function (e) { setStatus("spd-cache", friendlyError(e), "warning"); });
    });
    document.getElementById("spd-clear-prefs").addEventListener("click", clearAppPreferences);
    document.getElementById("spd-export-report").addEventListener("click", exportReport);
    ["spd-jitter", "spd-failure"].forEach(function (name) {
      document.getElementById(name).addEventListener("input", function (event) {
        text(name + "-value", event.target.value);
      });
    });
    wireLegacySimulators();
    checkBackend();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
