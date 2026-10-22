[English](README.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [日本語](README.ja.md)

# Docker ZeroTier Planet Modern

基于 [xubiaolin/docker-zerotier-planet](https://github.com/xubiaolin/docker-zerotier-planet) 部署方案的现代化维护版本：私有 Planet、嵌入式 Controller、ztncui 管理界面，使用 Docker Compose 构建和运行。

我一直觉得原项目很好，它让私有 Planet 的部署变得简单。这次 Node.js 安全漏洞排查促使我检查整套运行环境，也觉得自己一直使用的版本中 ZeroTier 核心长期没有跟进新版本很可惜。因此整理了这套升级、测试和恢复流程，希望在保留熟悉使用方式的同时，让更新与维护更容易。非常感谢 xubiaolin 和原项目贡献者，也感谢 Key Networks 的 ztncui 和 ZeroTier 的作者。

这里描述的是本次维护的缘由，不对上游当前维护状态作判断。来源、版权和修改范围见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.zh-CN.md)。本项目不是上述项目的官方发行版。

**自定义 Planet 会在初始化时自动生成，客户端下载文件为 `data/dist/planet`。** 直接查看 [生成步骤](#generate-planet) 和 [获取文件、替换客户端 Planet 的步骤](#custom-planet)。只在管理界面创建网络，还没有完成客户端的私有 Planet 配置。

## 这个版本包含什么

| 部件 | 固定版本 / 方式 |
| --- | --- |
| ZeroTier | 正式版 1.16.2，源码固定到提交；启用嵌入式 Controller |
| Node.js | 24.22.1，官方 Alpine 3.24 Docker 基础镜像 |
| ztncui | 0.8.14 基础上的本仓库维护版本 |
| 密码哈希 | argon2 0.45.1 |
| UI | Bootstrap 5.3.8；依赖锁定到 package-lock.json |
| 运行权限 | UID 10001、cap_drop ALL、只读根文件系统；不需要 privileged 或 TUN |
| 初始化 | 每次全新安装生成独立身份、签名密钥和随机管理员密码 |

它只提供 Planet/Controller/UI；服务器容器不加入用户网络。本版关闭 SSO 编译，面向普通非 SSO 的私有网络。首次发布主要验证 Linux amd64；没有验证的架构和客户端平台不会宣称支持。

## 先阅读这三点

1. **新装和升级不是同一流程。** 已有 Planet 请先读 [迁移与回退](docs/zh-CN/MIGRATION.md)，不要在旧数据目录运行初始化。
2. **许可需要自己确认。** ZeroTier 1.16.2 Controller 使用单独的 Source-Available License。个人非商业自用与公开分发成品镜像不同。阅读 [许可说明](docs/zh-CN/LICENSING.md) 后再构建。本仓库不提供含该 Controller 的公共预构建镜像。
3. **核心身份必须备份。** `data/one/identity.secret`、Controller 网络数据库、UI 账号、Planet 签名配置应一起保留。丢失它们可能无法恢复原网络。仓库和 Docker 镜像不含任何已生成身份。

## 从零安装：Ubuntu 服务器

下列命令在服务器的 SSH 终端执行；客户端操作会明确另行说明。以下以 root 登录为例，普通管理员先执行 `sudo -i`。示例公网地址 `203.0.113.10` 必须换成自己的实际 IPv4，不能照抄。

### 1. 检查 Docker 和 Compose

```bash
docker version
```

```bash
docker compose version
```

预期同时有 Docker Server 信息和 Compose v2。本文使用 Compose 2.24 或更新版本。缺少 Docker 时按 [Docker 官方 Ubuntu 安装说明](https://docs.docker.com/engine/install/ubuntu/) 安装 Engine 和 Compose plugin 后再继续。不要安装旧的 Python `docker-compose`。验证机已有 Docker，因此本项目测试不把 Docker 的首次安装计作已验证步骤。

```bash
uname -m
```

本次验证结果为 `x86_64`。推荐至少 2 GB 内存、8 GB 可用磁盘；源码构建默认单任务，以降低内存峰值。构建时需要访问 Docker Hub、GitHub、Alpine 和 npm 官方源。

### 2. 获取项目

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

若 Git 克隆因网络限制失败，可使用 GitHub 官方源码归档（这是 中国境内测试服务器实测的获取方式）：

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

这个备用路径要求目标目录不存在；不要往已有部署目录覆盖解压。没有 curl 时可用 `apt-get install -y curl` 安装。源码归档不带 Git 历史；以后更新仍应按迁移文档先备份。

之后的服务端命令都在这个目录执行。它也是数据目录的父目录；不要随意更换工作目录。

### 3. 填写安装配置

```bash
cp .env.example .env
```

```bash
nano .env
```

需要修改：

| 变量 | 如何填写 |
| --- | --- |
| `PUBLIC_IPV4` | 服务器可被客户端访问的公网 IPv4；云控制台可查询 |
| `PUBLIC_IPV6` | 可选。确认系统内 IPv6 地址、路由和防火墙均可用后再填；否则留空 |
| `ACCEPT_ZEROTIER_SOURCE_LICENSE` | 阅读许可并确认用途符合后设为 `yes` |
| `ZT_PORT` | 默认 `9994`，UDP 外部端口与容器内端口相同；初始化后不要随意更改 |
| `UI_BIND` / `DOWNLOAD_BIND` | 新用户保持 `127.0.0.1`，通过 SSH 转发访问 |

```bash
chmod 600 .env
```

```bash
docker compose config --quiet
```

预期无报错。此时还没有创建服务器身份。

### 4. 构建镜像

```bash
docker compose build planet
```

首次会下载和编译，通常需要几分钟到十几分钟。预期最后完成镜像构建，命令退出码为 0。没有 Docker Hub 账号也可拉取公共基础镜像并自行构建；遇到 Hub 拉取限流时可在自己的终端 `docker login`。浏览器登录 Hub 不会自动登录服务器 Docker。

不要使用 `docker compose pull` 获取本项目：本版发布的是自行构建流程，没有公共成品镜像。网络超时、编译失败的处理见 [故障排查](docs/zh-CN/TROUBLESHOOTING.md)。

<a id="generate-planet"></a>

### 5. 生成自定义 Planet，并完成一次性初始化

```bash
docker compose --profile tools run --rm init
```

预期显示 `Initialized`，并生成 `data/one`、`data/ui-etc`、`data/config`、`data/dist`。初始化不自动覆盖旧身份；重复运行应报 `Refusing to initialize non-empty data directory`，这是保护措施。

**上面的命令就会生成你自己的 `planet` 文件，不需要另找 mkworld 工具或手动再生成一次。** 执行前，第 3 步必须已经填写实际的 `PUBLIC_IPV4`、可选且确实可用的 `PUBLIC_IPV6` 和 `ZT_PORT`。初始化会生成新的服务器身份和签名密钥，再调用 ZeroTier 官方 idtool，签出包含该身份和这些公网端点的 Planet。

| 生成位置，相对于项目目录 | 用途 |
| --- | --- |
| `data/dist/planet` | 分发给每台客户端的自定义 Planet；文件名就是 `planet`，没有扩展名 |
| `data/one/planet` | 服务端使用的同一份 Planet |
| `data/dist/*.moon` | 额外生成的 Moon 文件，不能替代下文的 Planet 替换步骤 |
| `data/one/identity.secret`、`data/config/planet-signing.json`、`data/config/moon-signing.json` | 私有身份和签名材料；需私下备份，绝不能分发给客户端 |

在**服务器的项目目录**确认文件生成成功：

```bash
ls -lh data/dist/planet
```

```bash
sha256sum data/one/planet data/dist/planet
```

预期文件大小非零，两行 SHA-256 相同。Planet 是经过签名的二进制文件，不是可以手工编辑的文本，也不是从本仓库下载的通用文件。使用这个 Planet 的客户端都安装同一份文件；在同一个 Controller 中另建网络，不需要重新生成 Planet。

**已有部署要取文件时，不要重新执行 init。** 直接取现有的 `data/dist/planet`，或从已核验的备份恢复；不要删除 data 来绕过初始化保护。初始化后再改 .env 不会重写已签名的 Planet；更换公网地址或端口需要另行规划重新签名与分发，本版没有自动完成该操作的功能。


```bash
cat data/initial-admin-password.txt
```

**这条命令只供你在自己的终端读取随机密码，不要将输出贴到 Issue、日志或聊天中。** 用户名为 `admin`。将密码保存到密码管理器后，删除这一份初始明文文件；这不会改变 UI 中已保存的密码哈希。

```bash
rm -- data/initial-admin-password.txt
```

### 6. 启动并检查

```bash
docker compose up -d --no-build planet
```

```bash
docker compose ps
```

等待约 30–60 秒，应显示 `Up` 和 `healthy`。若变为 `unhealthy` 或不断重启，先看 [故障排查](docs/zh-CN/TROUBLESHOOTING.md)，不要删除 data 重装。

```bash
docker compose exec planet zerotier-cli -D/var/lib/zerotier-one info
```

预期版本 `1.16.2`。隔离实验环境中 `OFFLINE` 不一定是失败，需要结合客户端入网和通信测试判断。正常公网部署还应验证根节点可达。

### 7. 打开管理界面

默认不把 UI 明文 HTTP 暴露公网。**在你自己的电脑上**新开一个终端，替换 `YOUR_SERVER_IP` 后执行，并保持窗口打开：

```bash
ssh -N -L 3443:127.0.0.1:3443 -L 3000:127.0.0.1:3000 root@YOUR_SERVER_IP
```

浏览器打开 **http://127.0.0.1:3443**，用 `admin` 和第 5 步的随机密码登录。注意是 `http`；端口名 3443 不代表它默认提供 HTTPS。若本机端口冲突，将左侧 3443 改成 13443，再打开 http://127.0.0.1:13443。

长期使用域名时建议在宿主 nginx/Caddy 配置 HTTPS，反向代理到 `127.0.0.1:3443`。本仓库没有自动申请证书或更改已有反向代理。

<a id="custom-planet"></a>

### 8. 获取自定义 Planet，安装到客户端并入网

#### 8.1 在管理界面创建私有网络

进入 **Networks → Add network**，填写名称，点击 **Create Network**。记下 **16 位十六进制 Network ID**。打开该网络的 **Easy setup**，选择不与客户端 LAN、VPN、Docker 冲突的网段和地址池，再提交。例如 CIDR `10.235.0.0/24`，地址池 `10.235.0.10`–`10.235.0.200`。保持网络为 Private。

Network ID 标识要加入的虚拟网络；`planet` 文件告诉客户端去使用哪些私有根节点。**两者都需要，不能互相替代。**

#### 8.2 把生成好的 Planet 取到自己的电脑

**推荐使用 SCP。** 在**你自己的电脑**打开终端，替换服务器地址；如果项目装在其他目录，也要修改绝对路径：

```bash
scp root@YOUR_SERVER_IP:/root/docker-zerotier-planet-modern/data/dist/planet ./planet
```

文件会保存到你电脑当前目录的 `planet`。如果 SSH 不是默认端口，在 scp 后增加 `-P YOUR_SSH_PORT`。文件名保持 `planet`，不要保存成 `planet.txt`。只取这个分发文件，不能把服务器的 identity.secret、签名 JSON 或整个 data 复制给客户端。

**也可以通过带密钥的下载服务获取。** 先启动服务，并保持第 7 步的 SSH 隧道打开，包含 3000 端口转发。在**服务器项目目录**私下读取下载密钥：

```bash
cat data/config/file_server.key
```

在自己电脑的浏览器中，将 `YOUR_DOWNLOAD_KEY` 换成该值后打开：

```text
http://127.0.0.1:3000/planet?key=YOUR_DOWNLOAD_KEY
```

将下载内容保存为 `planet`。密钥不正确时返回 `401 Unauthorized` 是预期行为。这个密钥不是 UI 密码，也不是 Controller API token；不要公开完整下载 URL 或把密钥发到 Issue。下载端口仍绑定服务器本地地址，通过 SSH 隧道访问。

将下载文件的 SHA-256 与第 5 步服务器结果比较。在 Linux 上：

```bash
sha256sum ./planet
```

在 Windows PowerShell 上：

```powershell
Get-FileHash .\planet -Algorithm SHA256
```

必须与服务端 `data/dist/planet` 的摘要一致，再安装到客户端。

#### 8.3 在每台客户端替换 Planet

先安装 ZeroTier 客户端。把下载的 `planet` 放到**每台 Linux 客户端**当前目录中，安排允许短暂断网的时间，再在客户端依次执行下列命令；不要在 Planet 服务端容器里执行。保留客户端原有 `identity.secret`。若 `planet.before-private` 已存在，应换一个新的备份文件名，避免覆盖以前的备份。

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

| 客户端平台 | Planet 文件位置 | 替换方法 |
| --- | --- | --- |
| Linux | `/var/lib/zerotier-one/planet` | 使用上述命令 |
| Windows | `C:\ProgramData\ZeroTier\One\planet` | 管理员权限，在服务管理器停止 ZeroTier One，备份并仅替换 planet，再启动服务 |
| macOS | `/Library/Application Support/ZeroTier/One/planet` | 管理员权限，按所装版本的服务管理方式停止服务，备份并替换 planet，再启动服务 |

本项目本轮只完整验证了 Linux 客户端；Windows/macOS 这里是路径提示，移动客户端还取决于具体构建。详情和排障见 [客户端指南](docs/zh-CN/CLIENTS.md)。本流程使用**替换 Planet**，仅导入或 orbit `.moon` 文件不是同一操作。

#### 8.4 加入网络、授权并验证通信

在每台 Linux 客户端执行，把占位符替换为 8.1 记录的真实 Network ID：

```bash
sudo zerotier-cli join YOUR_16_DIGIT_NETWORK_ID
```

```bash
sudo zerotier-cli info
```

核对客户端的 10 位节点 ID，在管理界面对应成员处勾选 **Authorized**，随后检查：

```bash
sudo zerotier-cli listnetworks
```

预期目标网络状态为 `OK`，并分配了 ZeroTier IP。用分配的地址测试 A→B、B→A，例如**仅当 B 确实分到下面地址时**：

```bash
ping -c 10 10.235.0.20
```

服务器云安全组和主机防火墙应允许 `ZT_PORT`（默认 **UDP 9994**）。若已分配 IP 但无法通信，检查客户端防火墙规则。不要开放 Controller HTTP 管理 API，也不要关闭整个防火墙。只有管理界面能打开，不代表客户端接入已成功。

### 9. 立即做第一份备份

确认允许短暂中断后执行：

```bash
sh scripts/backup.sh
```

此脚本会停止本项目容器，备份数据和当前镜像，完成后恢复原来的运行状态。详细内容、离机保存和恢复步骤见 [备份与恢复](docs/zh-CN/BACKUP.md)。

## 日常维护

| 目的 | 在项目目录执行 |
| --- | --- |
| 查看状态 | `docker compose ps` |
| 查看最近日志 | `docker compose logs --tail=80 planet` |
| 停止 | `docker compose stop planet` |
| 启动 | `docker compose up -d --no-build planet` |
| 短暂重启 | `docker compose restart planet` |
| 更新 | 先备份，再按 [迁移与回退](docs/zh-CN/MIGRATION.md) 执行 |

重启会使 UI 登录会话失效；不会重新生成身份或删除网络。重启后的业务验收应包括原网络、授权成员和两台客户端互通。`unless-stopped` 会在 Docker/主机重启后恢复运行；手动停止的容器保持停止。

## 文档与验证

- [客户端接入](docs/zh-CN/CLIENTS.md)
- [备份与恢复](docs/zh-CN/BACKUP.md)
- [升级、旧版迁移与回退](docs/zh-CN/MIGRATION.md)
- [故障排查](docs/zh-CN/TROUBLESHOOTING.md)
- [许可说明](docs/zh-CN/LICENSING.md)
- [实际验证记录](docs/zh-CN/VALIDATION.md)
- [改动清单](CHANGELOG.zh-CN.md)

漏洞扫描是某一时刻的结果，不代表永久没有漏洞。后续维护应结合 Node、ZeroTier、Alpine 与 npm 公告重新评估和测试，不要仅因可升级就把所有包标为高危。
