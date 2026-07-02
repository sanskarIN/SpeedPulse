# Contributing

Welcome to the definitive and highly detailed documentation for **SpeedPulse**, an advanced, high-performance Internet Speed Checker. 
Official GitHub Repository: [https://github.com/Sanskar-in/SpeedPulse](https://github.com/Sanskar-in/SpeedPulse)

---

### Contributing to SpeedPulse
We welcome pull requests, bug reports, and feature suggestions from the open-source community. Please adhere to the following guidelines when contributing to the SpeedPulse repository.

### Development Workflow
1. **Fork the Repository**: Clone your fork locally.
2. **Create a Branch**: `git checkout -b feature/amazing-new-feature`
3. **Commit Convention**: We follow Conventional Commits.
   - `feat: added new 3D gauge animation`
   - `fix: resolved memory leak in websocket teardown`
   - `docs: updated architecture diagrams`
4. **Testing**: Ensure that your changes do not break the core speed testing loop. Run the application and verify performance against known benchmarks (like iPerf3).
5. **Pull Request**: Submit your PR with a detailed description of what you changed and why.

### Coding Standards
- **TypeScript**: Strict mode is enforced. Use interfaces for all object shapes. Avoid `any`.
- **C# / .NET**: Follow standard Microsoft C# styling. Use async/await for all I/O bound operations. Do not block the thread pool.
- **CSS**: Prefer CSS Variables and vanilla CSS. Avoid importing heavy frameworks like Bootstrap or Tailwind unless absolutely necessary for a specific isolated component.

Thank you for helping make SpeedPulse the best open-source speed checker!

---

### Conclusion and Best Practices
The architecture behind Contributing is designed specifically for extreme resilience and high performance. When integrating or expanding upon this feature, always ensure that your changes are non-blocking to the main thread and respect the memory constraints of mobile devices. 

By adhering to these rigorous engineering standards, SpeedPulse maintains its edge as a premier, enterprise-grade diagnostic tool.

---
*Return to the [Main Documentation Index](../README.md) or visit the [GitHub Repository](https://github.com/Sanskar-in/SpeedPulse).*
