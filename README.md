[English](README.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [日本語](README.ja.md)

# Docker ZeroTier Planet Modern

A modernized Docker Compose deployment of a private Planet, embedded Controller and ztncui web interface, based on the deployment approach of [xubiaolin/docker-zerotier-planet](https://github.com/xubiaolin/docker-zerotier-planet).

I have always appreciated how the original project made a private Planet easy to deploy. A recent Node.js vulnerability review prompted me to revisit the whole runtime. I also felt it was a shame that the ZeroTier core in the deployment I had been using had fallen behind. This project packages the resulting upgrades, tests and recovery procedures so that this useful setup is easier to maintain. Many thanks to xubiaolin and the original contributors, Key Networks for ztncui, and the ZeroTier authors.

This explains the motivation for this release; it is not a claim about the upstream project's current maintenance status. This is an independent project, not an official release of any of those projects. See [credits and licenses](THIRD_PARTY_NOTICES.md).

**Custom Planet is generated automatically during initialization.** Your client file is `data/dist/planet`. See [how it is generated](#generate-planet) and [how to download and install it on clients](#custom-planet). Creating a network in the UI alone does not configure a client to use your private Planet.

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

<a id="generate-planet"></a>

### 5. Generate your custom Planet and initialize once

```bash
docker compose --profile tools run --rm init
```

Expect `Initialized` and the directories `data/one`, `data/ui-etc`, `data/config` and `data/dist`. Repeating initialization should fail with `Refusing to initialize non-empty data directory`; this protects your existing identity.

**This command generates your custom `planet` file; no separate mkworld tool or manual generation step is needed.** Before running it, step 3 must contain your actual `PUBLIC_IPV4`, optional working `PUBLIC_IPV6` and `ZT_PORT`. Initialization generates a new server identity and signing keys, then uses ZeroTier's official idtool to sign a Planet containing that identity and those endpoints.

| Generated path, relative to this project | Purpose |
| --- | --- |
| `data/dist/planet` | The custom Planet file to copy to every client; the filename is exactly `planet`, without an extension |
| `data/one/planet` | The server's copy of the same Planet |
| `data/dist/*.moon` | An additional Moon file; not a replacement for the Planet client setup below |
| `data/one/identity.secret`, `data/config/planet-signing.json`, `data/config/moon-signing.json` | Private identity/signing material; back up privately and never distribute to clients |

In the **server's project directory**, check generation:

```bash
ls -lh data/dist/planet
```

```bash
sha256sum data/one/planet data/dist/planet
```

Expect a nonempty file and identical SHA-256 values for both copies. The Planet file is a signed binary, not text to edit. It is generated for your installation, not downloaded from this repository. All clients using this Planet receive the same file; creating another network on the same Controller does not require regenerating it.

**For an existing deployment, do not run init to obtain a file.** Use its existing `data/dist/planet` or recover from a verified backup. Do not delete `data/` to bypass the initialization guard. Changing `.env` later does not rewrite the signed Planet; changes to the public endpoint require a separately planned re-signing/distribution procedure, which this release does not automate.


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

<a id="custom-planet"></a>

### 8. Get your custom Planet and connect clients

#### 8.1 Create a private network in the UI

Open **Networks → Add network**, enter a name, and select **Create Network**. Record the **16-hex-digit Network ID**. Open that network's **Easy setup**, choose a subnet that does not overlap your clients' LAN/VPN/Docker networks, and submit an address pool. For example: CIDR `10.235.0.0/24`, pool `10.235.0.10`–`10.235.0.200`. Keep the network Private.

The Network ID identifies a virtual network. The `planet` file tells clients about your private roots; **one does not replace the other**.

#### 8.2 Copy the generated Planet to your computer

**Recommended: SCP.** On **your own computer**, replace the server address and the absolute project path if you installed elsewhere:

```bash
scp root@YOUR_SERVER_IP:/root/docker-zerotier-planet-modern/data/dist/planet ./planet
```

This creates `planet` in your computer's current directory. If SSH uses a nondefault port, add `-P YOUR_SSH_PORT` to `scp`. Keep the filename `planet`, not `planet.txt`. Only copy this distribution file; never copy the server's `identity.secret`, signing JSON or entire data directory to clients.

**Alternative: authenticated browser download.** Start the service and keep the step 7 SSH tunnel (including port 3000) open. In the **server's project directory**, read the download key privately:

```bash
cat data/config/file_server.key
```

On your computer, replace `YOUR_DOWNLOAD_KEY` with that value and open:

```text
http://127.0.0.1:3000/planet?key=YOUR_DOWNLOAD_KEY
```

Save the response as `planet`. Without the correct key, `401 Unauthorized` is expected. This key is different from the UI password and Controller API token; do not publish the authenticated URL or paste the key into an issue. The download port stays local to the server and is reached through SSH.

Compare the downloaded file with the server hash from step 5. On Linux:

```bash
sha256sum ./planet
```

On Windows PowerShell:

```powershell
Get-FileHash .\planet -Algorithm SHA256
```

The hash must match `data/dist/planet` on the server before you install it.

#### 8.3 Replace Planet on each client

Install the ZeroTier client first. Put the downloaded `planet` in the current directory of **each Linux client**. Arrange a brief interruption, then run the following there, not in the server container. Preserve the client's `identity.secret`. If `planet.before-private` already exists, choose a new backup filename rather than overwrite it.

```bash
sudo systemctl stop zerotier-one
```

```bash
sudo cp -a /var/lib/zerotier-one/planet /var/lib/zerotier-one/planet.before-private
```

```bash
sudo install -m 0644 ./planet /var/lib/zerotier-one/planet
```

```bash
sudo systemctl start zerotier-one
```

| Client platform | Planet file location | Replacement |
| --- | --- | --- |
| Linux | `/var/lib/zerotier-one/planet` | Commands above |
| Windows | `C:\ProgramData\ZeroTier\One\planet` | As administrator, stop ZeroTier One in Services, back up and replace only planet, then restart the service |
| macOS | `/Library/Application Support/ZeroTier/One/planet` | With administrator rights, stop the service using the installed version's instructions, back up/replace planet, then start it |

Only Linux end-to-end setup was tested here. Windows/macOS entries are path references; mobile clients vary by build. See the [client guide](docs/CLIENTS.md) for scope and troubleshooting. This flow uses **Planet replacement**; merely importing/orbiting the `.moon` file is not the same operation.

#### 8.4 Join, authorize and verify communication

On each Linux client, replace the placeholder with the Network ID from 8.1:

```bash
sudo zerotier-cli join YOUR_16_DIGIT_NETWORK_ID
```

```bash
sudo zerotier-cli info
```

Match the 10-digit client node ID to the member in the UI and select **Authorized**. Then check:

```bash
sudo zerotier-cli listnetworks
```

Expect the network to show `OK` and an assigned ZeroTier IP. Test A→B and B→A using those assigned addresses, for example **only if B actually received this address**:

```bash
ping -c 10 10.235.0.20
```

Allow `ZT_PORT` (**UDP 9994** by default) through both the cloud security group and host firewall. Check client firewall rules if addresses are assigned but traffic fails. Do not expose the Controller HTTP API or disable the entire firewall. Opening the management UI alone is not a successful client-connectivity test.

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
