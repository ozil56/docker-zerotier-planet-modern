# Changelog

## 2026.10.22

- Pin official ZeroTier 1.16.2 source; enable the embedded Controller and disable unused SSO/Central builds.
- Use Node 24.22.1 / Alpine 3.24 and argon2 0.45.1, preserving verification of older argon2 hashes.
- Maintain the UI from ztncui 0.8.14: Bootstrap 5.3.8, Bootstrap Icons 1.13.1, express-validator 7.3.2, ip-address 10.7.4, morgan 1.12.1; lock dependencies.
- Remove old got/sprintf dependencies. Bound Controller HTTP requests by time and response size; avoid reusing closed connections and following redirects.
- Fix random session secrets, member update responses, double responses after IP deletion, member name actions and CIDR validation.
- Add Docker Compose, random initial passwords, official idtool Planet/Moon generation, reinitialization protection and consistent backup tooling.
- Run as non-root with no extra capabilities and a read-only root filesystem. Bind UI/downloads to loopback by default; do not publish the Controller API.
- Document attribution and separate GPL UI / ZeroTier Controller license boundaries. Provide installation, clients, recovery and troubleshooting guides.
- Make English the default README, followed by full Chinese documentation and Spanish, French, German and Japanese installation introductions linking to the detailed English guides.

[简体中文](CHANGELOG.zh-CN.md)
