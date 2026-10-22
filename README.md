[English](README.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [日本語](README.ja.md)

# Docker ZeroTier Planet Modern

A modernized Docker Compose deployment of a private Planet, embedded Controller and ztncui web interface, based on the deployment approach of [xubiaolin/docker-zerotier-planet](https://github.com/xubiaolin/docker-zerotier-planet).

I have always appreciated how the original project made a private Planet easy to deploy. A recent Node.js vulnerability review prompted me to revisit the whole runtime. I also felt it was a shame that the ZeroTier core in the deployment I had been using had fallen behind. This project packages the resulting upgrades, tests and recovery procedures so that this useful setup is easier to maintain. Many thanks to xubiaolin and the original contributors, Key Networks for ztncui, and the ZeroTier authors.

This explains the motivation for this release; it is not a claim about the upstream project's current maintenance status. This is an independent project, not an official release of any of those projects. See [credits and licenses](THIRD_PARTY_NOTICES.md).

## Included in this release

| Component | Version / approach |
| --- | --- |
| ZeroTier | Official 1.16.2 source, pinned commit; embedded Controller enabled |
| Node.js | 24.22.1, official Alpine 3.24 Docker base image |
| ztncui | Maintained here from 0.8.14 |
| Password hashing | argon2 0.45.1 |
| UI | Bootstrap 5.3.8; dependencies pinned in package-lock.json |
| Runtime | UID 10001, cap_drop ALL, read-only root filesystem; no privileged mode or TUN |
| Initialization | Independent identities, signing keys and a random administrator password |

The server container provides Planet/Controller/UI only. It does not join user networks. SSO is disabled in this build. Linux amd64 is the tested target; other architectures and platforms are not claimed as validated.

## Read before installing

1. **A fresh installation is different from an upgrade.** For an existing Planet, read [migration and rollback](docs/MIGRATION.md). Never initialize an existing data directory.
2. **Check the license for your use.** The 1.16.2 Controller has a separate Source-Available License. Personal noncommercial self-use and distributing a combined image are different cases. Read [licensing](docs/LICENSING.md) before building. This repository does not publish a public prebuilt image containing that Controller.
3. **Back up the identity and state together.** Keep `data/one/identity.secret`, the Controller database, UI accounts and Planet signing configuration. Losing them can prevent recovery of your existing networks. No generated identity is included in the repository or image.

## Fresh installation on Ubuntu

Run the following commands in the **server's SSH terminal**, unless a step explicitly says to use your own computer or a client. The examples assume root; an administrator can first run `sudo -i`. Replace every placeholder with your own values. The example IPv4 `203.0.113.10` is not usable for your deployment.

### 1. Check Docker and Compose

```bash
docker version
```

```bash
docker compose version
```

Expect Docker **Server** information and Compose v2. These instructions require Compose 2.24 or newer. If missing, install Docker Engine and the Compose plugin using [Docker's Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/), then return here. Do not substitute the old Python `docker-compose`. Docker was already installed on the test host, so its initial installation is not counted as a tested step.

```bash
uname -m
```

The tested result was `x86_64`. Allow at least about 2 GB RAM and 8 GB free disk space. Compilation defaults to one job to limit memory use. Building needs access to Docker Hub, GitHub, Alpine and npm.

### 2. Get the source

```bash
apt-get update
```

```bash
apt-get install -y git
```

```bash
git clone https://github.com/ozil56/docker-zerotier-planet-modern.git
```

```bash
cd docker-zerotier-planet-modern
```

If Git cloning fails because of network restrictions, use GitHub's official archive instead. This fallback was tested on a test server located in mainland China. Run it from the parent directory, with **no existing destination directory**:

```bash
curl --fail --location --retry 3 https://codeload.github.com/ozil56/docker-zerotier-planet-modern/tar.gz/refs/heads/main -o planet-modern-source.tar.gz
```

```bash
mkdir docker-zerotier-planet-modern
```

```bash
tar -xzf planet-modern-source.tar.gz -C docker-zerotier-planet-modern --strip-components=1
```

```bash
cd docker-zerotier-planet-modern
```

If curl is missing, install it with `apt-get install -y curl`. Never extract over an existing deployment. An archive has no Git history; future upgrades still require backups and the migration procedure.

Run all remaining **server** commands from this project directory. It will also contain your persistent `data/` directory.

### 3. Configure the installation

```bash
cp .env.example .env
```

```bash
nano .env
```

| Variable | What to enter |
| --- | --- |
| `PUBLIC_IPV4` | Your server's real public IPv4, reachable by clients |
| `PUBLIC_IPV6` | Optional; leave empty unless the address, route and firewall work inside the OS |
| `ACCEPT_ZEROTIER_SOURCE_LICENSE` | Set to `yes` after reading the license and confirming eligibility |
| `ZT_PORT` | Default `9994`; external and internal UDP ports must match. Do not casually change it after initialization |
| `UI_BIND` / `DOWNLOAD_BIND` | Keep `127.0.0.1` and use SSH forwarding initially |

```bash
chmod 600 .env
```

```bash
docker compose config --quiet
```

Expect no error. No server identity has been created yet.

### 4. Build the image

```bash
docker compose build planet
```

The first build downloads and compiles dependencies and can take several minutes or longer. Expect completion with exit code 0. A Docker Hub account is not required to pull public base images and build locally. If you hit anonymous pull limits, run `docker login` in your own server terminal. Signing into Hub in a browser does not sign the server's Docker CLI in.

Do not use `docker compose pull` to obtain this project: this release provides a self-build workflow, not a public combined image. See [troubleshooting](docs/TROUBLESHOOTING.md) for download and build failures.

### 5. Initialize exactly once

```bash
docker compose --profile tools run --rm init
```

Expect `Initialized` and the directories `data/one`, `data/ui-etc`, `data/config` and `data/dist`. Repeating initialization should fail with `Refusing to initialize non-empty data directory`; this protects your existing identity.

```bash
cat data/initial-admin-password.txt
```

Read this password **only in your own terminal**. Do not paste the output into issues, logs or chats. The username is `admin`. Save the random password in a password manager, then remove the initial plaintext copy; this does not remove the stored UI password hash.

```bash
rm -- data/initial-admin-password.txt
```

### 6. Start and check

```bash
docker compose up -d --no-build planet
```

```bash
docker compose ps
```

Wait about 30–60 seconds for `Up` and `healthy`. If it becomes unhealthy or restarts repeatedly, use [troubleshooting](docs/TROUBLESHOOTING.md). Do not delete data and initialize again.

```bash
docker compose exec planet zerotier-cli -D/var/lib/zerotier-one info
```

Expect version `1.16.2`. In an isolated test network, `OFFLINE` alone does not prove failure; client join and communication tests are also needed. A public deployment must additionally verify root reachability.

### 7. Open the web interface

On **your own computer**, open another terminal, replace `YOUR_SERVER_IP`, and keep this SSH session open:

```bash
ssh -N -L 3443:127.0.0.1:3443 -L 3000:127.0.0.1:3000 root@YOUR_SERVER_IP
```

Open **http://127.0.0.1:3443** in your browser. Sign in with `admin` and the password from step 5. This is **HTTP**; port 3443 does not mean HTTPS is enabled. If local port 3443 is busy, change only the leftmost 3443 to 13443 and open http://127.0.0.1:13443.

For long-term domain access, configure HTTPS in a host nginx/Caddy reverse proxy pointing to `127.0.0.1:3443`. This project does not automatically obtain certificates or modify existing proxies.

### 8. Create a network and connect clients

Follow the [step-by-step client guide](docs/CLIENTS.md): UI navigation, address pools, Planet file locations, member authorization and a two-device ping test. Opening the management page alone is not enough to validate a deployment.

Allow `ZT_PORT` (**UDP 9994** by default) through both the cloud security group and host firewall. Do not expose the Controller HTTP API or disable the whole firewall. Keep UI and download ports bound to loopback.

### 9. Make the first backup

After arranging a brief interruption, run:

```bash
sh scripts/backup.sh
```

The script stops this project's container, backs up the state and current image, then restores its previous running state. Read [backup and recovery](docs/BACKUP.md) for off-host storage and restoration.

## Day-to-day operations

| Task | Run in the project directory |
| --- | --- |
| Status | `docker compose ps` |
| Recent logs | `docker compose logs --tail=80 planet` |
| Stop | `docker compose stop planet` |
| Start | `docker compose up -d --no-build planet` |
| Brief restart | `docker compose restart planet` |
| Upgrade | Back up first, then follow [migration and rollback](docs/MIGRATION.md) |

A restart invalidates UI sessions; it does not regenerate the identity or delete networks. Recheck the original networks, authorized members and communication between two clients. `unless-stopped` restores running containers after Docker/host restarts; manually stopped containers stay stopped.

## Documentation and validation

- [Client setup](docs/CLIENTS.md)
- [Backup and recovery](docs/BACKUP.md)
- [Upgrades, migration and rollback](docs/MIGRATION.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Licensing](docs/LICENSING.md)
- [Executed tests and limitations](docs/VALIDATION.md)
- [Changelog](CHANGELOG.md)

The release passed two isolated installation-to-recovery runs on a test server located in mainland China. Each used fresh identities and two Linux clients. This does not establish coverage of every client platform, public NAT topology or host setup. A vulnerability scan is a point-in-time result, not a permanent guarantee; review Node, ZeroTier, Alpine and npm advisories as part of ongoing maintenance.
