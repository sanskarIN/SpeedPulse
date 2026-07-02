# Deployment

Welcome to the definitive and highly detailed documentation for **SpeedPulse**, an advanced, high-performance Internet Speed Checker. 
Official GitHub Repository: [https://github.com/Sanskar-in/SpeedPulse](https://github.com/Sanskar-in/SpeedPulse)

---

### Production Deployment Strategies
Deploying SpeedPulse requires careful consideration of network architecture. If your server is behind a proxy that rate-limits or throttles traffic, the speed test results will reflect the proxy's limit, not the user's connection.

### Option 1: Docker (Recommended)
We provide a `Dockerfile` multi-stage build.
```dockerfile
# Build phase
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app

# Run phase
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "SpeedPulseBackend.dll"]
```
Run it using: `docker run -d -p 80:80 -p 443:443 speedpulse`

### Option 2: NGINX Reverse Proxy
If deploying on Linux via systemd, use NGINX to proxy requests. **Crucial Configuration**:
You must disable buffering in NGINX for the test endpoints, otherwise NGINX will try to cache the 50MB download chunks in RAM/Disk before sending them to the user, ruining the latency and throughput metrics.
```nginx
location /api/download {
    proxy_pass http://localhost:5000;
    proxy_buffering off;
    proxy_request_buffering off;
}
```

---

### Conclusion and Best Practices
The architecture behind Deployment is designed specifically for extreme resilience and high performance. When integrating or expanding upon this feature, always ensure that your changes are non-blocking to the main thread and respect the memory constraints of mobile devices. 

By adhering to these rigorous engineering standards, SpeedPulse maintains its edge as a premier, enterprise-grade diagnostic tool.

---
*Return to the [Main Documentation Index](../README.md) or visit the [GitHub Repository](https://github.com/Sanskar-in/SpeedPulse).*
