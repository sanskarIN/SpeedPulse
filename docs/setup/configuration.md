# Configuration

Welcome to the definitive and highly detailed documentation for **SpeedPulse**, an advanced, high-performance Internet Speed Checker. 
Official GitHub Repository: [https://github.com/Sanskar-in/SpeedPulse](https://github.com/Sanskar-in/SpeedPulse)

---

### Configuration and Environment Tuning
SpeedPulse is designed to be highly configurable via the `appsettings.json` file in the ASP.NET Core environment, as well as via frontend constants.

### Backend Configuration (appsettings.json)
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "SpeedPulse": {
    "MaxDownloadChunkSizeMB": 50,
    "AllowCrossDomainConnections": true,
    "WebSocketTimeoutSeconds": 30
  }
}
```
- **MaxDownloadChunkSizeMB**: Caps the maximum size of a single file chunk requested by the client. Adjust this based on your server's outgoing bandwidth costs.
- **AllowCrossDomainConnections**: Enables CORS headers to allow frontend instances hosted on different domains to use this backend as a testing node.

### Frontend Tuning
Inside `src/speedtest.ts`, there are several configurable constants:
- `PING_ITERATIONS`: Default is 10. Increasing this gives a more accurate ping but takes longer.
- `TEST_DURATION_MS`: Default is 15000 (15 seconds). Longer tests are better for gigabit connections to fully stabilize.

---

### Conclusion and Best Practices
The architecture behind Configuration is designed specifically for extreme resilience and high performance. When integrating or expanding upon this feature, always ensure that your changes are non-blocking to the main thread and respect the memory constraints of mobile devices. 

By adhering to these rigorous engineering standards, SpeedPulse maintains its edge as a premier, enterprise-grade diagnostic tool.

---
*Return to the [Main Documentation Index](../README.md) or visit the [GitHub Repository](https://github.com/Sanskar-in/SpeedPulse).*
