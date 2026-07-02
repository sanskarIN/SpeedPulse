# REST API Endpoints

Welcome to the definitive and highly detailed documentation for **SpeedPulse**, an advanced, high-performance Internet Speed Checker. 
Official GitHub Repository: [https://github.com/Sanskar-in/SpeedPulse](https://github.com/Sanskar-in/SpeedPulse)

---

### RESTful API Documentation
The backend exposes specific endpoints dedicated to generating and absorbing data. These are not standard CRUD endpoints; they are highly optimized streams.

### GET /api/ping
- **Purpose**: A lightweight endpoint that returns immediately. Used as a fallback if WebSockets are blocked by corporate firewalls.
- **Response**: `200 OK`, `text/plain`, "pong".

### GET /api/download
- **Query Parameters**: `size` (integer) - the amount of bytes requested.
- **Purpose**: Streams highly incompressible random data to the client.
- **Headers**: 
  - `Content-Type: application/octet-stream`
  - `Cache-Control: no-store, no-cache, must-revalidate` (Crucial to prevent browser caching).

### POST /api/upload
- **Payload**: Arbitrary binary data.
- **Purpose**: Reads the incoming stream and discards it into the void. It does not write to disk.
- **Response**: `200 OK` once the stream is fully read. Returns a JSON object with the total bytes received and the time taken server-side.

### Error Handling
If the server is overloaded, it will return `429 Too Many Requests`. The client is designed to gracefully abort the test and display a "Server Overloaded" error message to the user.

---

### Conclusion and Best Practices
The architecture behind REST API Endpoints is designed specifically for extreme resilience and high performance. When integrating or expanding upon this feature, always ensure that your changes are non-blocking to the main thread and respect the memory constraints of mobile devices. 

By adhering to these rigorous engineering standards, SpeedPulse maintains its edge as a premier, enterprise-grade diagnostic tool.

---
*Return to the [Main Documentation Index](../README.md) or visit the [GitHub Repository](https://github.com/Sanskar-in/SpeedPulse).*
