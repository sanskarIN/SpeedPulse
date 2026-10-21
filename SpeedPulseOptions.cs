namespace SpeedPulse;

/// <summary>
/// Host-configurable safeguards. Values are clamped further in Program.cs so
/// an incorrect deployment setting cannot enable unlimited transfer sizes.
/// </summary>
public sealed class SpeedPulseOptions
{
    public int MaxDownloadBytes { get; set; } = 64 * 1024 * 1024;
    public int MaxUploadBytes { get; set; } = 8 * 1024 * 1024;
    public int RateLimitRequestsPerMinute { get; set; } = 60;
}
