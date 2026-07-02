# Ping Test Integration

Welcome to the definitive and highly detailed documentation for **SpeedPulse**, an advanced, high-performance Internet Speed Checker. 
Official GitHub Repository: [https://github.com/Sanskar-in/SpeedPulse](https://github.com/Sanskar-in/SpeedPulse)

---

### Comprehensive Overview of Ping Measurement
Latency, or ping, refers to the time it takes for a packet of data to travel from the client to the server and back. In SpeedPulse, ping isn't just measured once; we use a continuously evaluating low-latency WebSocket connection to map the variance in response times and calculate an accurate baseline.

By doing this, we bypass the heavy overhead of HTTP handshakes on subsequent requests, yielding a "true" network latency metric rather than an application-layer delay.

### Implementation Specifics
1. **WebSocket Handshake**: An initial HTTP upgrade request is sent to the server.
2. **Ping-Pong Frame Exchange**: A predefined buffer of bits is dispatched. The `performance.now()` timer records the exact microsecond the frame leaves the browser.
3. **Receipt and Calculation**: The server instantly echoes this frame. The client receives it, stops the timer, and calculates the delta.
4. **Statistical Smoothing**: We discard the highest 10% of latency spikes (which are often caused by browser garbage collection or OS-level CPU scheduling) and average the remaining 90% to provide a reliable ping value to the user.

### Why Not HTTP?
While HTTP/2 multiplexing reduces connection overhead, the header parsing and routing logic within Kestrel (or any web server) adds a non-trivial amount of milliseconds. WebSockets operate over raw TCP after the initial handshake, making them the superior choice for high-fidelity latency monitoring.

---

### Conclusion and Best Practices
The architecture behind Ping Test Integration is designed specifically for extreme resilience and high performance. When integrating or expanding upon this feature, always ensure that your changes are non-blocking to the main thread and respect the memory constraints of mobile devices. 

By adhering to these rigorous engineering standards, SpeedPulse maintains its edge as a premier, enterprise-grade diagnostic tool.

---
*Return to the [Main Documentation Index](../README.md) or visit the [GitHub Repository](https://github.com/Sanskar-in/SpeedPulse).*
