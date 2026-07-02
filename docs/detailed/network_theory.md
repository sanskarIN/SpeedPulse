# Network Theory

Welcome to the definitive and highly detailed documentation for **SpeedPulse**, an advanced, high-performance Internet Speed Checker. 
Official GitHub Repository: [https://github.com/Sanskar-in/SpeedPulse](https://github.com/Sanskar-in/SpeedPulse)

---

### The Foundations of Network Speed Testing
To build a highly accurate speed checker, one must understand the underlying protocols that dictate internet traffic. SpeedPulse is designed around the idiosyncrasies of TCP/IP.

### TCP Window Scaling
When a download begins, TCP employs a "Slow Start" algorithm. It sends a small amount of data, waits for acknowledgment, and then exponentially increases the amount of data sent at once (the "Window"). 
If a speed test only downloads a 1MB file, the TCP Window never fully opens, and the reported speed will be drastically lower than the user's actual capacity. SpeedPulse specifically requests enough data (often 50MB+) to ensure the TCP Window reaches its absolute maximum size before finalizing the download score.

### HTTP/2 Multiplexing
Traditional HTTP/1.1 requires a separate TCP connection for every request, which incurs significant handshake overhead (DNS lookup, TCP handshake, TLS handshake). HTTP/2 allows multiplexing—sending multiple requests over a single TCP connection concurrently.

SpeedPulse takes advantage of HTTP/2 by initiating parallel chunk requests over the same multiplexed connection, drastically reducing overhead and ensuring that the pipe is completely saturated with payload data rather than protocol headers.

---

### Conclusion and Best Practices
The architecture behind Network Theory is designed specifically for extreme resilience and high performance. When integrating or expanding upon this feature, always ensure that your changes are non-blocking to the main thread and respect the memory constraints of mobile devices. 

By adhering to these rigorous engineering standards, SpeedPulse maintains its edge as a premier, enterprise-grade diagnostic tool.

---
*Return to the [Main Documentation Index](../README.md) or visit the [GitHub Repository](https://github.com/Sanskar-in/SpeedPulse).*
