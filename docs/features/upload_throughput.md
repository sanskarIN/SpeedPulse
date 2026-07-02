# Upload Throughput

Welcome to the definitive and highly detailed documentation for **SpeedPulse**, an advanced, high-performance Internet Speed Checker. 
Official GitHub Repository: [https://github.com/Sanskar-in/SpeedPulse](https://github.com/Sanskar-in/SpeedPulse)

---

### Upload Speed Calculations and Constraints
Testing upload speed is often more challenging than download speed due to asymmetric ISP connections (where upload is significantly slower) and browser-imposed restrictions on sending large `FormData` or binary blobs.

### Data Generation Strategy
SpeedPulse does not upload real user files (which would be a privacy violation and inconsistent in size). Instead, we generate random `Uint8Array` buffers in memory. The randomness ensures that any intermediate network hardware (like proxies or firewalls) cannot compress the data in transit, which would lead to artificially inflated upload speed results.

### The POST Stream Pipeline
We chunk the generated data into manageable pieces (usually 1MB to 5MB) to prevent browser crashing:
1. **Parallel Uploads**: We utilize `fetch` to initiate parallel POST requests.
2. **Event Tracking**: While the Fetch API doesn't natively support upload progress streams as cleanly as XMLHttpRequest, SpeedPulse uses intelligent time-slicing to estimate throughput based on when chunks finish uploading.
3. **Server-Side Handling**: The ASP.NET Core backend is configured to accept large bodies but immediately discards the bytes. It responds with a 200 OK the moment the buffer is fully received.

### Mitigating TCP Slow Start
Just like downloading, uploading suffers from TCP Slow Start. Our algorithms wait until a steady state is reached—where the bytes transferred per second stops accelerating and levels out—before we begin finalizing the upload metric.

---

### Conclusion and Best Practices
The architecture behind Upload Throughput is designed specifically for extreme resilience and high performance. When integrating or expanding upon this feature, always ensure that your changes are non-blocking to the main thread and respect the memory constraints of mobile devices. 

By adhering to these rigorous engineering standards, SpeedPulse maintains its edge as a premier, enterprise-grade diagnostic tool.

---
*Return to the [Main Documentation Index](../README.md) or visit the [GitHub Repository](https://github.com/Sanskar-in/SpeedPulse).*
