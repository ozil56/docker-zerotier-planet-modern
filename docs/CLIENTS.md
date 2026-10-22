[English README](../README.md) | [简体中文](zh-CN/CLIENTS.md)

# Client setup: from login to two connected devices

Complete the README startup checks first. The UI labels below are in English.

## 1. Create a private network

1. Open **Networks** (`/controller/networks`).
2. Select **Add network**, enter a recognizable name such as `Home`, and submit.
3. Record the **16-hex-digit Network ID**. This is different from the server's 10-digit node ID.
4. Open **Easy setup** for that network. For example, set `Network address in CIDR notation` to `10.235.0.0/24`, the pool start to `10.235.0.10` and the end to `10.235.0.200`, then **Submit**. Choose a subnet that does not overlap any client LAN, VPN, Docker or other ZeroTier network.
5. Keep the network **Private**. Authorize each member explicitly.

## 2. Generate and obtain the Planet file

For a fresh installation, README step 5 (`docker compose --profile tools run --rm init`) already generates and signs your custom Planet using .env's public addresses/UDP port and a newly generated server identity. No separate generator is needed. For an existing installation, use the existing file or a verified backup instead of reinitializing. See the [complete generation and verification step](../README.md#generate-planet).

The file is **data/dist/planet** in the server's project directory. Only `data/dist/` contains client distribution files. Never copy `data/one/identity.secret`, `data/config/*signing.json` or the entire data directory to clients.

On your administrator computer, replace the host and installation path:

```bash
scp root@YOUR_SERVER_IP:/root/docker-zerotier-planet-modern/data/dist/planet ./planet
```

Compare its SHA-256 on both ends: use `sha256sum planet` on Linux or `Get-FileHash .\planet -Algorithm SHA256` in Windows PowerShell.

An authenticated download service is also available at `127.0.0.1:3000`, through the README's SSH tunnel. The key is in `data/config/file_server.key`; the URL format is `http://127.0.0.1:3000/planet?key=<YOUR_DOWNLOAD_KEY>`. Do not publish a complete authenticated URL. The download key is different from the UI password and Controller token. SCP avoids reading the download key and is simpler for the first installation.

The generated `.moon` file in `data/dist/` is for users who already understand Moon operation. The tested flow here **replaces planet**; it does not merely orbit a Moon. You do not need to perform both approaches.

## 3. Install Planet on each Linux client

Install a client from the [official ZeroTier download page](https://www.zerotier.com/download/). Run these commands on **each client**, not in the Planet server container.

Replacing Planet briefly disconnects that client. Arrange the interruption first. Back up its old planet file and preserve `identity.secret` so that its node ID stays unchanged.

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

Replace the placeholder with the actual Network ID from step 1:

```bash
sudo zerotier-cli join YOUR_16_DIGIT_NETWORK_ID
```

```bash
sudo zerotier-cli info
```

Record this client's 10-digit node ID. `ACCESS_DENIED` is expected until it is authorized.

## 4. Authorize and test two clients

Return to that network's detail page. Match the member node IDs and select **Authorized** only for your devices. On each client:

```bash
sudo zerotier-cli listnetworks
```

Expect status `OK` and an address such as `10.235.0.x/24`. If no address appears, check Easy setup and IPv4 address assignment.

Ping B's **ZeroTier address** from A, then reverse the test. For example, only if B actually received `10.235.0.20`:

```bash
ping -c 10 10.235.0.20
```

Also check `zerotier-cli peers` for the private root. Use your own network ID, node IDs and addresses, not random values from validation records.

## Windows and macOS path references

The integration tests used two Linux clients. These are path references, not claims of end-to-end Windows/macOS validation.

| Platform | Usual Planet directory | Notes |
| --- | --- | --- |
| Windows | `C:\ProgramData\ZeroTier\One\` | Administrator rights required. Stop/start ZeroTier One in Services around file replacement; join using the GUI |
| macOS | `/Library/Application Support/ZeroTier/One/` | Administrator rights required. Follow the installed version's official service-control instructions |

Android/iOS support for replacing Planet depends on the client build. This project neither packages mobile clients nor validates that workflow.

## If connection fails

- No member appears: check the Network ID, Planet hash, UDP port, security group, real public endpoint and client restart.
- Member appears with ACCESS_DENIED: verify its node ID and authorize it.
- OK without an IP: check address pools and assignment settings.
- IP assigned but no ping: check subnet overlap and both client firewalls' ICMP rules for the ZeroTier interface. Do not disable the entire firewall.
- UI opens but cannot create networks: check container logs and Controller health. Do not reinitialize existing data.
