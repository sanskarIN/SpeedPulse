# Developer Options / Diagnostics

The developer page at **[Developer Labs](https://sanskarin.github.io/SpeedPulse/developer.html)** now loads a maintained **Developer Diagnostics** panel. It is bundled from `src/dev-diagnostics.ts` to `main-files/dev-diagnostics.js` and activated by `src/developer.ts`.

## Available controls

| Control | Operation | Scope |
| --- | --- | --- |
| Check backend | Requests `/api/health` and `/api/config`, with a short timeout | Only ASP.NET Core self-hosted mode |
| Run 5 probes | Sends five short uncached requests to `/api/down?bytes=0` and calculates average HTTP duration, variation and failed samples | Only local same-origin ASP.NET |
| Cancel | Cancels the current diagnostic request through an AbortController | Current diagnostic panel |
| Simulate 20 samples | Generates synthetic latency/failure data using adjustable jitter and failure sliders | Offline local simulation; does not affect real tests |
| Clear SpeedPulse caches | Removes Cache Storage buckets prefixed `speedpulse-`, after confirmation | SpeedPulse-owned caches only |
| Clear SpeedPulse preferences | Removes browser preferences prefixed `speedpulse_` or `speedpulse-`, after confirmation | SpeedPulse-prefixed settings only |
| Export JSON report | Saves backend/capability/diagnostic summary to a local file | Explicit user download only |

The JSON report excludes browser history, local-storage values and IP information. The browser capability summary records feature availability, not personal activity.

## Modes and limitations

GitHub Pages cannot host ASP.NET Core. The developer panel identifies this as **Static website** and disables backend-only measurements. Run `dotnet run --project SpeedPulseBackend.csproj` to enable the health/config and latency probes.

The panel's latency value measures **application-layer HTTP duration**; it is not ICMP ping. Failed HTTP requests are **not** proof of network packet loss. A local backend running on the same device primarily measures loopback responsiveness, not the user's ISP.

Simulation sliders and connected legacy controls (mock bandwidth caps, HTTP jitter/failure, offline preview, WebSocket drop/latency preview, and mock GPS coordinates) deliberately do not alter DNS, GPS, network interfaces, or real measurement results. A DOM mutation counter can observe the diagnostics panel when enabled. The older developer page includes experimental/demo-only options; their actions have been relabeled in logs to avoid claiming they altered actual network conditions.

## Build and test

```bash
npm ci
npm run build:labs
npm run build:diagnostics
npm test
```

`npm run build` builds both the main application and developer bundles. Release Candidate CI checks the JavaScript and .NET projects. The original Developer Labs HTML contained 35,899 placeholder log rows. Those pre-generated entries have been removed (approximately 98% smaller HTML) while preserving the existing page and loading the maintained panel alongside it.

## Safety and usability

Console log content is inserted as plain text rather than HTML and log history is limited to 300 entries. Cache and service-worker actions are limited to SpeedPulse resources. Any short animation stress test uses a bounded particle count.

For a future stable release, visually verify the new panel and existing controls on mobile, inspect the reduced page payload, confirm results after page refresh, and verify responsive layout, keyboard operation, panel loading in the large legacy developer page, and correct behavior in Chrome, Edge, Firefox, and a mobile browser.
