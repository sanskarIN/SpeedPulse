# Run and develop SpeedPulse

SpeedPulse supports **two deployment modes**: static GitHub Pages using Cloudflare, and a self-hosted **ASP.NET Core 10** web application using the same frontend plus local test endpoints.

## Self-hosted .NET application

Install the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0), clone the repository, then:

```bash
dotnet restore SpeedPulseBackend.csproj
dotnet run --project SpeedPulseBackend.csproj
```

Open the HTTP/HTTPS address shown by the dotnet console. The development HTTP profile normally uses `http://localhost:5205`, but always follow the actual console output. ASP.NET Core serves the `main-files/` directory directly: **do not create or copy a separate `wwwroot/` folder**.

A working ASP.NET server responds to `/api/health` and `/api/config`. The UI enables the local server selector once its health probe succeeds. Select **Local ASP.NET Server** to test the route to the running backend (often loopback); select **Cloudflare Global CDN** for public-network testing.

### Test/diagnostic endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Backend availability and version |
| `GET /api/config` | Supported download/upload limits and rate limits |
| `GET /api/down?bytes=1048576` | Stream 1 MiB of uncached data |
| `HEAD /api/down?bytes=0` | Minimal latency probe |
| `POST /api/up` | Consume uploaded test bytes and report their count |

Downloads are capped at 64 MiB per request; uploads are capped at 8 MiB. Repeated test requests are subject to a per-IP rate limit of 60 requests/minute. The backend avoids permissive CORS. Restrict network access for publicly reachable instances, since speed-test endpoints can consume bandwidth.

## Frontend development

Install a current Node.js LTS. The deployable JavaScript bundles are kept in `main-files/` and built from TypeScript in `src/`.

```bash
npm ci
npm run build
npm test
```

For the full backend compilation and publish validation:

```bash
dotnet build SpeedPulseBackend.csproj -c Release
dotnet publish SpeedPulseBackend.csproj -c Release -o publish
```

The publish directory includes `main-files/` and the .NET executable. Run the published DLL from inside the publish directory so its static web root is found.

## GitHub Pages

See [the website](https://sanskarin.github.io/SpeedPulse/) and [Pages workflow](https://github.com/sanskarIN/SpeedPulse/actions/workflows/pages.yml). Pages hosts only static assets; it **cannot run the ASP.NET Core endpoints**. The live browser application should keep its server selector in Cloudflare mode when local ASP.NET is unavailable.

## Troubleshooting

- **ASP.NET option disabled:** the `/api/health` endpoint is not accessible. Use `dotnet run` and open the URL it prints.
- **Download/Upload returns 429:** too many requests from this client IP; slow or stop repeated testing.
- **Upload returns 413:** exceeds the 8 MiB request cap.
- **Unrealistically high local speeds:** you are measuring the loopback path rather than your Internet connection.
- **Frontend changes not visible:** run `npm run build`, refresh the page, and check service-worker caching.
- **Tests failing:** inspect [Release Candidate CI](https://github.com/sanskarIN/SpeedPulse/actions/workflows/ci.yml); an automated HTTP smoke test covers the published .NET app.

Speed results are estimates. The browser's failed-HTTP-request percentage is not a true network packet-loss measurement.
