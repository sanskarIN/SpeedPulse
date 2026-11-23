# SpeedPulse ASP.NET Core API

This document describes the **implemented** endpoints on the optional
ASP.NET Core 10 host. GitHub Pages serves only the static frontend; it
does **not** host these routes. All paths below are on the self-hosted
SpeedPulse server's origin.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | JSON service status, version, mode and current `activeTransfers` |
| `GET` | `/api/config` | Effective test profiles, byte limits, request rate and `maxConcurrentTransfers` |
| `GET` | `/api/down?bytes=N` | Streams precisely `N` random bytes; default is 25 MiB, capped at the host's configured maximum |
| `HEAD` | `/api/down?bytes=N` | Same headers without a response body, for latency checks |
| `POST` | `/api/up` | Reads/discards an upload and responds with `{"bytesReceived":N}` |

`GET /api/down?bytes=0` is used as a bodyless HTTP latency probe.
All API responses use no-store/no-cache response headers, and downloads
use `application/octet-stream` and a matching Content-Length.
Unknown `/api/*` paths return JSON 404, not the frontend HTML.

## Input validation and status codes

- `/api/down` accepts base-10 unsigned integral byte counts, from zero
  through `MaxDownloadBytes` inclusive. Invalid values return HTTP 400.
- `/api/up` enforces `MaxUploadBytes` for both declared and chunked
  request bodies. Excess payloads return HTTP 413.
- Body-transfer requests above the global concurrency cap return HTTP
  429 with `Retry-After: 2`. Requests exceeding the per-IP fixed-window
  request limit also return HTTP 429.
- An aborted browser request releases its transfer slot; a backend
  never queues transfers awaiting slots.
- `HEAD` and zero-byte download probes do not occupy transfer slots,
  but remain subject to the per-IP request limiter.

## Host configuration

Settings in `appsettings.json` may be overridden using environment
variables prefixed with `SpeedPulse__`. Limits are clamped server-side:

| Setting | Default | Enforced range |
| --- | ---: | ---: |
| `MaxDownloadBytes` | 67108864 (64 MiB) | 1–64 MiB |
| `MaxUploadBytes` | 8388608 (8 MiB) | 1–8 MiB |
| `RateLimitRequestsPerMinute` | 60 | 10–120 |
| `MaxConcurrentTransfers` | 4 | 1–16 |

Example:

```bash
SpeedPulse__MaxConcurrentTransfers=2 dotnet run --project SpeedPulseBackend.csproj
```

The concurrency cap is **global to the running process**; it covers active
download and upload bodies together. `GET /api/health` includes a
point-in-time `activeTransfers` count. The cap limits simultaneous
transfers; it does **not** guarantee a total bandwidth quota, protect
against a distributed attack or replace authentication when the server
is exposed on an untrusted network.

## Measurement and privacy

The browser uses no-store requests. Application-layer HTTP latency,
jitter, and failed-probe percentage are not true ICMP latency or IP packet
loss. A local speed test run on the server's own machine measures
loopback, not the ISP connection. The frontend only accepts a local
upload measurement once it receives a valid acknowledgement with the
expected `bytesReceived` count (post-v1.0.0 maintenance branch).

No wildcard CORS policy is enabled. Host the app and API on the same
origin, and apply additional authentication/network controls before
deploying beyond a trusted LAN.

[Project README](../../README.md) ·
[Developer options](../developer-options.md)
