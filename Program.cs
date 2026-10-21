// SpeedPulse ASP.NET Core backend. Serves the same frontend as GitHub Pages,
// plus bounded same-origin endpoints for local/LAN speed measurement.
using System.Globalization;
using System.Security.Cryptography;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using SpeedPulse;

const int mib = 1024 * 1024;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    WebRootPath = "main-files"
});

// Environment variables such as SpeedPulse__MaxDownloadBytes override appsettings.
// Clamping protects the host even if configuration is accidentally unsafe.
var configured = builder.Configuration.GetSection("SpeedPulse").Get<SpeedPulseOptions>()
    ?? new SpeedPulseOptions();
var maxDownloadBytes = Math.Clamp(configured.MaxDownloadBytes, mib, 64 * mib);
var maxUploadBytes = Math.Clamp(configured.MaxUploadBytes, mib, 8 * mib);
var defaultDownloadBytes = Math.Min(25 * mib, maxDownloadBytes);
var rateLimitRequestsPerMinute = Math.Clamp(configured.RateLimitRequestsPerMinute, 10, 120);

// No wildcard CORS: the web UI and /api routes share an origin in self-hosted mode.
// This is a demo test server: use access controls when exposing it beyond a trusted LAN.
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = maxUploadBytes;
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("speed-test", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = rateLimitRequestsPerMinute,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

var app = builder.Build();

app.UseRouting();
app.UseRateLimiter();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/health", (HttpContext context) =>
{
    SetNoStore(context.Response);
    return Results.Ok(new
    {
        status = "ok",
        service = "SpeedPulseBackend",
        version = "1.0.0",
        mode = "self-hosted"
    });
});

app.MapGet("/api/config", (HttpContext context) =>
{
    SetNoStore(context.Response);
    return Results.Ok(new
    {
        defaultDownloadBytes,
        maxDownloadBytes,
        maxUploadBytes,
        rateLimitRequestsPerMinute,
        profiles = new[]
        {
            new { id = "quick", downloadBytes = Math.Min(5 * mib, maxDownloadBytes),
                uploadBytes = Math.Min(mib, maxUploadBytes) },
            new { id = "standard", downloadBytes = Math.Min(25 * mib, maxDownloadBytes),
                uploadBytes = Math.Min(5 * mib, maxUploadBytes) },
            new { id = "thorough", downloadBytes = Math.Min(50 * mib, maxDownloadBytes),
                uploadBytes = Math.Min(8 * mib, maxUploadBytes) }
        }
    });
});

app.MapMethods("/api/down", new[] { "GET", "HEAD" }, async (HttpContext context) =>
{
    SetNoStore(context.Response);
    var value = context.Request.Query["bytes"];
    int bytes = defaultDownloadBytes;

    if (!string.IsNullOrEmpty(value))
    {
        if (!int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out bytes)
            || bytes < 0 || bytes > maxDownloadBytes)
        {
            return Results.BadRequest(new
            {
                error = $"bytes must be an integer between 0 and {maxDownloadBytes}"
            });
        }
    }

    context.Response.ContentType = "application/octet-stream";
    context.Response.ContentLength = bytes;
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";

    // A HEAD probe returns the same headers, without transferring a payload.
    if (HttpMethods.IsHead(context.Request.Method) || bytes == 0)
        return Results.Empty;

    var buffer = new byte[mib];
    RandomNumberGenerator.Fill(buffer);

    try
    {
        var remaining = bytes;
        while (remaining > 0)
        {
            var count = Math.Min(remaining, buffer.Length);
            await context.Response.Body.WriteAsync(buffer.AsMemory(0, count),
                context.RequestAborted);
            remaining -= count;
        }
    }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
    {
        // The browser cancelled the test. Do not keep producing traffic.
    }

    return Results.Empty;
}).RequireRateLimiting("speed-test");

app.MapPost("/api/up", async (HttpContext context) =>
{
    SetNoStore(context.Response);
    if (context.Request.ContentLength is long declaredLength && declaredLength > maxUploadBytes)
        return Results.StatusCode(StatusCodes.Status413PayloadTooLarge);

    var buffer = new byte[64 * 1024];
    long received = 0;

    try
    {
        while (true)
        {
            // Read at most one byte beyond the configured cap, even with chunked bodies.
            var count = (int)Math.Min(buffer.Length, maxUploadBytes - received + 1);
            var read = await context.Request.Body.ReadAsync(buffer.AsMemory(0, count),
                context.RequestAborted);
            if (read == 0) break;
            received += read;
            if (received > maxUploadBytes)
                return Results.StatusCode(StatusCodes.Status413PayloadTooLarge);
        }
    }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
    {
        return Results.Empty;
    }

    return Results.Ok(new { bytesReceived = received });
}).RequireRateLimiting("speed-test");

// Missing API paths must be 404, not the web app HTML fallback.
app.MapFallback("/api/{**path}", () => Results.NotFound(new
{
    error = "Unknown API endpoint"
}));
app.MapFallbackToFile("index.html");

app.Run();

static void SetNoStore(HttpResponse response)
{
    response.Headers.CacheControl = "no-store, no-cache, max-age=0";
    response.Headers.Pragma = "no-cache";
}
