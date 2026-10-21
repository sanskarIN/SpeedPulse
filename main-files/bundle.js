(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/utils.ts
  function formatSpeed(mbps, unit = "Mbps") {
    if (isNaN(mbps) || mbps === null) return "0.00";
    let val = parseFloat(mbps);
    switch (unit) {
      case "MB/s":
        val = val / 8;
        break;
      case "Gbps":
        val = val / 1e3;
        break;
      default:
        break;
    }
    return val.toFixed(2);
  }
  function playSound(type) {
    if (document.body.classList.contains("sound-muted")) return;
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (type === "start") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === "finish") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.15);
      osc.frequency.setValueAtTime(783.99, now + 0.3);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05);
      gainNode.gain.setValueAtTime(0.1, now + 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  }
  function calculateGrade(down, up, ping) {
    if (!down || !up || !ping) return { grade: "-", text: "Incomplete test" };
    let score = 0;
    if (down > 500) score += 40;
    else if (down > 100) score += 30;
    else if (down > 25) score += 20;
    else if (down > 10) score += 10;
    if (up > 100) score += 30;
    else if (up > 20) score += 20;
    else if (up > 5) score += 10;
    if (ping < 20) score += 30;
    else if (ping < 50) score += 20;
    else if (ping < 100) score += 10;
    if (score >= 90) return { grade: "A+", text: "Incredible speed. Perfect for 8K streaming and pro gaming." };
    if (score >= 80) return { grade: "A", text: "Excellent. Great for 4K streaming and heavy use." };
    if (score >= 70) return { grade: "B", text: "Good. Handles HD video calls and regular use well." };
    if (score >= 50) return { grade: "C", text: "Fair. Might struggle with multiple 4K streams." };
    if (score >= 30) return { grade: "D", text: "Slow. Basic web browsing and SD video only." };
    return { grade: "F", text: "Very poor. Connection is severely degraded." };
  }
  function fireConfetti() {
    if (confettiActive) return;
    confettiActive = true;
    const canvas = document.getElementById("confetti-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2 + 100,
        r: Math.random() * 6 + 2,
        dx: Math.random() * 20 - 10,
        dy: Math.random() * -20 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngle: 0,
        tiltAngleInc: Math.random() * 0.07 + 0.05
      });
    }
    let frameId;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let activeParticles = 0;
      particles.forEach((p) => {
        p.tiltAngle += p.tiltAngleInc;
        p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle) * 2;
        p.dy += 0.5;
        p.x += p.dx;
        p.y += p.dy;
        if (p.y <= canvas.height) {
          activeParticles++;
          ctx.beginPath();
          ctx.lineWidth = p.r;
          ctx.strokeStyle = p.color;
          ctx.moveTo(p.x + p.tilt + p.r, p.y);
          ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
          ctx.stroke();
        }
      });
      if (activeParticles > 0) {
        frameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confettiActive = false;
      }
    }
    render();
  }
  var audioCtx, confettiActive;
  var init_utils = __esm({
    "src/utils.ts"() {
      audioCtx = null;
      confettiActive = false;
    }
  });

  // src/dashboard-chart.ts
  function textColor() {
    const theme = document.documentElement.getAttribute("data-theme");
    if (theme === "dark") return "#94a3b8";
    if (theme !== "custom") return "#475569";
    try {
      const raw = localStorage.getItem("custom_theme_config") || '{"base":"dark"}';
      const config = JSON.parse(raw);
      if (config && typeof config === "object" && "base" in config) {
        return config.base === "light" ? "#475569" : "#94a3b8";
      }
    } catch {
    }
    return "#94a3b8";
  }
  function initChart() {
    if (chart) return;
    try {
      const element = document.getElementById("speedChart");
      if (!element || typeof Chart === "undefined") return;
      const context = element.getContext("2d");
      if (!context) return;
      Chart.defaults.color = textColor();
      chart = new Chart(context, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Download",
              data: download,
              borderColor: "#06b6d4",
              backgroundColor: "rgba(6, 182, 212, 0.1)",
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointRadius: 0
            },
            {
              label: "Upload",
              data: upload,
              borderColor: "#8b5cf6",
              backgroundColor: "rgba(139, 92, 246, 0.1)",
              borderWidth: 2,
              tension: 0.4,
              fill: false,
              // Fetch supplies one upload sample only after server ACK.
              // Draw its real point rather than fabricating a line.
              pointRadius: 4,
              pointHoverRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 0 },
          scales: {
            x: { display: false },
            y: { beginAtZero: true, grid: { color: "rgba(150, 150, 150, 0.1)" } }
          },
          plugins: { legend: { display: false } }
        }
      });
    } catch (error) {
      chart = null;
      console.warn("[SpeedPulse] Optional bandwidth chart unavailable:", error);
    }
  }
  function updateChartTheme() {
    if (!chart || typeof Chart === "undefined") return;
    try {
      const color = textColor();
      Chart.defaults.color = color;
      if (chart.options.scales?.x?.ticks) chart.options.scales.x.ticks.color = color;
      if (chart.options.scales?.y?.ticks) chart.options.scales.y.ticks.color = color;
      chart.update();
    } catch (error) {
      console.warn("[SpeedPulse] Chart theme update skipped:", error);
    }
  }
  function addChartPoint(value, isDownload) {
    if (!Number.isFinite(value) || value < 0) return;
    labels.push((/* @__PURE__ */ new Date()).toLocaleTimeString());
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
      console.warn("[SpeedPulse] Optional chart update skipped:", error);
    }
  }
  function clearChart() {
    labels.length = 0;
    download.length = 0;
    upload.length = 0;
    try {
      chart?.update();
    } catch (error) {
      console.warn("[SpeedPulse] Optional chart clearing skipped:", error);
    }
  }
  var MAX_SAMPLES, labels, download, upload, chart;
  var init_dashboard_chart = __esm({
    "src/dashboard-chart.ts"() {
      MAX_SAMPLES = 50;
      labels = [];
      download = [];
      upload = [];
      chart = null;
    }
  });

  // src/readiness.ts
  function valid(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }
  function check(values, passes) {
    return values.every(valid) ? passes() ? "pass" : "fail" : "unknown";
  }
  function calculateReadiness(metrics) {
    const { download: download2, upload: upload2, ping, jitter } = metrics;
    return {
      streaming4K: check([download2], () => download2 > 25),
      videoCalls: check(
        [download2, upload2, ping],
        () => download2 > 10 && upload2 > 3 && ping < 100
      ),
      gaming: check(
        [download2, ping, jitter],
        () => download2 > 25 && ping < 50 && jitter < 10
      ),
      largeUploads: check([upload2], () => upload2 > 20)
    };
  }
  var READINESS_ORDER;
  var init_readiness = __esm({
    "src/readiness.ts"() {
      READINESS_ORDER = [
        "streaming4K",
        "videoCalls",
        "gaming",
        "largeUploads"
      ];
    }
  });

  // src/speedtest.ts
  function resolveServer(server) {
    return server === "local" && isFileProtocol ? "cloudflare" : server;
  }
  function assertBytes(bytes, max) {
    if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > max) {
      throw new RangeError(`Test payload must be between 1 and ${max} bytes`);
    }
  }
  function assertTimeout(ms, max) {
    if (!Number.isSafeInteger(ms) || ms < 1 || ms > max) {
      throw new RangeError(`Request timeout must be between 1 and ${max} ms`);
    }
  }
  function cancelled() {
    return new DOMException("Speed test cancelled", "AbortError");
  }
  function withDeadline(stage, timeoutMs, work) {
    const request = new AbortController();
    activeController = request;
    return new Promise((resolve, reject) => {
      let settled = false;
      let timedOut = false;
      let timer;
      const cleanup = () => {
        if (timer !== void 0) clearTimeout(timer);
        request.signal.removeEventListener("abort", onAbort);
        if (activeController === request) activeController = null;
      };
      const finish = (success, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (success) resolve(value);
        else reject(value);
      };
      const onAbort = () => finish(
        false,
        timedOut ? new MeasurementTimeoutError(stage, timeoutMs) : cancelled()
      );
      request.signal.addEventListener("abort", onAbort, { once: true });
      timer = setTimeout(() => {
        timedOut = true;
        request.abort();
      }, timeoutMs);
      try {
        work(request.signal).then(
          (value) => finish(true, value),
          (error) => finish(false, error)
        );
      } catch (error) {
        finish(false, error);
      }
    });
  }
  function safeProgress(onProgress, value, signal, completedFraction) {
    if (signal.aborted) throw cancelled();
    try {
      onProgress(value, completedFraction);
    } catch (error) {
      console.warn("[SpeedPulse] Ignoring presentation callback error:", error);
    }
  }
  function abortTest() {
    const current = activeController;
    activeController = null;
    current?.abort();
  }
  function explainTestError(error, stage, server) {
    if (error instanceof MeasurementTimeoutError) {
      return `${stage} timed out after ${Math.ceil(error.timeoutMs / 1e3)} seconds. Try Quick mode or another endpoint.`;
    }
    if (error instanceof Error && error.name === "AbortError") return "Test cancelled.";
    const message = error instanceof Error ? error.message : "";
    if (/HTTP 429\b/.test(message)) return "The test endpoint is rate-limiting requests (HTTP 429). Try again later.";
    if (/HTTP 413\b/.test(message)) return "The selected payload exceeds the server limit (HTTP 413). Try Quick mode.";
    if (/HTTP 5\d\d\b/.test(message)) return `${stage} failed because the server returned an error. Try again later.`;
    if (error instanceof TypeError) return `${stage} could not reach the ${server === "local" ? "ASP.NET Core" : "Cloudflare"} endpoint. Check connectivity or browser restrictions.`;
    return `${stage} could not be measured. Check the selected server and retry.`;
  }
  async function runPingTest(selectedServer = "cloudflare", onProgress = () => {
  }, probeTimeoutMs = LATENCY_TIMEOUT_MS) {
    assertTimeout(probeTimeoutMs, LATENCY_TIMEOUT_MS);
    const server = resolveServer(selectedServer);
    const target = ENDPOINTS[server].down;
    const iterations = 10;
    const readings = [];
    let failed = 0;
    for (let i = 0; i < iterations; i++) {
      try {
        const elapsed = await withDeadline("ping", probeTimeoutMs, async (signal) => {
          const start = performance.now();
          const response = await fetch(`${target}?bytes=0&cb=${Date.now()}_${i}`, {
            method: "GET",
            signal,
            cache: "no-store"
          });
          if (!response.ok) throw new Error(`HTTP ${response.status} during latency probe`);
          const duration = performance.now() - start;
          safeProgress(onProgress, duration, signal);
          return duration;
        });
        readings.push(elapsed);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") throw error;
        failed++;
      }
    }
    if (!readings.length) throw new Error("All latency probes failed");
    const ping = readings.reduce((a, b) => a + b, 0) / readings.length;
    let variation = 0;
    for (let i = 1; i < readings.length; i++) {
      variation += Math.abs(readings[i] - readings[i - 1]);
    }
    return {
      ping,
      jitter: readings.length > 1 ? variation / (readings.length - 1) : 0,
      packetLoss: failed / iterations * 100
    };
  }
  async function runDownloadTest(selectedServer = "cloudflare", onProgress = () => {
  }, bytes = 25 * 1024 * 1024, timeoutMs = DOWNLOAD_TIMEOUT_MS) {
    assertBytes(bytes, MAX_DOWNLOAD_BYTES);
    assertTimeout(timeoutMs, DOWNLOAD_TIMEOUT_MS);
    const server = resolveServer(selectedServer);
    const target = ENDPOINTS[server].down;
    return withDeadline("download", timeoutMs, async (signal) => {
      const start = performance.now();
      let received = 0;
      const response = await fetch(`${target}?bytes=${bytes}&cb=${Date.now()}`, {
        signal,
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
      if (!response.body) throw new Error("Streaming download unavailable");
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (signal.aborted) throw cancelled();
          if (done) break;
          received += value.byteLength;
          const seconds2 = (performance.now() - start) / 1e3;
          if (seconds2 > 0.1) safeProgress(onProgress, received * 8 / 1e6 / seconds2, signal, Math.min(1, received / bytes));
        }
      } finally {
        if (signal.aborted) {
          void reader.cancel().catch(() => {
          });
        }
      }
      if (received !== bytes) {
        throw new Error(`Incomplete download: expected ${bytes} bytes, received ${received}`);
      }
      const seconds = (performance.now() - start) / 1e3;
      const measured = seconds > 0 ? received * 8 / 1e6 / seconds : 0;
      safeProgress(onProgress, measured, signal, 1);
      return measured;
    });
  }
  async function runUploadTest(selectedServer = "cloudflare", onProgress = () => {
  }, bytes = 5 * 1024 * 1024, timeoutMs = UPLOAD_TIMEOUT_MS) {
    assertBytes(bytes, MAX_UPLOAD_BYTES);
    assertTimeout(timeoutMs, UPLOAD_TIMEOUT_MS);
    const server = resolveServer(selectedServer);
    const target = ENDPOINTS[server].up;
    const buffer = new Uint8Array(bytes);
    for (let i = 0; i < buffer.length; i++) buffer[i] = Math.random() * 256;
    const body = new Blob([buffer], { type: "text/plain" });
    const uploadUrl = server === "cloudflare" ? `${target}?bytes=${bytes}` : target;
    return withDeadline("upload", timeoutMs, async (signal) => {
      const start = performance.now();
      const response = await fetch(uploadUrl, {
        method: "POST",
        body,
        mode: "cors",
        signal
      });
      if (!response.ok) throw new Error(`Upload failed: HTTP ${response.status}`);
      const seconds = (performance.now() - start) / 1e3;
      const measured = seconds > 0 ? bytes * 8 / 1e6 / seconds : 0;
      safeProgress(onProgress, measured, signal);
      return measured;
    });
  }
  var MAX_DOWNLOAD_BYTES, MAX_UPLOAD_BYTES, LATENCY_TIMEOUT_MS, DOWNLOAD_TIMEOUT_MS, UPLOAD_TIMEOUT_MS, ENDPOINTS, MeasurementTimeoutError, activeController, isFileProtocol;
  var init_speedtest = __esm({
    "src/speedtest.ts"() {
      MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024;
      MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
      LATENCY_TIMEOUT_MS = 8e3;
      DOWNLOAD_TIMEOUT_MS = 9e4;
      UPLOAD_TIMEOUT_MS = 9e4;
      ENDPOINTS = {
        local: { down: "/api/down", up: "/api/up" },
        cloudflare: {
          down: "https://speed.cloudflare.com/__down",
          up: "https://speed.cloudflare.com/__up"
        }
      };
      MeasurementTimeoutError = class extends Error {
        constructor(stage, timeoutMs) {
          super(`${stage} exceeded its ${timeoutMs} ms deadline`);
          this.stage = stage;
          this.timeoutMs = timeoutMs;
          this.name = "MeasurementTimeoutError";
        }
      };
      activeController = null;
      isFileProtocol = typeof window !== "undefined" && window.location.protocol === "file:";
    }
  });

  // src/test-profiles.ts
  function getTestProfile(input) {
    if (typeof input === "string" && Object.prototype.hasOwnProperty.call(TEST_PROFILES, input)) {
      return TEST_PROFILES[input];
    }
    return TEST_PROFILES[DEFAULT_TEST_PROFILE];
  }
  function loadTestProfile() {
    try {
      return getTestProfile(localStorage.getItem(STORAGE_KEY));
    } catch {
      return TEST_PROFILES[DEFAULT_TEST_PROFILE];
    }
  }
  function saveTestProfile(input) {
    const profile = getTestProfile(input);
    try {
      localStorage.setItem(STORAGE_KEY, profile.id);
    } catch {
    }
    return profile;
  }
  function effectiveTestBudget(profile, limits) {
    if (!limits) return { downloadBytes: profile.downloadBytes, uploadBytes: profile.uploadBytes };
    const safeDownloadLimit = Number.isSafeInteger(limits.maxDownloadBytes) && limits.maxDownloadBytes >= 1 ? limits.maxDownloadBytes : profile.downloadBytes;
    const safeUploadLimit = Number.isSafeInteger(limits.maxUploadBytes) && limits.maxUploadBytes >= 1 ? limits.maxUploadBytes : profile.uploadBytes;
    return {
      downloadBytes: Math.min(profile.downloadBytes, safeDownloadLimit),
      uploadBytes: Math.min(profile.uploadBytes, safeUploadLimit)
    };
  }
  var TEST_PROFILES, DEFAULT_TEST_PROFILE, STORAGE_KEY;
  var init_test_profiles = __esm({
    "src/test-profiles.ts"() {
      TEST_PROFILES = Object.freeze({
        quick: Object.freeze({
          id: "quick",
          label: "Quick \u2022 5 MiB down + 1 MiB up",
          downloadBytes: 5 * 1024 * 1024,
          uploadBytes: 1 * 1024 * 1024
        }),
        standard: Object.freeze({
          id: "standard",
          label: "Standard \u2022 25 MiB down + 5 MiB up",
          downloadBytes: 25 * 1024 * 1024,
          uploadBytes: 5 * 1024 * 1024
        }),
        thorough: Object.freeze({
          id: "thorough",
          label: "Thorough \u2022 50 MiB down + 8 MiB up",
          downloadBytes: 50 * 1024 * 1024,
          uploadBytes: 8 * 1024 * 1024
        })
      });
      DEFAULT_TEST_PROFILE = "standard";
      STORAGE_KEY = "speedpulse_test_profile";
    }
  });

  // src/history.ts
  function cleanNumber(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : void 0;
  }
  function cleanEntry(input) {
    if (!input || typeof input !== "object") return null;
    const item = input;
    if (typeof item.id !== "string" || item.id.length > 100 || typeof item.date !== "string" || !Number.isFinite(Date.parse(item.date))) {
      return null;
    }
    return {
      id: item.id,
      date: item.date,
      isp: typeof item.isp === "string" ? item.isp.slice(0, 200) : "Unknown",
      profile: ["quick", "standard", "thorough"].includes(String(item.profile)) ? String(item.profile) : void 0,
      download: cleanNumber(item.download),
      upload: cleanNumber(item.upload),
      ping: cleanNumber(item.ping),
      jitter: cleanNumber(item.jitter),
      packetLoss: cleanNumber(item.packetLoss)
    };
  }
  function getHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY2);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES).map(cleanEntry).filter((item) => item !== null) : [];
    } catch {
      return [];
    }
  }
  function saveResult(result) {
    const now = /* @__PURE__ */ new Date();
    const candidate = cleanEntry({
      ...result,
      id: String(now.getTime()) + "-" + Math.random().toString(36).slice(2, 8),
      date: now.toISOString()
    });
    if (!candidate) return getHistory();
    const history = [candidate, ...getHistory()].slice(0, MAX_ENTRIES);
    try {
      localStorage.setItem(STORAGE_KEY2, JSON.stringify(history));
    } catch {
    }
    return history;
  }
  function clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY2);
    } catch {
    }
    return [];
  }
  function csvCell(value) {
    const raw = value == null ? "" : String(value);
    const safe = /^[=+@\-\t\r]/.test(raw) ? "'" + raw : raw;
    return '"' + safe.replace(/"/g, '""') + '"';
  }
  function exportToCSV() {
    const history = getHistory();
    if (!history.length) return;
    const header = [
      "Date",
      "Download (Mbps)",
      "Upload (Mbps)",
      "Ping (ms)",
      "Jitter (ms)",
      "ISP",
      "Profile",
      "Status"
    ];
    const rows = history.map((item) => [
      item.date,
      item.download?.toFixed(2) ?? "",
      item.upload?.toFixed(2) ?? "",
      item.ping?.toFixed(0) ?? "",
      item.jitter?.toFixed(0) ?? "",
      item.isp ?? "Unknown",
      item.profile ?? "legacy",
      item.upload == null ? "Partial" : "Complete"
    ]);
    const csvContent = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `speedpulse_history_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  var STORAGE_KEY2, MAX_ENTRIES;
  var init_history = __esm({
    "src/history.ts"() {
      STORAGE_KEY2 = "speedpulse_history";
      MAX_ENTRIES = 50;
    }
  });

  // src/script.ts
  var require_script = __commonJS({
    "src/script.ts"() {
      init_utils();
      init_dashboard_chart();
      init_readiness();
      init_speedtest();
      init_test_profiles();
      init_history();
      var startBtn = document.getElementById("start-btn");
      var stopBtn = document.getElementById("stop-btn");
      var shareBtn = document.getElementById("share-btn");
      var themeToggle = document.getElementById("theme-toggle");
      var soundToggle = document.getElementById("sound-toggle");
      var gaugeSpeed = document.getElementById("gauge-speed");
      var gaugePhase = document.getElementById("gauge-phase");
      var gaugePath = document.getElementById("gauge-path");
      var valPing = document.getElementById("val-ping");
      var valJitter = document.getElementById("val-jitter");
      var valDown = document.getElementById("val-down");
      var valUp = document.getElementById("val-up");
      var progDown = document.getElementById("prog-down");
      var downloadProgressLabel = document.getElementById("download-progress-label");
      var progUp = document.getElementById("prog-up");
      var isTesting = false;
      var testGeneration = 0;
      var currentPhase = "idle";
      function setGaugePhase(phase) {
        gaugePhase.textContent = phase;
        currentPhase = phase;
        if (phase === "ping" || phase === "download" || phase === "upload") {
          document.body.classList.add("testing-active");
        } else {
          document.body.classList.remove("testing-active");
        }
      }
      function updateGauge(value) {
        gaugeSpeed.textContent = formatSpeed(value, document.getElementById("unit-select").value);
        let pct = Math.min(Math.max(value / 1e3, 0), 1);
        pct = Math.pow(pct, 0.5);
        gaugePath.style.strokeDashoffset = 283 - 283 * pct;
      }
      async function startTest() {
        if (isTesting) return;
        isTesting = true;
        const runId = ++testGeneration;
        const ensureActive = () => {
          if (!isTesting || runId !== testGeneration) {
            throw new DOMException("Speed test cancelled", "AbortError");
          }
        };
        startBtn.classList.add("hidden");
        stopBtn.classList.remove("hidden");
        shareBtn.classList.add("hidden");
        valPing.textContent = "--";
        valJitter.textContent = "--";
        valDown.textContent = "--";
        valUp.textContent = "--";
        progDown.style.width = "0%";
        progDown.setAttribute("aria-valuenow", "0");
        if (downloadProgressLabel) downloadProgressLabel.textContent = "0%";
        progUp.style.width = "0%";
        updateGauge(0);
        clearChart();
        document.getElementById("overall-grade").textContent = "-";
        document.getElementById("grade-desc").textContent = "Testing in progress...";
        document.querySelectorAll(".status-indicator").forEach((el) => el.className = "status-indicator");
        try {
          playSound("start");
        } catch (error) {
          console.warn("Audio notification skipped:", error);
        }
        const server = document.getElementById("server-select").value;
        const profile = getTestProfile(document.getElementById("test-profile-select").value);
        const serverLimits = server === "local" ? window.speedpulseServerLimits : null;
        const budget = effectiveTestBudget(profile, serverLimits);
        let activeStage = "ping";
        const finalResult = { isp: document.getElementById("info-isp").textContent, profile: profile.id };
        try {
          setGaugePhase("Finding Optimal Server...");
          gaugeSpeed.textContent = "...";
          await new Promise((resolve) => setTimeout(resolve, 800));
          ensureActive();
          setGaugePhase("Connecting...");
          await new Promise((resolve) => setTimeout(resolve, 800));
          activeStage = "ping";
          ensureActive();
          setGaugePhase("Ping Test");
          gaugeSpeed.textContent = "...";
          const { ping, jitter, packetLoss } = await runPingTest(server, (p) => {
            valPing.textContent = Math.round(p).toString();
          });
          valPing.textContent = Math.round(ping).toString();
          valJitter.textContent = Math.round(jitter).toString();
          finalResult.ping = ping;
          finalResult.jitter = jitter;
          finalResult.packetLoss = packetLoss;
          activeStage = "download";
          ensureActive();
          setGaugePhase("Download Test");
          let currentDown = 0;
          const finalDown = await runDownloadTest(server, (mbps, completedFraction) => {
            currentDown = mbps;
            if (typeof completedFraction === "number") {
              const percent = (Math.min(1, Math.max(0, completedFraction)) * 100).toFixed(1);
              progDown.style.width = percent + "%";
              progDown.setAttribute("aria-valuenow", percent);
              if (downloadProgressLabel) downloadProgressLabel.textContent = percent + "%";
            }
            updateGauge(mbps);
            valDown.textContent = formatSpeed(mbps, document.getElementById("unit-select").value);
            addChartPoint(mbps, true);
          }, budget.downloadBytes);
          valDown.textContent = formatSpeed(finalDown, document.getElementById("unit-select").value);
          progDown.style.width = "100%";
          progDown.setAttribute("aria-valuenow", "100");
          if (downloadProgressLabel) downloadProgressLabel.textContent = "100%";
          finalResult.download = finalDown;
          updateGauge(0);
          await new Promise((r) => setTimeout(r, 500));
          activeStage = "upload";
          ensureActive();
          setGaugePhase("Upload Test");
          let currentUp = 0;
          let finalUp = null;
          let uploadError = "";
          try {
            finalUp = await runUploadTest(server, (mbps) => {
              currentUp = mbps;
              updateGauge(mbps);
              valUp.textContent = formatSpeed(mbps, document.getElementById("unit-select").value);
              addChartPoint(mbps, false);
            }, budget.uploadBytes);
            valUp.textContent = formatSpeed(finalUp, document.getElementById("unit-select").value);
            progUp.style.width = "100%";
            finalResult.upload = finalUp;
          } catch (error) {
            if (error && error.name === "AbortError") throw error;
            uploadError = explainTestError(error, "upload", server);
            console.warn("[SpeedPulse] Upload measurement unavailable:", error);
            valUp.textContent = "--";
            progUp.style.width = "0%";
          }
          ensureActive();
          setGaugePhase("Finished");
          updateGauge(finalDown);
          const gradeObj = uploadError ? {
            grade: "-",
            text: "Partial result: download and ping measured; upload unavailable. " + uploadError
          } : calculateGrade(finalDown, finalUp, ping);
          document.getElementById("overall-grade").textContent = gradeObj.grade;
          document.getElementById("grade-desc").textContent = gradeObj.text;
          const indicators = document.querySelectorAll(".status-indicator");
          const readiness = calculateReadiness({ download: finalDown, upload: finalUp, ping, jitter });
          READINESS_ORDER.forEach((key, index) => {
            const indicator = indicators[index];
            if (!indicator) return;
            const status = readiness[key];
            indicator.className = "status-indicator" + (status === "unknown" ? "" : " status-" + status);
            indicator.setAttribute("aria-label", status === "unknown" ? "Not enough measured data" : status === "pass" ? "Likely suitable" : "May be unsuitable");
          });
          saveResult(finalResult);
          renderHistory();
          try {
            playSound("finish");
          } catch (error) {
            console.warn("Audio notification skipped:", error);
          }
          const history = getHistory();
          if (history.length > 1) {
            const previousBest = Math.max(...history.slice(1).map((h) => h.download || 0));
            if (finalDown > previousBest) {
              try {
                fireConfetti();
              } catch (error) {
                console.warn("Celebration animation skipped:", error);
              }
            }
          } else if (finalDown > 100) {
            try {
              fireConfetti();
            } catch (error) {
              console.warn("Celebration animation skipped:", error);
            }
          }
        } catch (e) {
          if (runId !== testGeneration) return;
          if (e.name !== "AbortError") {
            console.error(e);
            setGaugePhase("Error");
            if (activeStage === "download" && downloadProgressLabel) {
              downloadProgressLabel.textContent = "Incomplete";
            }
            document.getElementById("grade-desc").textContent = "Could not complete the test: " + explainTestError(e, activeStage, server);
          } else {
            setGaugePhase("Aborted");
          }
        } finally {
          if (runId !== testGeneration) return;
          isTesting = false;
          startBtn.classList.remove("hidden");
          startBtn.textContent = "Retry Test";
          stopBtn.classList.add("hidden");
          if (Number.isFinite(finalResult.download)) shareBtn.classList.remove("hidden");
          else shareBtn.classList.add("hidden");
        }
      }
      function stopCurrentTest() {
        if (!isTesting) return;
        testGeneration += 1;
        abortTest();
        isTesting = false;
        setGaugePhase("Aborted");
        updateGauge(0);
        progDown.setAttribute("aria-valuenow", "0");
        if (downloadProgressLabel) downloadProgressLabel.textContent = "Cancelled";
        startBtn.classList.remove("hidden");
        stopBtn.classList.add("hidden");
        shareBtn.classList.add("hidden");
      }
      async function fetchConnectionDetails() {
        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          document.getElementById("info-isp").textContent = data.org || "--";
          document.getElementById("info-ip").textContent = data.ip || "--";
          document.getElementById("info-loc").textContent = `${data.city}, ${data.country_name}`;
        } catch (e) {
          console.warn("Primary ISP fetch failed, trying fallback...", e);
          try {
            const res = await fetch("https://ipwho.is/");
            const data = await res.json();
            document.getElementById("info-isp").textContent = data.connection?.isp || "--";
            document.getElementById("info-ip").textContent = data.ip || "--";
            document.getElementById("info-loc").textContent = `${data.city}, ${data.country}`;
          } catch (e2) {
            document.getElementById("info-isp").textContent = "Unknown ISP";
          }
        }
        document.getElementById("info-browser").textContent = (function() {
          let ua = navigator.userAgent, tem, M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
          if (/trident/i.test(M[1])) {
            tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
            return "IE " + (tem[1] || "");
          }
          if (M[1] === "Chrome") {
            tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
            if (tem != null) return tem.slice(1).join(" ").replace("OPR", "Opera");
          }
          M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, "-?"];
          if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
          return M.join(" ");
        })();
        if (navigator.connection) {
          document.getElementById("info-type").textContent = navigator.connection.effectiveType || "--";
        }
      }
      function renderHistory() {
        const history = getHistory();
        const tbody = document.getElementById("history-body");
        tbody.innerHTML = "";
        if (history.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No tests run yet.</td></tr>';
          return;
        }
        history.forEach((item, index) => {
          const tr = document.createElement("tr");
          const tdCheck = document.createElement("td");
          const check2 = document.createElement("input");
          check2.type = "checkbox";
          check2.className = "history-checkbox";
          check2.value = index;
          tdCheck.appendChild(check2);
          const tdDate = document.createElement("td");
          tdDate.textContent = new Date(item.date).toLocaleDateString() + " " + new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const tdDown = document.createElement("td");
          tdDown.innerHTML = `<strong class="highlight-down">${Number.isFinite(item.download) ? item.download.toFixed(2) : "--"}</strong>`;
          const tdUp = document.createElement("td");
          tdUp.innerHTML = `<strong class="highlight-up">${Number.isFinite(item.upload) ? item.upload.toFixed(2) : "--"}</strong>`;
          const tdPing = document.createElement("td");
          tdPing.textContent = Number.isFinite(item.ping) ? Math.round(item.ping) + " ms" : "--";
          const tdISP = document.createElement("td");
          tdISP.textContent = item.isp || "Unknown";
          tr.append(tdCheck, tdDate, tdDown, tdUp, tdPing, tdISP);
          tbody.appendChild(tr);
        });
      }
      var ThemeManager = {
        modes: ["system", "light", "dark", "custom"],
        currentMode: "system",
        init() {
          console.log("SpeedPulse: Initializing ThemeManager...");
          this.currentMode = localStorage.getItem("theme_mode") || "system";
          console.log("SpeedPulse: Current Mode:", this.currentMode);
          this.apply();
          const mq = window.matchMedia("(prefers-color-scheme: dark)");
          mq.addEventListener("change", () => {
            if (this.currentMode === "system") this.apply();
          });
          const toggleBtn = document.getElementById("theme-toggle");
          if (toggleBtn) {
            toggleBtn.onclick = () => this.cycle();
            console.log("SpeedPulse: Theme toggle listener attached.");
          }
          const studioBtn = document.getElementById("theme-studio-btn");
          if (studioBtn) {
            console.log("SpeedPulse: Theme studio button found.");
            studioBtn.onclick = () => this.openStudio();
            const closeBtn = document.getElementById("close-studio-btn");
            if (closeBtn) closeBtn.onclick = () => this.closeStudio();
            const applyBtn = document.getElementById("apply-theme-btn");
            if (applyBtn) applyBtn.onclick = () => this.saveCustom();
            document.querySelectorAll(".mode-btn").forEach((btn) => {
              btn.onclick = (e) => {
                document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
                e.target.classList.add("active");
              };
            });
          } else {
            console.warn("SpeedPulse: Theme studio button NOT found in DOM.");
          }
        },
        apply() {
          let themeToSet = this.currentMode;
          if (this.currentMode === "system") {
            themeToSet = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
          }
          document.documentElement.setAttribute("data-theme", this.currentMode === "custom" ? "custom" : themeToSet);
          if (this.currentMode === "custom") {
            this.injectCustomStyles();
          } else {
            this.removeCustomStyles();
          }
          this.updateIcons();
          if (typeof updateChartTheme === "function") updateChartTheme();
        },
        cycle() {
          const idx = this.modes.indexOf(this.currentMode);
          this.currentMode = this.modes[(idx + 1) % this.modes.length];
          localStorage.setItem("theme_mode", this.currentMode);
          this.apply();
        },
        updateIcons() {
          const btn = document.getElementById("theme-toggle");
          if (!btn) return;
          btn.querySelectorAll("svg").forEach((svg) => svg.classList.add("hidden"));
          const activeIcon = btn.querySelector(`.theme-icon-${this.currentMode}`);
          if (activeIcon) activeIcon.classList.remove("hidden");
        },
        openStudio() {
          const modal = document.getElementById("theme-studio-modal");
          if (!modal) return;
          const config = JSON.parse(localStorage.getItem("custom_theme_config") || '{"accent1":"#00f2fe","accent2":"#4facfe","base":"dark"}');
          document.getElementById("accent-1").value = config.accent1;
          document.getElementById("accent-2").value = config.accent2;
          document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
          const baseBtn = document.getElementById(`base-mode-${config.base}`);
          if (baseBtn) baseBtn.classList.add("active");
          modal.classList.remove("hidden");
        },
        closeStudio() {
          const modal = document.getElementById("theme-studio-modal");
          if (modal) modal.classList.add("hidden");
        },
        saveCustom() {
          const activeModeBtn = document.querySelector(".mode-btn.active");
          if (!activeModeBtn) return;
          const config = {
            accent1: document.getElementById("accent-1").value,
            accent2: document.getElementById("accent-2").value,
            base: activeModeBtn.id.replace("base-mode-", "")
          };
          localStorage.setItem("custom_theme_config", JSON.stringify(config));
          this.currentMode = "custom";
          localStorage.setItem("theme_mode", "custom");
          this.apply();
          this.closeStudio();
        },
        injectCustomStyles() {
          const config = JSON.parse(localStorage.getItem("custom_theme_config") || '{"accent1":"#00f2fe","accent2":"#4facfe","base":"dark"}');
          let styleTag = document.getElementById("custom-theme-style");
          if (!styleTag) {
            styleTag = document.createElement("style");
            styleTag.id = "custom-theme-style";
            document.head.appendChild(styleTag);
          }
          const isDark = config.base === "dark";
          styleTag.innerHTML = `
            :root[data-theme="custom"] {
                --bg-base: ${isDark ? "#030712" : "#f0f2f5"};
                --bg-glass: ${isDark ? "linear-gradient(135deg, rgba(17, 24, 39, 0.7), rgba(17, 24, 39, 0.3))" : "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.65))"};
                --text-primary: ${isDark ? "#f8fafc" : "#0f172a"};
                --text-secondary: ${isDark ? "#94a3b8" : "#475569"};
                --accent-primary: ${config.accent1};
                --accent-secondary: ${config.accent2};
                --border-glass: ${isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.6)"};
                --card-shadow: ${isDark ? "0 25px 50px -12px rgba(0, 0, 0, 0.7)" : "0 20px 40px -10px rgba(0, 0, 0, 0.05)"};
            }
        `;
        },
        removeCustomStyles() {
          const styleTag = document.getElementById("custom-theme-style");
          if (styleTag) styleTag.remove();
        }
      };
      function initTheme() {
        ThemeManager.init();
      }
      function initSound() {
        const muted = localStorage.getItem("sound_muted") === "true";
        if (muted) document.body.classList.add("sound-muted");
        soundToggle.addEventListener("click", () => {
          const isMuted = document.body.classList.toggle("sound-muted");
          localStorage.setItem("sound_muted", isMuted);
        });
      }
      async function shareResult() {
        shareBtn.textContent = "Generating...";
        try {
          const element = document.getElementById("capture-area");
          const canvas = await html2canvas(element, {
            backgroundColor: document.documentElement.getAttribute("data-theme") === "dark" ? "#0f172a" : "#f1f5f9",
            scale: 2
          });
          canvas.toBlob(async (blob) => {
            const filesArray = [new File([blob], "speedpulse-result.png", { type: "image/png" })];
            if (navigator.canShare && navigator.canShare({ files: filesArray })) {
              try {
                await navigator.share({
                  title: "SpeedPulse Result",
                  text: "Check out my internet speed on SpeedPulse!",
                  files: filesArray
                });
              } catch (e) {
                console.log("Share canceled or failed", e);
              }
            } else {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "speedpulse-result.png";
              a.click();
              URL.revokeObjectURL(url);
            }
          });
        } catch (e) {
          console.error("Error generating image", e);
          alert("Failed to generate image.");
        } finally {
          shareBtn.textContent = "Share Result";
        }
      }
      function compareResults() {
        const checked = Array.from(document.querySelectorAll(".history-checkbox:checked"));
        if (checked.length !== 2) {
          alert("Please select exactly two results to compare.");
          return;
        }
        const history = getHistory();
        const res1 = history[checked[0].value];
        const res2 = history[checked[1].value];
        const modal = document.getElementById("compare-modal");
        const grid = document.getElementById("compare-grid");
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
        modal.classList.remove("hidden");
      }
      document.getElementById("unit-select").addEventListener("change", () => {
        if (!isTesting && valDown.textContent !== "--") {
          const history = getHistory();
          if (history.length > 0) {
            const last = history[0];
            valDown.textContent = formatSpeed(last.download, document.getElementById("unit-select").value);
            valUp.textContent = Number.isFinite(last.upload) ? formatSpeed(last.upload, document.getElementById("unit-select").value) : "--";
            updateGauge(last.download);
          }
        }
        document.querySelectorAll(".unit-label").forEach((el) => el.textContent = document.getElementById("unit-select").value);
      });
      var profileSelect = document.getElementById("test-profile-select");
      var budgetNote = document.getElementById("profile-budget-note");
      function showProfileBudget() {
        const chosen = getTestProfile(profileSelect.value);
        const totalMiB = (chosen.downloadBytes + chosen.uploadBytes) / (1024 * 1024);
        if (budgetNote) budgetNote.textContent = chosen.id + ": about " + totalMiB + " MiB payload per test (plus network overhead).";
      }
      profileSelect.value = loadTestProfile().id;
      showProfileBudget();
      profileSelect.addEventListener("change", () => {
        saveTestProfile(profileSelect.value);
        showProfileBudget();
      });
      startBtn.addEventListener("click", startTest);
      stopBtn.addEventListener("click", stopCurrentTest);
      shareBtn.addEventListener("click", shareResult);
      document.getElementById("export-csv-btn").addEventListener("click", exportToCSV);
      document.getElementById("clear-history-btn").addEventListener("click", () => {
        if (confirm("Clear all history?")) {
          clearHistory();
          renderHistory();
        }
      });
      document.getElementById("compare-btn").addEventListener("click", compareResults);
      document.getElementById("close-modal-btn").addEventListener("click", () => {
        document.getElementById("compare-modal").classList.add("hidden");
      });
      document.getElementById("select-all-history").addEventListener("change", (e) => {
        document.querySelectorAll(".history-checkbox").forEach((cb) => cb.checked = e.target.checked);
      });
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
          navigator.serviceWorker.register("sw.js?v=7.0").catch(console.error);
        });
      }
      document.addEventListener("DOMContentLoaded", () => {
        const CURRENT_VERSION = "6.0";
        const lastVersion = localStorage.getItem("app_version");
        if (lastVersion !== CURRENT_VERSION) {
          console.log(`SpeedPulse: Version update detected (${lastVersion} -> ${CURRENT_VERSION}). Clearing caches & Service Workers...`);
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
              for (let registration of registrations) {
                if (registration.scope === new URL("./", window.location.href).href) registration.unregister();
              }
            });
          }
          if ("caches" in window) {
            caches.keys().then((names) => {
              for (let name of names) {
                if (name.startsWith("speedpulse-")) caches.delete(name);
              }
            });
          }
          localStorage.setItem("app_version", CURRENT_VERSION);
          console.log("SpeedPulse: Caches and Service Workers cleared. Reloading page...");
          setTimeout(() => {
            window.location.reload(true);
          }, 500);
          return;
        }
        console.log("SpeedPulse: Starting Safe Boot...");
        try {
          initTheme();
        } catch (e) {
          console.error("Theme Error:", e);
        }
        try {
          initSound();
        } catch (e) {
          console.error("Sound Error:", e);
        }
        try {
          initChart();
        } catch (e) {
          console.error("Chart Error:", e);
        }
        try {
          fetchConnectionDetails();
        } catch (e) {
          console.error("ISP Fetch Error:", e);
        }
        try {
          renderHistory();
        } catch (e) {
          console.error("History Error:", e);
        }
        console.log("SpeedPulse: Safe Boot complete.");
      });
    }
  });
  require_script();
})();
