[English](../TROUBLESHOOTING.md) | [中文首页](../../README.zh-CN.md)

# 故障排查

| 现象 | 先检查 | 下一步 |
| --- | --- | --- |
| `docker compose` 不存在 | 是否安装官方 Compose plugin | 参照 Docker Ubuntu 文档安装；不要换成 Compose v1 |
| 拉取镜像超时 | 到 Docker Hub 的 DNS/HTTPS | 使用自己可信网络/代理；不要关闭 TLS 校验、随机换镜像源 |
| Docker Hub 限流 | 是否匿名拉取 | 可在该服务器终端 `docker login`；浏览器登录与 Docker CLI 独立 |
| GitHub/Alpine/npm 超时 | 构建日志最后成功阶段 | 网络恢复后重新 build，会复用缓存；版本/摘要校验失败时先核对来源 |
| 编译被 Killed/OOM | `free -h` 与内核 OOM 日志 | 保持 BUILD_JOBS=1，增加可用内存后重试；不要影响已有业务内存 |
| 许可检查失败 | .env 中确认项 | 先阅读 LICENSING.md，符合条件后设置 yes；不是靠编译开关取消许可 |
| 初始化拒绝非空目录 | 是否旧安装或失败现场 | 保留目录检查原因；不要随手 `rm -rf data` |
| 容器无法读写数据 | data 子目录的 UID/GID 和权限 | 新装 init 会设置；恢复时保留 tar 里的所有权；运行 UID 为 10001 |
| `unhealthy`/循环重启 | `docker compose logs --tail=80 planet` | 确认 identity、planet、passwd、token 和三个端口配置都在；不要打印秘密文件 |
| 浏览器打不开 3443 | 是否在自己的电脑上开启 SSH 转发 | 默认只绑定服务器 loopback；浏览器用 `http://127.0.0.1:3443` |
| 用 https 报 TLS 错误 | 是否已部署反向代理证书 | 默认 UI 是 HTTP；不要绕过浏览器证书警告 |
| 下载返回 401 | 是否正确下载密钥 | 用 data/config/file_server.key；不要把密钥贴到 Issue；可改用 SCP |
| UI 登录失败 | 用户名/随机密码是否准确 | 用户名 admin；无固定默认密码；不要覆盖原 passwd |
| 创建网络后客户端不出现 | planet 是否一致、UDP 是否能到达 | 核对公网地址/端口、两层防火墙、客户端是否重启 |
| 授权后仍无 IP | Easy setup 地址池、IPv4 分配 | 重新核对设置，等待客户端刷新 |
| 有 IP 但 ping 不通 | 客户端防火墙、网段冲突、peer 路径 | 允许所需 ICMP/业务规则；不要直接关防火墙 |
| 更新后详情页很慢 | 版本、Controller 日志、成员数量 | 此版修复旧 HTTP 连接复用等待；耗时仍受资源与成员数量影响 |

提交 Issue 时只提供脱敏的版本、步骤、错误摘要和时间。不要上传 .env、data、备份、完整 inspect、密码、token、签名密钥或带密钥下载 URL。
