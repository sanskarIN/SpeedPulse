# SpeedPulse links and external dependencies

This reference distinguishes **application network requests** from informational and maintainer links. The canonical hosted URL is available only after GitHub Pages is enabled and the deployment succeeds.

## Application network requests

| URL | Usage | Notes |
| --- | --- | --- |
| https://speed.cloudflare.com/__down | Browser download / latency probe | External public speed-test service |
| https://speed.cloudflare.com/__up | Browser upload probe | External public speed-test service |
| https://ipapi.co/json/ | Approximate public IP, city and ISP | Third-party geolocation |
| https://ipwho.is/ | HTTPS geolocation fallback | Used if primary request fails |
| https://cdn.jsdelivr.net/npm/chart.js | Chart.js browser dependency | CDN-delivered |
| https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js | PNG screenshot generation | CDN-delivered |
| https://fonts.googleapis.com | Google Fonts CSS | Remote stylesheet |
| https://fonts.gstatic.com | Font assets | Remote asset host |

Backend-only local URLs: `/api/down` and `/api/up` on the self-hosted ASP.NET Core server. These endpoints **do not exist on GitHub Pages**.

## Project and maintainer

| Purpose | URL |
| --- | --- |
| Project source | https://github.com/sanskarIN/SpeedPulse |
| Pages website (after activation) | https://sanskarin.github.io/SpeedPulse/ |
| Issue tracker | https://github.com/sanskarIN/SpeedPulse/issues |
| GitHub profile | https://github.com/sanskarIN |
| Maintainer's site | https://sanskarin.github.io |
| Contact | https://sanskarin.github.io/contact |
| X | https://x.com/SanskarCodes |
| LinkedIn | https://linkedin.com/in/SanskarCodes |
| Buy Me a Coffee | https://buymeacoffee.com/SanskarCodes |
| Razorpay | https://razorpay.me/@SanskarCodes |
| PayPal.Me | https://paypal.me/SanskarCodes |

## Internal website pages

`index.html`, `about.html`, `support.html`, `privacy.html`, `terms.html`, `developer.html`, `404.html`.

The original large generated `main-files/developer.html` contains some older public links. The Pages staging script `scripts/prepare-pages.cjs` normalizes them in the deployment artifact without replacing that very large generated source file.

The contents of this list reflect inspected code/configuration. External third-party URLs and service policies can change.
