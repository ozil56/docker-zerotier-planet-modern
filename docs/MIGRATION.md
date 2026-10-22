# 升级、旧版迁移与回退

## 本项目后续升级

1. 通知短暂中断，运行 `sh scripts/backup.sh`；把备份复制离机。
2. 在独立测试环境先验证新镜像。测试环境使用独立身份，不能直接启动生产身份的联网副本。
3. 阅读新版本说明，再更新源码、构建新镜像；构建本身不会停止运行中的容器。
4. 计划窗口执行 `docker compose up -d --no-build planet`，让 Compose 使用新镜像。
5. 核对 healthy、UI 登录、全部原网络 ID/授权成员/地址池、Planet 摘要和两台客户端互通。重启导致 UI 需要重新登录属正常现象。
6. 失败时停止新版，按 BACKUP.md 恢复升级前镜像与数据；不要删除旧备份。

不要直接 `git pull` 后无条件 `up --build` 到生产。源码、依赖锁文件、镜像、数据是不同的恢复材料。

## 从 xubiaolin/docker-zerotier-planet 迁移

已有业务用户不要执行 README 的新装初始化。旧版目录、镜像和环境参数可能不同，先记录自己的实际挂载、版本和端口，只读取必要字段，避免把密码/完整 Docker inspect 发到网上。

需要保留的对应关系：

| 旧数据 | 新目录 | 说明 |
| --- | --- | --- |
| ZeroTier one 数据目录 | `data/one` | 整体保留，包括 identity、planet、authtoken、controller.d；不重新生成身份 |
| ztncui etc | `data/ui-etc` | 保留 passwd、storage、网络成员名称等 |
| 文件下载配置 | `data/config` | `zerotier-one.port`、`file_server.port`、`file_server.key`；下载内部端口固定 3000 |
| 已分发 planet / moon | `data/dist` | 保持字节一致，避免要求现有客户端重装 |

新容器自动从 `one/authtoken.secret` 读取 API token，控制端点取 `config/zerotier-one.port`，UI 内部端口固定 3443；一般不再需要旧 .env 内复制的 token。旧版若有定制 HTTPS、SSO、外部 DB、服务器自身入网、TUN 或额外进程，本项目不能直接替换。

迁移前停止旧容器得到一致备份，保留旧镜像和原始目录，将备份副本映射到新结构，确认所有持久化子目录属于 `10001:10001`。保持原公网端点、身份、planet、网络数据库和账号哈希；先用 `--network none` 对副本做离线校验，再安排唯一实例切换。

本文没有提供会自动移动/删除旧目录的一键迁移脚本，因为错误识别旧挂载会直接影响网络连续性。已有部署的兼容验证不能替代对你自己目录、插件和定制项的检查。

## 已知范围

- 支持此仓库验证的嵌入式 FileDB Controller；编译参数是 `ZT_NONFREE=1 ZT_CONTROLLER=0 ZT_SSO_SUPPORTED=0`。`ZT_CONTROLLER=0` 指不启用 Central/Postgres 构建，不表示关闭嵌入式 Controller。
- 新版本使用非 root、无 capabilities 的 Planet/Controller 模式；服务器自身不加入虚拟网络。客户端才需要 TUN/相应权限。
- IPv6 端点语法可配置，但本次新装端到端测试主要验证 IPv4，不能仅凭云控制台有 IPv6 就认为系统已可用。
- 切换会短暂影响根节点/控制器与管理界面；既有点对点数据链路可能继续，但不能把它当成零中断保证。
