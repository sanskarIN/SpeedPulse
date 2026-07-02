// Program.cs
// -----------------------------------------------------------------------------------
// Sanskar. The open source internet speed checker madded and powered by the Sanskar.
// -----------------------------------------------------------------------------------
using System.IO.Pipelines;

var builder = WebApplication.CreateBuilder(args);

// Ensure we allow serving static files (our frontend)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors();

// Enable serving files from wwwroot
app.UseDefaultFiles(); // Serves index.html
app.UseStaticFiles();

app.MapGet("/api/down", async (HttpContext context) =>
{
    // Provide a file to download for speed testing.
    var bytesQuery = context.Request.Query["bytes"];
    int bytes = 25 * 1024 * 1024; // Default 25 MB

    if (int.TryParse(bytesQuery, out int requestedBytes))
    {
        bytes = requestedBytes;
    }

    context.Response.ContentType = "application/octet-stream";

    // We send a continuous stream of random bytes.
    // Instead of allocating a huge array, we allocate a 1MB buffer and loop.
    // A larger buffer reduces the async overhead and significantly increases throughput.
    var buffer = new byte[1024 * 1024]; // 1 MB chunk
    new Random().NextBytes(buffer);

    int sent = 0;
    while (sent < bytes)
    {
        // If client disconnected, stop
        if (context.RequestAborted.IsCancellationRequested) break;

        int toSend = Math.Min(buffer.Length, bytes - sent);
        await context.Response.BodyWriter.WriteAsync(new ReadOnlyMemory<byte>(buffer, 0, toSend), context.RequestAborted);
        sent += toSend;
    }
});

app.MapPost("/api/up", async (HttpContext context) =>
{
    // Consume the incoming upload request as fast as possible to measure upload speed.
    var buffer = new byte[64 * 1024];
    long totalRead = 0;
    int read;

    while ((read = await context.Request.Body.ReadAsync(buffer, 0, buffer.Length)) > 0)
    {
        totalRead += read;
    }

    return Results.Ok(new { message = "Upload received successfully", bytesReceived = totalRead });
});

// Fallback for SPA
app.MapFallbackToFile("index.html");

app.Run();
// The code ends here.
