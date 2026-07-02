# Backend Implementation

Welcome to the definitive and highly detailed documentation for **SpeedPulse**, an advanced, high-performance Internet Speed Checker. 
Official GitHub Repository: [https://github.com/Sanskar-in/SpeedPulse](https://github.com/Sanskar-in/SpeedPulse)

---

### High-Performance ASP.NET Core
The backend for SpeedPulse isn't just serving static files; it acts as the data sink and source for the intense bandwidth generation required to test gigabit connections.

### Kestrel Optimizations
Kestrel is the cross-platform web server for ASP.NET Core. Out of the box, it's fast, but for SpeedPulse, we configure `Program.cs` to push it further:
- **MinRequestBodyDataRate & MinResponseDataRate**: Set to null. We do not want Kestrel dropping connections simply because a user is on an extremely slow 3G network.
- **MaxRequestBodySize**: Increased significantly to allow users with 10Gbps connections to upload massive chunks of data without hitting 413 Payload Too Large errors.

### Memory Pooling and Zero Allocation
When the server sends download data to the client, allocating new byte arrays for every request would cause massive Garbage Collection pressure, leading to server CPU spikes and inaccurate test results.
Instead, the server allocates a single, large, static byte array filled with random incompressible data at startup. Every download request simply streams a continuous loop of this same pre-allocated memory buffer to the client. This zero-allocation architecture allows a single modest server to saturate multiple 1Gbps client connections simultaneously.

---

### Conclusion and Best Practices
The architecture behind Backend Implementation is designed specifically for extreme resilience and high performance. When integrating or expanding upon this feature, always ensure that your changes are non-blocking to the main thread and respect the memory constraints of mobile devices. 

By adhering to these rigorous engineering standards, SpeedPulse maintains its edge as a premier, enterprise-grade diagnostic tool.

---
*Return to the [Main Documentation Index](../README.md) or visit the [GitHub Repository](https://github.com/Sanskar-in/SpeedPulse).*
