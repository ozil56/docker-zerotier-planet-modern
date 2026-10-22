[English README](../README.md) | [简体中文](zh-CN/VALIDATION.md)

# Executed validation — 2026-10-22

This page records actual results. Platform examples in documentation are not automatically counted as tested.

## Environment and build

- Independent ali-test host: Ubuntu 26.04, Linux amd64, Docker 29.1.3, Compose 2.40.3.
- Production was not involved. Each run generated an independent server identity and two client identities.
- A full Dockerfile build from pinned official source completed in about 590 seconds: Node 24.22.1, ZeroTier 1.16.2, Alpine 3.24.3.
- The base image came from Docker's official registry with layer digest verification. Direct Hub access timed out on the test host, so the verified image was imported. GitHub/Alpine/npm downloads used a temporary restricted proxy with TLS verification enabled.
- Official ZeroTier commit/archive hashes and observed Node image digests are in [sources.lock.json](../sources.lock.json). Tags and Alpine security packages may change over time; builds are not claimed to be bit-for-bit reproducible.

## Steps actually exercised

| Step | Check | Result |
| --- | --- | --- |
| Configuration | .env from example; `docker compose config --quiet` | Passed |
| Build | All Dockerfile stages, official source compile, npm ci | Passed |
| Initialization | `docker compose --profile tools run --rm init` | Independent random identity/password |
| Overwrite protection | Repeated init and compared identity hash | Refused; identity unchanged |
| Startup | `docker compose up -d --no-build planet`, healthcheck | Passed |
| CLI | `zerotier-cli -D/var/lib/zerotier-one info` | Version 1.16.2 |
| UI login | Generated administrator password via login form | Passed |
| Network | UI creation and Easy setup address pool | Passed |
| Download | No key / valid key / byte comparison | 401 without key; exact Planet with key |
| Clients | Two fresh Linux clients, UI authorization | Both OK |
| Initial traffic | A→B and B→A, 10 pings each | 0% loss both ways |
| Restart | Compose restart, login, original network and clients | Passed; 10 pings each way, 0% loss |
| Backup | backup.sh exports state/image and restores running state | Passed; SHA256SUMS verified |
| Restore | Stop test instance, extract state, load image, start | Identity/Planet/account hashes unchanged |
| Restored traffic | Login, original network and both clients | 10 pings each way, 0% loss |
| Runtime permissions | Container configuration | UID 10001, cap_drop ALL, no privileged, read-only root |
| Cleanup | Stop test root and clients | Stopped; evidence/data retained |

Sanitized records are in [validation-results.json](validation-results.json). The same [integration script](../tests/integration.py) requires a dedicated new test directory and explicit isolated-test confirmation. It creates an internal Docker network and removes host port mappings. Never point it at production data. Reusing a test host can require resolving names of retained stopped test containers before another run; do not delete unrelated containers.

## Verification of the published source

After publishing initial source commit `f4f3cb1bde4ae58beb9b176c639111cb8a68f84b`, an anonymous local Git clone matched all 69 files byte for byte. Git HTTPS on ali-test failed due to network restrictions, so that exact commit was downloaded from official GitHub codeload. The README includes this fallback.

A second complete run finished at **2026-10-22 18:19 China Standard Time (UTC+8)**: `docker compose build planet` from the public archive, initialization, login, network creation, two-client traffic, restart, backup and restoration all passed. A test-only build network=host override allowed the build to reach the temporary loopback proxy. The initial Compose build without that override could not reach npm through the proxy; it passed after correction. Runtime networking remained isolated. This build workaround is not the default production configuration.

Each run used fresh identities and three rounds of ten pings in both directions, all with zero loss. Test services were stopped afterward. The JSON retains both runs. Later English/Chinese/Spanish/French/German/Japanese documentation changes did not alter the tested runtime; they are not additional remote test runs.

## Problems found and corrected

1. Git fetch failed during initial downloads; pinned commit archive plus SHA-256 verification succeeded.
2. An unquoted Compose tmpfs flow-list string passed config parsing but failed at container creation. Quoting it fixed the issue; a new empty-directory run then passed.
3. The README's ZeroTier CLI home argument was corrected and the final command was executed.

## Security review and limits

On 2026-10-22, `npm audit --omit=dev` using the lockfile reported **zero known advisories**. This covers npm's dependency advisory database, not all OS packages, protocol behavior or business logic, and is not a guarantee against future vulnerabilities.

Public files were checked for private infrastructure markers and sensitive files. They contain no runtime identities, private keys, tokens, user passwords, server inventory or business backups. Original UI copyright and licensing are retained.

Not covered by this fresh-install test:

- Installing Docker Engine on a blank Ubuntu host; Docker was already present, and the README links to its official instructions.
- Cloud security groups, public UDP, domain TLS and real cross-Internet NAT onboarding. These runs used an isolated network; each real deployment still needs the two-device acceptance checks.
- Full Windows/macOS/mobile setup, ARM, SSO, server network membership or external databases.
- Working IPv6 public routing or automatic endpoint re-signing/distribution after migration.

These are not presented as verified features.
