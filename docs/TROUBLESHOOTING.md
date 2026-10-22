[English README](../README.md) | [简体中文](zh-CN/TROUBLESHOOTING.md)

# Troubleshooting

| Symptom | Check first | Action |
| --- | --- | --- |
| No `docker compose` | Official Compose plugin installation | Follow Docker's Ubuntu instructions; do not substitute Compose v1 |
| Image pull timeout | DNS/HTTPS to Docker Hub | Use a trusted network/proxy; do not disable TLS verification or use an arbitrary mirror |
| Docker Hub rate limit | Anonymous pull status | Optionally run `docker login` on the server; browser and CLI sessions are separate |
| GitHub/Alpine/npm timeout | Last successful build stage | Rebuild after network recovery; cache is reused. Investigate checksum mismatches before proceeding |
| Compiler killed/OOM | `free -h` and OOM logs | Keep BUILD_JOBS=1 and provide more memory without depriving existing services |
| License guard failure | Confirmation in .env | Read LICENSING.md and set yes only for eligible use; a build flag does not cancel a license |
| Init refuses nonempty data | Existing installation or failed attempt | Preserve and inspect it; do not casually delete data |
| Data permission error | Persistent directory UID/GID | Init sets ownership; restoration should preserve archive ownership. Runtime UID is 10001 |
| Unhealthy/restart loop | `docker compose logs --tail=80 planet` | Check identity, planet, passwd, token and port configuration exist; do not print secret contents |
| Cannot open port 3443 | SSH tunnel on your computer | Default binding is server loopback. Open `http://127.0.0.1:3443` |
| HTTPS/TLS error | Whether a TLS proxy exists | The default UI is HTTP; do not bypass certificate warnings |
| Download returns 401 | Correct download key | Use data/config/file_server.key or SCP. Never post the key in an issue |
| Login fails | Username and random password | Username is admin; there is no fixed default password. Do not overwrite passwd |
| No client appears | Matching Planet and reachable UDP | Check endpoint, both firewalls and client service restart |
| Authorized but no IP | Easy setup pool and IPv4 assignment | Correct settings and wait for refresh |
| IP but no ping | Client firewall, subnet conflicts, peer paths | Add necessary ICMP/service rules; do not disable the firewall |
| Slow network detail page | Version, Controller logs, member count | This release fixes stale HTTP connection reuse; resource limits and member count can still affect latency |

Issues should contain sanitized versions, steps, error summaries and timestamps. Never upload .env, data, backups, full inspect output, passwords, tokens, signing keys or authenticated download URLs.
