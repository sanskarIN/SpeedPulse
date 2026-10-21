# Development after SpeedPulse v1.0.0

These changes live on `main` and are **not part of the existing v1.0.0 tag**.
No new GitHub release is being published in this development pass.

## Typed speed-test data profiles

The main dashboard has a **Test data budget** selector with three options:

| Profile | Download request | Upload request | Approximate intentional payload |
| --- | ---: | ---: | ---: |
| Quick | 5 MiB | 1 MiB | 6 MiB |
| Standard (default) | 25 MiB | 5 MiB | 30 MiB |
| Thorough | 50 MiB | 8 MiB | 58 MiB |

Actual data consumption also includes latency requests, retransmissions, network
overhead, and any third-party traffic. A cancelled test may transfer less data.
The selected profile is saved locally when browser storage is available. Each
test snapshots its profile at the start, so changing the selector does not
silently change an ongoing transfer.

The browser engine and profile model are now typed in TypeScript. Measurements
are computed in **decimal Mbps** (8 bits per byte and 1,000,000 bits per
megabit), rather than treating 1,048,576 bits as one megabit.

## ASP.NET Core host configuration

The local server has strongly typed `SpeedPulseOptions` bound from
`appsettings.json` or `SpeedPulse__*` environment variables:

| Setting | Default | Enforced range |
| --- | ---: | ---: |
| `MaxDownloadBytes` | 67108864 (64 MiB) | 1–64 MiB |
| `MaxUploadBytes` | 8388608 (8 MiB) | 1–8 MiB |
| `RateLimitRequestsPerMinute` | 60 | 10–120 |

Example for a deliberately lower-budget trusted LAN server:

```bash
SpeedPulse__MaxDownloadBytes=10485760 \
SpeedPulse__MaxUploadBytes=2097152 \
SpeedPulse__RateLimitRequestsPerMinute=12 \
dotnet run --project SpeedPulseBackend.csproj
```

Use Windows PowerShell's `$env:SpeedPulse__MaxDownloadBytes="10485760"`
syntax for environment configuration on Windows.

`GET /api/config` reports the effective values and the Quick, Standard, and
Thorough budgets **after server-side caps are applied**. The frontend only
enables its local-server choice after reading `/api/health` and valid config,
and reduces the selected test size to the server limit when needed. The server
independently enforces its limits even if a custom client bypasses the UI.

**Hosting note:** fixed-window rate limiting and per-request caps are safety
bounds, not authentication or a bandwidth quota. Do not expose the test server
to an untrusted public network without additional protections.

## History and CSV reliability

The TypeScript history module now validates stored records, keeps at most 50,
preserves unavailable upload readings, and prevents malformed local storage
from breaking the dashboard. CSV export includes profile and completion status,
quotes values correctly, and escapes formula-like text so spreadsheet software
does not interpret an ISP name as a formula.

## Reliable and cancellable network measurements

- Every HTTP latency probe has an **8-second deadline**. Failed/expired
  HTTP probes are counted in the application-layer failure ratio and **must not
  be described as raw IP packet loss**.
- Download and upload stages each have a **90-second deadline**. A timeout
  cancels its underlying browser request and rejects the measurement promptly,
  including if an adapter fails to respond to an abort.
- The Stop button cancels the active network operation. An explicitly stopped
  test is not confused with a server timeout or a successful result.
- A completed download is only valid if its received body contains exactly
  the requested bytes. Truncated, empty and excessive responses do not produce
  fabricated speed estimates.
- Download progress is based on **received bytes**, with an accessible
  progress indicator; upload uses a completion-only indicator because Fetch
  does not expose trustworthy upload progress.
- Chart/UI callback errors no longer invalidate a successful network
  measurement. Server failures and HTTP 429/413 statuses produce specific
  inline explanations without browser alert dialogs.

Error handling is tested with non-cooperative fetch mocks, stalled response
bodies, truncated downloads, explicit cancellation and invalid timeout values.
These browser-level measurements remain estimates affected by latency, device
overhead, and the selected test server.

## Tests and generated code

```bash
npm ci
npm run typecheck:engine
npm test
npm run build
dotnet build SpeedPulseBackend.csproj -c Release
```

Tests cover profile selection, server-side profile caps, corrupt history,
partial measurements, CSV escaping, invalid payloads, and the ASP.NET Core
`/api/config` responses with overridden host settings. CI additionally
builds and publishes the .NET application and runs HTTP smoke checks.

GitHub Pages compiles the TypeScript frontend before deploying it. A dedicated
bundle synchronization workflow keeps the prebuilt `main-files/*.js`
artifacts aligned with the TypeScript code on `main`.

## Review suggestions for the next release

Exercise all three profiles using both Cloudflare and a self-hosted ASP.NET
Core server; check mobile layout, the effect of an intentionally reduced server
limit, network errors, cancellation, and history/CSV export. The new features
are development work only until the maintainer requests a new stable tag.
