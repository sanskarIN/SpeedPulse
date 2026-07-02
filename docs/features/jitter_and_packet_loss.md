# Jitter & Packet Loss

Welcome to the definitive and highly detailed documentation for **SpeedPulse**, an advanced, high-performance Internet Speed Checker. 
Official GitHub Repository: [https://github.com/Sanskar-in/SpeedPulse](https://github.com/Sanskar-in/SpeedPulse)

---

### Understanding Jitter
Jitter is the variance in latency over time. A connection with a ping of 50ms is good, but if that ping wildly fluctuates between 20ms and 200ms, the connection suffers from high jitter. This is detrimental to real-time applications like VoIP, online gaming, and video conferencing.

SpeedPulse calculates jitter by taking the absolute differences between consecutive ping measurements:
`Jitter = (|Ping2 - Ping1| + |Ping3 - Ping2| + ... ) / N-1`

### Identifying Packet Loss
Packet loss occurs when data packets fail to reach their destination. In a web browser environment, true UDP packet loss is difficult to measure without WebRTC. 

SpeedPulse approximates packet loss using TCP timeouts and WebSocket frame drops:
1. **Timeouts**: If a ping response takes longer than 2000ms, it is flagged as a dropped packet.
2. **Sequence Numbering**: Each outgoing WebSocket frame has an incrementing ID. If the server receives ID 5, then ID 7, it knows ID 6 was lost or delayed. The server communicates this discrepancy back to the client.

### Real-World Implications
A user might have a 1 Gigabit connection, but if packet loss is at 5%, their actual web browsing experience will be terrible due to constant TCP retransmissions. Highlighting these two metrics gives users a much more holistic view of their network health.

---

### Conclusion and Best Practices
The architecture behind Jitter & Packet Loss is designed specifically for extreme resilience and high performance. When integrating or expanding upon this feature, always ensure that your changes are non-blocking to the main thread and respect the memory constraints of mobile devices. 

By adhering to these rigorous engineering standards, SpeedPulse maintains its edge as a premier, enterprise-grade diagnostic tool.

---
*Return to the [Main Documentation Index](../README.md) or visit the [GitHub Repository](https://github.com/Sanskar-in/SpeedPulse).*
