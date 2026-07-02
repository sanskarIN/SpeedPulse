# Architecture Overview

Welcome to the definitive and highly detailed documentation for **SpeedPulse**, an advanced, high-performance Internet Speed Checker. 
Official GitHub Repository: [https://github.com/Sanskar-in/SpeedPulse](https://github.com/Sanskar-in/SpeedPulse)

---

### End-to-End Architecture Flow
The SpeedPulse architecture is designed for maximum concurrency and minimal latency. It is split into two primary domains: the TypeScript/JavaScript Client (Frontend) and the ASP.NET Core Kestrel Server (Backend).

### Frontend Architecture
The frontend is built using Vanilla TypeScript, transpiled into optimized ES6 JavaScript. We intentionally avoid heavy frameworks like React or Angular because the overhead of virtual DOM diffing can negatively impact the high-resolution timers needed for accurate speed testing.

- **SpeedTestEngine**: A singleton class managing the state machine of the test (Idle -> Ping -> Download -> Upload -> Finished).
- **Network Interfaces**: WebWorkers handle the actual Fetch requests so that the main browser thread (which handles UI animations and DOM updates) never freezes.
- **UI Controller**: Listens to events emitted by the SpeedTestEngine to update the Gauge SVGs, ChartJS canvases, and textual readouts at 60 frames per second.

### Backend Architecture
The ASP.NET Core backend is optimized for raw I/O throughput. 
- **Kestrel Web Server**: Configured to disable concurrent connection limits and increase max request body sizes.
- **Garbage Collection (GC)**: We use Server GC mode in `.csproj` to prevent garbage collection pauses from stalling data streams during an active speed test.
- **Endpoints**: The API is fully stateless, meaning SpeedPulse can easily be load-balanced behind NGINX or HAProxy without requiring sticky sessions.

---

### Conclusion and Best Practices
The architecture behind Architecture Overview is designed specifically for extreme resilience and high performance. When integrating or expanding upon this feature, always ensure that your changes are non-blocking to the main thread and respect the memory constraints of mobile devices. 

By adhering to these rigorous engineering standards, SpeedPulse maintains its edge as a premier, enterprise-grade diagnostic tool.

---
*Return to the [Main Documentation Index](../README.md) or visit the [GitHub Repository](https://github.com/Sanskar-in/SpeedPulse).*
