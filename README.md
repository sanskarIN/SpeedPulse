# SpeedPulse

**Open-source internet speed testing in the browser, with an optional ASP.NET Core backend.**

[Live website](https://sanskarin.github.io/SpeedPulse/) · [Source code](https://github.com/sanskarIN/SpeedPulse) · [Report an issue](https://github.com/sanskarIN/SpeedPulse/issues) · [Contact](https://sanskarin.github.io/contact)

SpeedPulse provides a responsive speed-test dashboard with latency, download, upload, results history, charts, theming, and share/export tools. It offers two distinct ways to run:

- **Hosted / GitHub Pages:** Static frontend using Cloudflare's public speed-test endpoints. No .NET backend runs on GitHub Pages.
- **Self-hosted / local:** ASP.NET Core 10 app with `/api/down` and `/api/up` endpoints. When testing from the same machine, the local option measures loopback throughput **not** ISP speed.

> **Measurement caveat:** Results are browser-level estimates influenced by browser, device, load, server, network path and external-service availability. Failed HTTP probes are not the same thing as true IP packet loss; the "packet loss" display represents failed application-layer samples. Browser Fetch does not expose precise upload byte progress; SpeedPulse now reports an upload result only after the server confirms success.

## Try it

**Website:** https://sanskarin.github.io/SpeedPulse/

Choose **Cloudflare Global CDN** and start a test. This public endpoint is an independent third-party service and may be unavailable or restrict requests. Test downloads/uploads consume data. The GitHub Pages version cannot run the local ASP.NET server.

## Main features

- Ping/latency, download, upload, approximate jitter and failed-probe percentage
- Dynamic progress, charts, network/ISP information where available
- Test history stored locally in the browser, CSV export, result sharing
- Light, dark and custom themes; responsive UI; installable-web-app assets
- Informational pages: About, Support, Privacy, Terms, and [Developer Labs](https://sanskarin.github.io/SpeedPulse/developer.html)
- Backend discovery in the UI: enables the local ASP.NET option only when its health API responds
- Optional ASP.NET Core server with bounded streaming tests, rate limiting, health/config endpoints, and same-origin access

## Technology

| Layer | Implementation |
| --- | --- |
| Frontend | HTML, CSS, TypeScript, browser JavaScript |
| Visualization | Chart.js (CDN) |
| Image export | html2canvas (CDN) |
| Backend (optional) | C# / ASP.NET Core, targeting .NET 10 |
| Static hosting | GitHub Pages from `main-files/` |
| Build tools | Node.js, TypeScript and esbuild |

### Project structure

```text
main-files/             # Deployable HTML, CSS, images and browser JS bundle
src/                    # TypeScript app/measurement code; service-worker source
Program.cs              # ASP.NET Core optional test endpoints
SpeedPulseBackend.csproj
docs/                   # Technical reference in Markdown (not the Pages webroot)
.github/workflows/      # CI / GitHub Pages deployment
run.md                  # Longer local development guide
```

## Developer options

[Developer Labs](https://sanskarin.github.io/SpeedPulse/developer.html) includes a maintained diagnostics panel with backend health/config checks, bounded HTTP latency probes, browser capability summary, clearly labeled offline network simulations, scoped app-cache maintenance, and JSON diagnostic export. Local ASP.NET diagnostics require a self-hosted server; GitHub Pages remains static.

See [Developer Options documentation](./docs/developer-options.md) for behavior and limitations.

## Run locally with ASP.NET Core

**Requirement:** [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0). The included browser bundle is already built.

```bash
git clone https://github.com/sanskarIN/SpeedPulse.git
cd SpeedPulse
dotnet run --project SpeedPulseBackend.csproj
```

Open the URL shown in the terminal (by default `http://localhost:5205` with the development profile). **No copying into `wwwroot/` is necessary:** ASP.NET now serves `main-files/` directly. The self-hosted application detects the healthy backend and enables **Local ASP.NET Server**. Cloudflare remains available to measure the public Internet path.

For frontend development, install Node.js, then run:

```bash
npm ci
npm run build
npm test
```

The build writes browser bundles to `main-files/`. Run `dotnet build -c Release` for a backend compilation check.

### ASP.NET Core test API

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/health` | Backend status, service name and version |
| GET | `/api/config` | Current transfer limits and rate limit |
| GET or HEAD | `/api/down?bytes=26214400` | Uncached download or bodyless ping probe; 0–64 MiB allowed, 25 MiB default |
| POST | `/api/up` | Measures received upload bytes; request body capped at 8 MiB |

Measurement endpoints have per-IP fixed-window rate limiting (60 requests/minute per running server instance) and report invalid download sizes with HTTP 400, oversized uploads with HTTP 413, and excess requests with HTTP 429.

**Hosting security:** The backend is designed primarily for local or trusted-LAN use. CORS is not opened to arbitrary websites, but rate limiting is not a substitute for authentication, access controls, bandwidth quotas or network-level protections when hosting publicly. A local test from the same machine measures loopback throughput, **not** your ISP download speed.

## GitHub Pages deployment

The workflow at [`.github/workflows/pages.yml`](./.github/workflows/pages.yml) publishes a staged copy of `main-files/` as a static site (with legacy links normalized). It runs on pushes to `main` and may be started manually under **Actions**.

Pages is configured to deploy through GitHub Actions. Confirm the newest build at [Pages deployment runs](https://github.com/sanskarIN/SpeedPulse/actions/workflows/pages.yml). GitHub Pages cannot execute the C# API, so the public version uses Cloudflare. The expected site URL is [https://sanskarin.github.io/SpeedPulse/](https://sanskarin.github.io/SpeedPulse/).

## Privacy and dependencies

Browser history/preferences are stored locally. Speed tests contact Cloudflare; connection information may contact `ipapi.co` (and a fallback service). The site loads fonts from Google Fonts and Chart.js/html2canvas from jsDelivr. Those services can receive requests, including network metadata, under their own policies. See the in-app [Privacy Policy](https://sanskarin.github.io/SpeedPulse/privacy.html).

All third-party service availability and browser CORS rules can affect results. The project does not promise accurate packet-level diagnostics, a particular throughput, or offline speed-test functionality.

## Project links

The [complete URL and external-service inventory](./docs/links.md) identifies each network endpoint, dependency, project URL and support channel.


- [Repository](https://github.com/sanskarIN/SpeedPulse) · [Issues](https://github.com/sanskarIN/SpeedPulse/issues)
- [Creator's GitHub](https://github.com/sanskarIN) · [Website](https://sanskarin.github.io)
- [Contact](https://sanskarin.github.io/contact) · [X](https://x.com/SanskarCodes) · [LinkedIn](https://linkedin.com/in/SanskarCodes)
- Support development: [Buy Me a Coffee](https://buymeacoffee.com/SanskarCodes) · [Razorpay](https://razorpay.me/@SanskarCodes) · [PayPal.Me](https://paypal.me/SanskarCodes)

## Release candidate checks

[Release Candidate CI](https://github.com/sanskarIN/SpeedPulse/actions/workflows/ci.yml) runs browser tests, a frontend build, an ASP.NET Core 10 build/publish, and HTTP smoke tests for the API. Review [the v1.0.0 checklist](./docs/release-readiness.md) before tagging or publishing a release. **No v1.0.0 GitHub release has been published as part of this preparation.**

## Contributing

Issues and pull requests are welcome. Keep changes focused, describe how to test them, avoid adding private keys or credentials, and prefer fixes that work on both static hosting and self-hosted modes. For vulnerabilities, use a private reporting channel rather than posting an exploit publicly.

## License

[MIT](LICENSE) © 2026 Sanskar. Dependency licenses remain with their respective authors.
