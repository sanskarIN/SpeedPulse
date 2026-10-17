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

  // src/speedtest.ts
  function abortTest() {
    if (controller) {
      controller.abort();
      controller = null;
    }
  }
  async function runPingTest(server = 'cloudflare', onProgress) {
    if (server === "local" && isFileProtocol) server = "cloudflare";
    controller = new AbortController();
    const target = ENDPOINTS[server].down;
    const iterations = 10;
    const pings = [];
    let failed = 0;
    for (let i = 0; i < iterations; i++) {
      if (controller.signal.aborted) throw new DOMException("Speed test cancelled", "AbortError");
      const start = performance.now();
      try {
        const response = await fetch(`${target}?bytes=0&cb=${Date.now()}_${i}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store"
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} during latency probe`);
        const duration = performance.now() - start;
        pings.push(duration);
        onProgress(duration);
      } catch (e) {
        if (e.name === "AbortError") throw e;
        failed++;
      }
    }
    if (pings.length === 0) throw new Error("Ping test failed completely");
    const avgPing = pings.reduce((a, b) => a + b, 0) / pings.length;
    let jitterSum = 0;
    for (let i = 1; i < pings.length; i++) {
      jitterSum += Math.abs(pings[i] - pings[i - 1]);
    }
    const jitter = pings.length > 1 ? jitterSum / (pings.length - 1) : 0;
    const packetLoss = failed / iterations * 100;
    return { ping: avgPing, jitter, packetLoss };
  }
  async function runDownloadTest(server = 'cloudflare', onProgress) {
    if (server === "local" && isFileProtocol) server = "cloudflare";
    controller = new AbortController();
    const target = ENDPOINTS[server].down;
    const bytesToDownload = 25 * 1024 * 1024;
    const url = `${target}?bytes=${bytesToDownload}&cb=${Date.now()}`;
    const startTime = performance.now();
    let loadedBytes = 0;
    try {
      const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Network response was not ok");
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        loadedBytes += value.length;
        const now = performance.now();
        const durationSec = (now - startTime) / 1e3;
        if (durationSec > 0.1) {
          const mbps = loadedBytes * 8 / (1024 * 1024) / durationSec;
          onProgress(mbps);
        }
      }
    } catch (e) {
      throw e;
    }
    const totalDurationSec = (performance.now() - startTime) / 1e3;
    return totalDurationSec > 0 ? loadedBytes * 8 / (1024 * 1024) / totalDurationSec : 0;
  }
  async function runUploadTest(server = "cloudflare", onProgress) {
    if (server === "local" && isFileProtocol) server = "cloudflare";
    controller = new AbortController();
    const target = ENDPOINTS[server].up;
    // Fetch does not expose upload byte progress; do not fabricate live measurements.
    const payloadSize = 5 * 1024 * 1024;
    const buffer = new Uint8Array(payloadSize);
    for (let i = 0; i < payloadSize; i++) buffer[i] = Math.random() * 255;
    const start = performance.now();
    // Cloudflare's upload API expects a bytes parameter; the local server ignores it.
    const uploadUrl = server === 'cloudflare' ? target + '?bytes=' + payloadSize : target;
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: new Blob([buffer], { type: "text/plain" }),
      mode: "cors",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Upload failed: HTTP ${response.status}`);
    const durationSec = (performance.now() - start) / 1e3;
    const measuredMbps = durationSec > 0 ? payloadSize * 8 / (1024 * 1024) / durationSec : 0;
    onProgress(measuredMbps);
    return measuredMbps;
  }
  var ENDPOINTS, isFileProtocol, controller;
  var init_speedtest = __esm({
    "src/speedtest.ts"() {
      ENDPOINTS = {
        local: {
          down: "/api/down",
          up: "/api/up"
        },
        cloudflare: {
          down: "https://speed.cloudflare.com/__down",
          up: "https://speed.cloudflare.com/__up"
        }
      };
      isFileProtocol = typeof window !== "undefined" && window.location.protocol === "file:";
      controller = null;
    }
  });

  // src/history.ts
  function getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load history", e);
      return [];
    }
  }
  function saveResult(result) {
    const history = getHistory();
    const entry = {
      id: Date.now().toString(),
      date: (/* @__PURE__ */ new Date()).toISOString(),
      ...result
    };
    history.unshift(entry);
    if (history.length > 50) history.length = 50;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history", e);
    }
    return history;
  }
  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
  function exportToCSV() {
    const history = getHistory();
    if (history.length === 0) return;
    const headers = ["Date", "Download (Mbps)", "Upload (Mbps)", "Ping (ms)", "Jitter (ms)", "ISP"];
    const rows = history.map((item) => [
      new Date(item.date).toLocaleString(),
      item.download?.toFixed(2) || "0",
      item.upload?.toFixed(2) || "0",
      Math.round(item.ping || 0),
      Math.round(item.jitter || 0),
      `"${item.isp || "Unknown"}"`
      // wrap in quotes to handle commas
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `speedpulse_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  var STORAGE_KEY;
  var init_history = __esm({
    "src/history.ts"() {
      STORAGE_KEY = "speedpulse_history";
    }
  });

  // src/script.ts
  var require_script = __commonJS({
    "src/script.ts"() {
      init_utils();
      init_speedtest();
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
      var progUp = document.getElementById("prog-up");
      var isTesting = false;
      var testGeneration = 0;
      var currentPhase = "idle";
      var speedChart = null;
      var chartDataDown = [];
      var chartDataUp = [];
      var chartLabels = [];
      function initChart() {
        try {
          const chartEl = document.getElementById("speedChart");
          if (!chartEl || typeof Chart === "undefined") {
            console.warn("SpeedPulse: Chart.js not loaded or canvas missing. Skipping chart.");
            return;
          }
          const ctx = chartEl.getContext("2d");
          const theme = document.documentElement.getAttribute("data-theme");
          let color = "#475569";
          if (theme === "dark") color = "#94a3b8";
          else if (theme === "custom") {
            const config = JSON.parse(localStorage.getItem("custom_theme_config") || '{"base":"dark"}');
            color = config.base === "dark" ? "#94a3b8" : "#475569";
          }
          Chart.defaults.color = color;
          speedChart = new Chart(ctx, {
            type: "line",
            data: {
              labels: chartLabels,
              datasets: [
                {
                  label: "Download",
                  data: chartDataDown,
                  borderColor: "#06b6d4",
                  backgroundColor: "rgba(6, 182, 212, 0.1)",
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true,
                  pointRadius: 0
                },
                {
                  label: "Upload",
                  data: chartDataUp,
                  borderColor: "#8b5cf6",
                  backgroundColor: "rgba(139, 92, 246, 0.1)",
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true,
                  pointRadius: 0
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 0 },
              // fast updates
              scales: {
                x: { display: false },
                y: {
                  beginAtZero: true,
                  grid: { color: "rgba(150, 150, 150, 0.1)" }
                }
              },
              plugins: { legend: { display: false } }
            }
          });
        } catch (e) {
          console.error("Chart initialization failed", e);
        }
      }
      function updateChartTheme() {
        if (speedChart) {
          const theme = document.documentElement.getAttribute("data-theme");
          let color = "#475569";
          if (theme === "dark") {
            color = "#94a3b8";
          } else if (theme === "custom") {
            try {
              const config = JSON.parse(localStorage.getItem("custom_theme_config") || '{"base":"dark"}');
              color = config.base === "dark" ? "#94a3b8" : "#475569";
            } catch (e) {
              color = "#94a3b8";
            }
          }
          Chart.defaults.color = color;
          if (speedChart.options.scales.x) speedChart.options.scales.x.ticks.color = color;
          if (speedChart.options.scales.y) speedChart.options.scales.y.ticks.color = color;
          speedChart.update();
        }
      }
      function addChartPoint(val, isDown) {
        const basePing = 15;
        const jitter = Math.random() * 5;
        const loadPing = basePing + jitter + (val > 0 ? 100 / val : 0);
        updateLatencyPoint(loadPing);
        if (!speedChart) return;
        const now = (/* @__PURE__ */ new Date()).toLocaleTimeString();
        chartLabels.push(now);
        if (isDown) {
          chartDataDown.push(val);
          chartDataUp.push(null);
        } else {
          chartDataDown.push(null);
          chartDataUp.push(val);
        }
        if (chartLabels.length > 50) {
          chartLabels.shift();
          chartDataDown.shift();
          chartDataUp.shift();
        }
        speedChart.update();
      }
      function clearChart() {
        chartLabels.length = 0;
        chartDataDown.length = 0;
        chartDataUp.length = 0;
        if (speedChart) speedChart.update();
      }
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
        progUp.style.width = "0%";
        updateGauge(0);
        clearChart();
        document.getElementById("overall-grade").textContent = "-";
        document.getElementById("grade-desc").textContent = "Testing in progress...";
        document.querySelectorAll(".status-indicator").forEach((el) => el.className = "status-indicator");
        playSound("start");
        const server = document.getElementById("server-select").value;
        const finalResult = { isp: document.getElementById("info-isp").textContent };
        try {
          setGaugePhase("Finding Optimal Server...");
          gaugeSpeed.textContent = "...";
          await new Promise((resolve) => setTimeout(resolve, 800));
          ensureActive();
          setGaugePhase("Connecting...");
          await new Promise((resolve) => setTimeout(resolve, 800));
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
          ensureActive();
          setGaugePhase("Download Test");
          let currentDown = 0;
          const finalDown = await runDownloadTest(server, (mbps) => {
            currentDown = mbps;
            updateGauge(mbps);
            valDown.textContent = formatSpeed(mbps, document.getElementById("unit-select").value);
            addChartPoint(mbps, true);
          });
          valDown.textContent = formatSpeed(finalDown, document.getElementById("unit-select").value);
          progDown.style.width = "100%";
          finalResult.download = finalDown;
          updateGauge(0);
          await new Promise((r) => setTimeout(r, 500));
          ensureActive();
          setGaugePhase("Upload Test");
          let currentUp = 0;
          const finalUp = await runUploadTest(server, (mbps) => {
            currentUp = mbps;
            updateGauge(mbps);
            valUp.textContent = formatSpeed(mbps, document.getElementById("unit-select").value);
            addChartPoint(mbps, false);
          });
          valUp.textContent = formatSpeed(finalUp, document.getElementById("unit-select").value);
          progUp.style.width = "100%";
          finalResult.upload = finalUp;
          ensureActive();
          setGaugePhase("Finished");
          updateGauge(finalDown);
          const gradeObj = calculateGrade(finalDown, finalUp, ping);
          document.getElementById("overall-grade").textContent = gradeObj.grade;
          document.getElementById("grade-desc").textContent = gradeObj.text;
          const inds = document.querySelectorAll(".status-indicator");
          inds[0].className = "status-indicator " + (finalDown > 25 ? "status-pass" : "status-fail");
          inds[1].className = "status-indicator " + (finalDown > 10 && finalUp > 3 && ping < 100 ? "status-pass" : "status-fail");
          inds[2].className = "status-indicator " + (finalDown > 25 && ping < 50 && jitter < 10 ? "status-pass" : "status-fail");
          inds[3].className = "status-indicator " + (finalUp > 20 ? "status-pass" : "status-fail");
          saveResult(finalResult);
          renderHistory();
          playSound("finish");
          const history = getHistory();
          if (history.length > 1) {
            const previousBest = Math.max(...history.slice(1).map((h) => h.download || 0));
            if (finalDown > previousBest) {
              fireConfetti();
            }
          } else if (finalDown > 100) {
            fireConfetti();
          }
        } catch (e) {
          if (runId !== testGeneration) return;
          if (e.name !== "AbortError") {
            console.error(e);
            setGaugePhase("Error");
            alert("Test failed. Please check your connection and try again.");
          } else {
            setGaugePhase("Aborted");
          }
        } finally {
          if (runId !== testGeneration) return;
          isTesting = false;
          startBtn.classList.remove("hidden");
          startBtn.textContent = "Retry Test";
          stopBtn.classList.add("hidden");
          shareBtn.classList.remove("hidden");
        }
      }
      function stopCurrentTest() {
        if (!isTesting) return;
        testGeneration += 1;
        abortTest();
        isTesting = false;
        setGaugePhase("Aborted");
        updateGauge(0);
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
          const check = document.createElement("input");
          check.type = "checkbox";
          check.className = "history-checkbox";
          check.value = index;
          tdCheck.appendChild(check);
          const tdDate = document.createElement("td");
          tdDate.textContent = new Date(item.date).toLocaleDateString() + " " + new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const tdDown = document.createElement("td");
          tdDown.innerHTML = `<strong class="highlight-down">${item.download?.toFixed(2) || "0"}</strong>`;
          const tdUp = document.createElement("td");
          tdUp.innerHTML = `<strong class="highlight-up">${item.upload?.toFixed(2) || "0"}</strong>`;
          const tdPing = document.createElement("td");
          tdPing.textContent = Math.round(item.ping || 0).toString() + " ms";
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
            valUp.textContent = formatSpeed(last.upload, document.getElementById("unit-select").value);
            updateGauge(last.download);
          }
        }
        document.querySelectorAll(".unit-label").forEach((el) => el.textContent = document.getElementById("unit-select").value);
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
          navigator.serviceWorker.register("sw.js?v=6.0").catch(console.error);
        });
      }
      document.addEventListener("DOMContentLoaded", () => {
        const CURRENT_VERSION = '6.0';
        const lastVersion = localStorage.getItem("app_version");
        if (lastVersion !== CURRENT_VERSION) {
          console.log(`SpeedPulse: Version update detected (${lastVersion} -> ${CURRENT_VERSION}). Clearing caches & Service Workers...`);
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
              for (let registration of registrations) {
              if (registration.scope === new URL('./', window.location.href).href) registration.unregister();
            }
            });
          }
          if ("caches" in window) {
            caches.keys().then((names) => {
              for (let name of names) {
              if (name.startsWith('speedpulse-')) caches.delete(name);
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
          initLatencyChart();
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
