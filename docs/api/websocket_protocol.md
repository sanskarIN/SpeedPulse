# WebSocket Protocol

Welcome to the definitive and highly detailed documentation for **SpeedPulse**, an advanced, high-performance Internet Speed Checker. 
Official GitHub Repository: [https://github.com/Sanskar-in/SpeedPulse](https://github.com/Sanskar-in/SpeedPulse)

---

### The SpeedPulse WebSocket Protocol
WebSockets are utilized to provide a persistent, low-overhead bi-directional communication channel between the browser and the Kestrel server.

### Connection Establishment
The client initiates a connection to `ws://[server-ip]/ws/speedtest`.

### Message Types
Messages are strictly JSON formatted for ease of parsing, although binary frames are supported for lower overhead in future versions.

#### 1. Ping Frame
- **Client Sends**: `{ "type": "ping", "id": 12345, "timestamp": 1678900000 }`
- **Server Action**: The server instantly replies without processing the payload.
- **Server Replies**: `{ "type": "pong", "id": 12345, "server_time": 1678900002 }`

#### 2. Configuration Frame
- **Client Sends**: `{ "type": "configure", "maxThreads": 4 }`
- **Server Action**: Allocates resources or prepares specific data buffers based on the client's capabilities.

#### 3. Telemetry Frame
During the test, the client continuously sends telemetry data back to the server.
- **Client Sends**: `{ "type": "telemetry", "currentPhase": "download", "currentSpeedMbps": 450.2 }`
- **Purpose**: Allows the server administrator to monitor aggregate testing speeds globally or detect if specific ISP routes are experiencing bottlenecks.

---

### Conclusion and Best Practices
The architecture behind WebSocket Protocol is designed specifically for extreme resilience and high performance. When integrating or expanding upon this feature, always ensure that your changes are non-blocking to the main thread and respect the memory constraints of mobile devices. 

By adhering to these rigorous engineering standards, SpeedPulse maintains its edge as a premier, enterprise-grade diagnostic tool.

---
*Return to the [Main Documentation Index](../README.md) or visit the [GitHub Repository](https://github.com/Sanskar-in/SpeedPulse).*
