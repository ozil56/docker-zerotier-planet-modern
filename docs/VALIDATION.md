# 验证记录 — 2026-10-22

本页记录实际执行结果，不把文档中的所有平台示例都当作已实测。

## 环境与构建

- 独立测试机 ali-test，Ubuntu 26.04，Linux amd64，Docker 29.1.3，Compose 2.40.3。
- 生产服务没有参与本次发行包测试；测试重新生成独立服务器身份和两个客户端身份。
- 从仓库 Dockerfile 的固定官方源码完成构建，耗时约 590 秒。运行版本为 Node 24.22.1、ZeroTier 1.16.2、Alpine 3.24.3。
- 基础镜像从 Docker 官方 registry 下载并逐层校验摘要；测试机直连 Hub 超时，导入校验后的相同镜像。GitHub/Alpine/npm 下载通过受限的临时网络代理，TLS 校验保持启用。
- ZeroTier 正式提交和归档 SHA-256、Node 基础镜像观察摘要见 `sources.lock.json`。基础镜像标签和 Alpine 安全包可能随时间变化，因此不宣称每次构建逐字节相同。

## 按文档执行的结果

| 文档步骤 | 实际验证 | 结果 |
| --- | --- | --- |
| .env 配置 / Compose 校验 | 从示例生成配置，`docker compose config --quiet` | 通过 |
| 构建 | 执行同一 Dockerfile 全部阶段，编译正式源码并 npm ci | 通过 |
| 初始化 | `docker compose --profile tools run --rm init` | 通过，独立随机身份/密码 |
| 防误覆盖 | 再次 init，检查拒绝和原身份摘要 | 通过，身份不变 |
| 启动 / 状态 | `docker compose up -d --no-build planet` 和健康检查 | 通过 |
| CLI | README 的 `zerotier-cli -D/var/lib/zerotier-one info` | 通过，版本 1.16.2 |
| UI 登录 | 使用生成的随机管理员密码提交登录表单 | 通过 |
| 网络 | UI 表单创建私有网络，配置 Easy setup 地址池 | 通过 |
| 下载 | 无密钥返回 401，有密钥内容与 planet 完全一致 | 通过 |
| 客户端 | 两个新 Linux 客户端加入网络，UI 表单授权，状态 OK | 通过 |
| 首次通信 | A→B、B→A 各 10 包 ping | 两个方向均 0 丢包 |
| 重启 | Compose restart，重新登录、原网络、客户端复验 | 通过；双向各 10 包 0 丢包 |
| 备份 | 文档提供的 backup.sh，实际导出数据与镜像并恢复运行 | 通过，SHA256SUMS 核对通过 |
| 恢复 | 停止测试实例，解压备份、导入镜像、用恢复数据启动 | 通过；身份/Planet/账号哈希不变 |
| 恢复后通信 | 再次登录、原网络、两个客户端复验 | 双向各 10 包 0 丢包 |
| 权限 | 实际检查容器配置 | UID 10001、cap_drop ALL、非 privileged、只读根文件系统 |
| 收尾 | 停止测试根节点和两个客户端 | 已停止，数据保留 |

可复查的脱敏步骤摘要见 `validation-results.json`。同一测试脚本为 `tests/integration.py`，只能在专门的新测试目录运行，见文件头。它创建 internal Docker 网络并取消主机端口映射，不能指向既有生产数据。

## 发现并修正的问题

1. 最初 Git fetch 遇到网络中断，改为固定提交归档加 SHA-256 校验后构建成功。
2. 最初 Compose tmpfs 的 flow-list 字符串没有引号，配置校验通过但容器创建失败；已修正并在新空目录从头运行成功。
3. 复查 README 时修正 ZeroTier CLI home 参数，最终文档命令已实际执行。

## 安全复核

2026-10-22 使用锁文件执行 `npm audit --omit=dev`，结果为 **0 项已知告警**。这仅是 npm 公告覆盖的依赖检查；不是对所有操作系统包、核心协议、业务逻辑的完整安全认证，也不是未来无漏洞的保证。

所有公开文件经过私有基础设施标记和敏感文件排查；仓库不含运行数据、私钥、Token、用户密码、服务器清单和业务备份。UI 原有版权和许可证保留。

## 尚未覆盖

- Docker Engine 在空白 Ubuntu 上的首次安装：验证机已有 Docker，文档引用官方安装教程。
- 云安全组、公网 UDP、域名 TLS 与真实跨公网 NAT 的全新接入：本轮端到端通信使用隔离网络；真实部署仍需 CLIENTS.md 的两台设备验收。
- Windows/macOS/移动客户端的完整新装过程、ARM 架构、SSO、服务器自身入网模式、外部 DB。
- IPv6 实际路由与公网可达性、迁移后更改公网端点的自动重签与分发。

没有把这些未验证项目写成“已支持并验证”。
