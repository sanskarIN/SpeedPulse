# SpeedPulse v1.0.0 release-candidate checklist

**Status:** Code prepared for review. Do **not** publish a tag or release until the maintainer approves.

This checklist separates *automated evidence* from checks that still need real devices and networks.

## Included in this candidate

- ASP.NET Core 10 backend serves the browser UI from `main-files/` without copying to `wwwroot/`.
- Uncached same-origin test API, HEAD/GET latency probes, bounded downloads (0–64 MiB), bounded uploads (8 MiB), and 60-request/minute per-IP test rate limit.
- `GET /api/health` and `GET /api/config` for the dashboard and diagnostics.
- Browser automatically disables the local server option if the ASP.NET endpoint is unavailable.
- Browser engine validates HTTP responses and propagates cancellations; upload throughput is shown when the POST succeeds instead of fabricating live progress.
- Static site and local .NET server share deployable frontend assets; GitHub Pages still cannot run C#.
- Release Candidate CI builds the TypeScript bundles, checks browser behavior, builds/publishes .NET 10 and performs HTTP smoke testing.
- Existing README and local run guide updated for the current architecture.

## Evidence to check immediately before tagging

- [ ] [Latest Release Candidate CI run](https://github.com/sanskarIN/SpeedPulse/actions/workflows/ci.yml) is **green** for the intended release commit.
- [ ] [Latest Pages deployment](https://github.com/sanskarIN/SpeedPulse/actions/workflows/pages.yml) is **green** for the intended release commit, if website changes are included.
- [ ] No secrets, developer-local files, or generated `bin/` and `obj/` files are newly committed.
- [ ] `main-files/bundle.js` and `main-files/bundle-dev.js` have been rebuilt from the reviewed source.
- [ ] Release notes and version numbers match the actual tagged commit.

## Manual checks before declaring a stable v1.0.0

- [ ] Browser: Chrome/Edge and Firefox desktop; Safari or another mobile browser.
- [ ] GitHub Pages: https://sanskarin.github.io/SpeedPulse/ serves a functioning page with Cloudflare selected and local ASP.NET disabled.
- [ ] Cloudflare speed tests complete successfully for download and upload on at least one real network. Confirm remote endpoint CORS/availability and check plausible results.
- [ ] ASP.NET: run `dotnet run` and confirm the selector enables Local ASP.NET after a successful `/api/health` request; check local loopback speed clearly differs from ISP speed.
- [ ] Interrupt tests mid-download and mid-upload; verify no completed result is saved after cancellation.
- [ ] Results history, CSV export, themes and screenshot sharing still work.
- [ ] Developer Labs loads quickly, shows ASP.NET health status, supports diagnostic cancellation and JSON export, and labels synthetic settings as previews only.
- [ ] Keyboard accessibility, light/dark contrast, mobile layout, PWA install and service-worker refresh.
- [ ] Privacy/third-party endpoint disclosures accurately reflect observed browser requests.

## Non-blocking follow-up opportunities

- User-selectable data budget and test profiles (quick/standard).
- Configurable local host protection for production deployments (authentication, bandwidth quotas, trusted proxies).
- Real packet loss via suitable transport probes rather than application-layer HTTP failure ratio.
- End-to-end browser automation covering cloud/CDN failures and narrow mobile layouts.

**Maintainer decision requested:** approve tagging/publishing v1.0.0, or request further development. No release is created by this checklist.
