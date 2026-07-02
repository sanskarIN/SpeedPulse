# Troubleshooting Guide

Welcome to the definitive and highly detailed documentation for **SpeedPulse**, an advanced, high-performance Internet Speed Checker. 
Official GitHub Repository: [https://github.com/Sanskar-in/SpeedPulse](https://github.com/Sanskar-in/SpeedPulse)

---

### Troubleshooting Guide
Running a high-bandwidth application can expose underlying OS and network quirks. Here are common issues and solutions.

### Issue: Speeds cap out at exactly 100 Mbps or 1000 Mbps
- **Cause**: This is almost always a physical hardware limitation. The user's ethernet cable might be Cat5 (capped at 100Mbps), or their router/switch ports are only Gigabit (capped at ~940Mbps after overhead).
- **Resolution**: Advise the user to check their physical network infrastructure and network adapter link speed.

### Issue: Upload test fails with CORS error
- **Cause**: The `OPTIONS` preflight request for the POST upload is being blocked by a firewall or incorrectly configured proxy.
- **Resolution**: Ensure the `AllowCrossDomainConnections` is set to `true` in `appsettings.json`, and verify that NGINX/Apache is passing the `Origin` and `Access-Control-Request-Method` headers correctly.

### Issue: High CPU usage on the Server
- **Cause**: If thousands of users test simultaneously, calculating random bytes on the fly will exhaust CPU resources.
- **Resolution**: Ensure the zero-allocation memory pooling is active. The server should read from a pre-calculated static buffer rather than allocating new random bytes per request. Check `Program.cs` to ensure the static buffer generation is functioning.

---

### Conclusion and Best Practices
The architecture behind Troubleshooting Guide is designed specifically for extreme resilience and high performance. When integrating or expanding upon this feature, always ensure that your changes are non-blocking to the main thread and respect the memory constraints of mobile devices. 

By adhering to these rigorous engineering standards, SpeedPulse maintains its edge as a premier, enterprise-grade diagnostic tool.

---
*Return to the [Main Documentation Index](../README.md) or visit the [GitHub Repository](https://github.com/Sanskar-in/SpeedPulse).*
