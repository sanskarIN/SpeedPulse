# SpeedPulse

**Open-source internet speed testing in the browser, with an optional ASP.NET Core backend.**

[Live site](https://sanskarin.github.io/SpeedPulse/) · [Source code](https://github.com/sanskarIN/SpeedPulse) · [Report an issue](https://github.com/sanskarIN/SpeedPulse/issues) · [Contact](https://sanskarin.github.io/contact)

SpeedPulse provides a responsive speed-test dashboard with latency, download, upload, results history, charts, theming, and share/export tools. It offers two distinct ways to run:

- **Hosted / GitHub Pages:** Static frontend using Cloudflare's public speed-test endpoints. No .NET backend runs on GitHub Pages.
- **Self-hosted / local:** ASP.NET Core 10 app with `/api/down` and `/api/up` endpoints. When testing from the same machine, the local option measures loopback throughput **not** ISP speed.

> **Measurement caveat:** Results are browser-level estimates influenced by browser, device, load, server, network path and external-service availability. Failed HTTP probes are not the same thing as true IP packet loss; the "packet loss" display represents failed application-layer samples. Live upload progress is an estimate rather than instrumented byte-level progress.

## Try it

**Website:** https://sanskarin.github.io/SpeedPulse/

Choose **Cloudflare Global CDN** and start a test. This public endpoint is an independent third-party service and may be unavailable or restrict requests. Test downloads/uploads consume data. The GitHub Pages version cannot run the local ASP.NET server.

## Main features

- Ping/latency, download, upload, approximate jitter and failed-probe percentage
- Dynamic progress, charts, network/ISP information where available
- Test history stored locally in the browser, CSV export, result sharing
- Light, dark and custom themes; responsive UI; installable-web-app assets
- Informational pages: About, Support, Privacy, Terms, and Developer Labs
- Optional self-hosted C# backend for controlled testing

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

## Run locally

**Requirements:** Node.js + npm and the .NET 10 SDK for the backend.

```bash
git clone https://github.com/sanskarIN/SpeedPulse.git
cd SpeedPulse
npm ci
dotnet run
```

Open the URL shown in the ASP.NET Core terminal. The repository includes prebuilt browser assets in `main-files/`; however, ASP.NET Core expects files under `wwwroot/`. For a local backend run, first copy the static frontend into `wwwroot/`:

```bash
# macOS / Linux
mkdir -p wwwroot
cp -R main-files/. wwwroot/
```

On Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force wwwroot | Out-Null
Copy-Item main-files/* wwwroot/ -Recurse -Force
dotnet run
```

Run `dotnet run` **after** populating `wwwroot/`; the first command block lists dependency preparation, but serving the UI requires this copy. Use **Local ASP.NET Server** for the self-hosted endpoints or **Cloudflare Global CDN** to test over the public internet. The local option can test only the link to the machine hosting the backend. Edit TypeScript under `src/`, and rebuild the browser bundle before deploying source changes.

### Local API

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/down?bytes=26214400` | Streams a requested quantity of bytes; **do not expose publicly without limits** |
| POST | `/api/up` | Reads a submitted upload body and reports bytes received |

**Security note:** The demo backend currently allows cross-origin requests and an unbounded `bytes` parameter. Use it only in a trusted environment until request size/rate limits, authentication or other appropriate protections are added. GitHub Pages never executes these endpoints.

## GitHub Pages deployment

The workflow at [`.github/workflows/pages.yml`](./.github/workflows/pages.yml) uploads **only** `main-files/` as a static site. It runs on pushes to `main` and may be started manually under **Actions**.

Repository administrators should select **Settings → Pages → Build and deployment → Source: GitHub Actions**. Check the [Pages deployment run](https://github.com/sanskarIN/SpeedPulse/actions/workflows/pages.yml) before describing the site as live. The site is expected at [https://sanskarin.github.io/SpeedPulse/](https://sanskarin.github.io/SpeedPulse/) once deployment succeeds.

## Privacy and dependencies

Browser history/preferences are stored locally. Speed tests contact Cloudflare; connection information may contact `ipapi.co` (and a fallback service). The site loads fonts from Google Fonts and Chart.js/html2canvas from jsDelivr. Those services can receive requests, including network metadata, under their own policies. See the in-app [Privacy Policy](https://sanskarin.github.io/SpeedPulse/privacy.html).

All third-party service availability and browser CORS rules can affect results. The project does not promise accurate packet-level diagnostics, a particular throughput, or offline speed-test functionality.

## Project links

- [Repository](https://github.com/sanskarIN/SpeedPulse) · [Issues](https://github.com/sanskarIN/SpeedPulse/issues)
- [Creator's GitHub](https://github.com/sanskarIN) · [Website](https://sanskarin.github.io)
- [Contact](https://sanskarin.github.io/contact) · [X](https://x.com/SanskarCodes) · [LinkedIn](https://linkedin.com/in/SanskarCodes)
- Support development: [Buy Me a Coffee](https://buymeacoffee.com/SanskarCodes) · [Razorpay](https://razorpay.me/@SanskarCodes) · [PayPal.Me](https://paypal.me/SanskarCodes)

## Contributing

Issues and pull requests are welcome. Keep changes focused, describe how to test them, avoid adding private keys or credentials, and prefer fixes that work on both static hosting and self-hosted modes. For vulnerabilities, use a private reporting channel rather than posting an exploit publicly.

## License

[MIT](LICENSE) © 2026 Sanskar. Dependency licenses remain with their respective authors.
