[English](../CLIENTS.md) | [中文首页](../../README.zh-CN.md)

# 客户端接入：从登录到两台设备互通

先完成 README 的启动检查。以下 UI 文案为英文；括号里解释含义。

## 1. 在界面创建私有网络

1. 登录后进入 **Networks**（网络列表，路径 `/controller/networks`）。
2. 点击 **Add network**（新建网络），填一个容易识别的名字，例如 `Home`，提交。
3. 记下页面的 16 位十六进制 **Network ID**。它不是服务器的 10 位节点 ID。
4. 在该网络进入 **Easy setup**，填写 `Network address in CIDR notation` 为 `10.235.0.0/24`，地址池起点 `10.235.0.10`，终点 `10.235.0.200`，点击 **Submit**。这个网段只是示例，应避开客户端家庭 LAN、VPN、Docker 和其他 ZeroTier 网络网段。
5. 保持网络为 Private。不要为省略授权而改成 Public。

## 2. 生成并获取 Planet 文件

新安装执行 README 第 5 步 `docker compose --profile tools run --rm init` 时，已使用 .env 的公网地址、UDP 端口和新生成的服务器身份完成自定义 Planet 的生成与签名，无需另找生成器。已有安装直接使用现有文件或已核验备份，不能重新初始化。详见 [完整生成与核验步骤](../../README.zh-CN.md#generate-planet)。

服务器上的文件是项目目录下 **data/dist/planet**。只有 `data/dist/` 是给客户端的公开分发文件；不要复制 `data/one/identity.secret`、`data/config/*signing.json` 或整个 data。

可在管理员电脑使用 SCP 取回（替换服务器和实际安装目录）：

```bash
scp root@YOUR_SERVER_IP:/root/docker-zerotier-planet-modern/data/dist/planet ./planet
```

核对服务端和客户端文件 SHA-256 相同：Linux 用 `sha256sum planet`，Windows PowerShell 用 `Get-FileHash .\planet -Algorithm SHA256`。

也提供带密钥的下载服务。默认仅 127.0.0.1:3000，需 README 中的 SSH 转发；密钥在 `data/config/file_server.key`。下载格式为 `http://127.0.0.1:3000/planet?key=<你自己的下载密钥>`。不要公开这个完整 URL，也不要将 UI 密码或 Controller token 当成下载密钥。SCP 无需查看下载密钥，更适合首次安装。

`data/dist/` 中还生成了 `.moon` 文件，供已有 Moon 运维经验的用户使用。本文验证的主流程使用 **替换 planet**，不是只 orbit Moon；不需要把两个步骤都做一遍。

## 3. Linux 客户端安装 Planet

先从 [ZeroTier 官方下载页](https://www.zerotier.com/download/) 安装客户端。下面命令在 **每一台客户端**执行；不要在 Planet 服务器容器中执行 `join`。

替换客户端 Planet 前，确认这台客户端允许短暂断网。已有客户端需要备份原文件；不要删除 identity.secret，否则节点 ID 会改变。

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

把下面占位符替换成第 1 步的真实 16 位 Network ID：

```bash
sudo zerotier-cli join YOUR_16_DIGIT_NETWORK_ID
```

```bash
sudo zerotier-cli info
```

记下这台客户端的 10 位节点 ID。此时网络可能为 `ACCESS_DENIED`，因为还没授权。

## 4. 授权两台客户端

回到管理 UI 的该网络详情页。在成员列表核对节点 ID，勾选对应 **Authorized**。只授权自己的设备。每台客户端执行：

```bash
sudo zerotier-cli listnetworks
```

预期目标网络状态 `OK`，并分配了 `10.235.0.x/24` 地址。若为空，检查 Easy setup 的地址池和 IPv4 自动分配设置。

在 A 上 ping B 的 **ZeroTier 地址**，在 B 上反向测试。例如 B 实际分到 `10.235.0.20` 时：

```bash
ping -c 10 10.235.0.20
```

同时检查 `zerotier-cli peers`，应能看到私有根节点。网络 ID、IP、节点 ID 都以自己的实际值为准，不要复制验证记录中的随机值。

## Windows / macOS 的位置提示

本次自动化联调实际运行了两个 Linux 客户端；下面是平台路径提示，不冒充 Windows/macOS 的端到端实测。

| 平台 | Planet 通常所在目录 | 提示 |
| --- | --- | --- |
| Windows | `C:\ProgramData\ZeroTier\One\` | 需要管理员权限；在服务管理器停止/启动 ZeroTier One，再替换文件；GUI 中加入网络 |
| macOS | `/Library/Application Support/ZeroTier/One/` | 需要管理员权限；服务控制方式参照所安装版本的官方文档 |

Android/iOS 等客户端是否允许替换 Planet，取决于所用客户端构建，本项目没有打包移动端客户端，也没有验证该流程。

## 接入不成功时

- 看不到成员：核对 Network ID、planet 摘要、UDP 端口、安全组、服务端实际公网地址，确认客户端服务重启过。
- 成员已出现但 ACCESS_DENIED：核对节点 ID 后在 UI 授权。
- OK 但没有 IP：检查地址池和分配开关。
- 有 IP 但 ping 不通：检查两端 OS 防火墙是否允许该网卡上的 ICMP、是否网段冲突；不要直接关闭整个防火墙。
- 页面可打开但不能创建网络：检查容器日志与 Controller 健康，不要重新初始化已有 data。
