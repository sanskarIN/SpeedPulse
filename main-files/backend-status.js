// Detect whether this static page is being served by its optional ASP.NET Core host.
// GitHub Pages never provides a local /api endpoint.
(async () => {
  const select = document.getElementById('server-select');
  const local = select?.querySelector('option[value="local"]');
  const status = document.getElementById('backend-status');
  if (!select || !local || !status) return;

  const unavailable = (reason) => {
    local.disabled = true;
    local.textContent = 'Local ASP.NET Server (unavailable)';
    if (select.value === 'local') select.value = 'cloudflare';
    status.textContent = reason;
  };

  if (location.protocol === 'file:' || location.hostname.endsWith('.github.io')) {
    unavailable('Cloudflare mode — static hosting has no ASP.NET API.');
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch('/api/health', {
      method: 'GET', cache: 'no-store', signal: controller.signal
    });
    if (!response.ok) throw new Error('No local backend');
    const details = await response.json();
    if (details.service !== 'SpeedPulseBackend' || details.status !== 'ok') {
      throw new Error('Unexpected backend');
    }
    const configResponse = await fetch('/api/config', {
      method: 'GET', cache: 'no-store', signal: controller.signal
    });
    if (!configResponse.ok) throw new Error('Local backend limits unavailable');
    const config = await configResponse.json();
    if (!Number.isSafeInteger(config.maxDownloadBytes) || config.maxDownloadBytes < 1 ||
        !Number.isSafeInteger(config.maxUploadBytes) || config.maxUploadBytes < 1) {
      throw new Error('Invalid backend limits');
    }
    window.speedpulseServerLimits = {
      maxDownloadBytes: config.maxDownloadBytes,
      maxUploadBytes: config.maxUploadBytes
    };
    local.disabled = false;
    local.textContent = 'Local ASP.NET Server';
    status.textContent = 'ASP.NET Core is online. Local tests honor this server\'s transfer limits.';
  } catch {
    unavailable('Local ASP.NET API not detected; Cloudflare mode is available.');
  } finally {
    clearTimeout(timeout);
  }
})();
