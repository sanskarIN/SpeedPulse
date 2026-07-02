# Download Throughput

Welcome to the definitive and highly detailed documentation for **SpeedPulse**, an advanced, high-performance Internet Speed Checker. 
Official GitHub Repository: [https://github.com/Sanskar-in/SpeedPulse](https://github.com/Sanskar-in/SpeedPulse)

---

### Deep Dive into Download Throughput Evaluation
Measuring internet download speeds accurately requires saturating the client's available bandwidth. If the bandwidth isn't saturated, the test will merely measure how quickly the server can trickle data, rather than the maximum capacity of the user's ISP connection.

### The Chunking Mechanism
SpeedPulse achieves saturation by downloading progressively larger chunks of data:
- **Phase 1 (Warmup)**: Small chunks (1MB - 5MB) are requested to measure the initial ramp-up.
- **Phase 2 (Sizing)**: Based on the warmup speed, the engine calculates how large the subsequent chunks need to be to ensure the TCP window opens fully.
- **Phase 3 (Saturation)**: Multiple parallel Fetch requests (via `Promise.all`) request large, highly incompressible binary blobs (e.g., 25MB+). 

### Overcoming Browser Bottlenecks
Browsers have connection limits per domain (typically 6). SpeedPulse bypasses this by utilizing service workers and optimizing the `keep-alive` headers to reuse sockets effectively. The incoming data is read via a `ReadableStream`, ensuring the browser's memory isn't overwhelmed by storing hundreds of megabytes of test data in RAM.

```javascript
// Stream Processing Architecture
const response = await fetch('/api/download-chunk');
const reader = response.body.getReader();
let receivedLength = 0;
while(true) {
  const {done, value} = await reader.read();
  if (done) break;
  receivedLength += value.length;
  updateUI(receivedLength);
}
```


---

### Conclusion and Best Practices
The architecture behind Download Throughput is designed specifically for extreme resilience and high performance. When integrating or expanding upon this feature, always ensure that your changes are non-blocking to the main thread and respect the memory constraints of mobile devices. 

By adhering to these rigorous engineering standards, SpeedPulse maintains its edge as a premier, enterprise-grade diagnostic tool.

---
*Return to the [Main Documentation Index](../README.md) or visit the [GitHub Repository](https://github.com/Sanskar-in/SpeedPulse).*
