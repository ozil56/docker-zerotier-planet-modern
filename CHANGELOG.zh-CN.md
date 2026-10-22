# 改动记录

## 2026.10.22

- 固定 ZeroTier 1.16.2 正式源码，启用嵌入式 Controller，关闭本项目不使用的 SSO/Central 构建。
- Node 24.22.1 / Alpine 3.24；argon2 0.45.1；保留旧 argon2 哈希验证兼容性。
- UI 从 ztncui 0.8.14 维护：Bootstrap 5.3.8、Bootstrap Icons 1.13.1、express-validator 7.3.2、ip-address 10.7.4、morgan 1.12.1；依赖锁定。
- 移除旧 got/sprintf 依赖；控制器本地 HTTP 请求增加总时限与响应上限，不重用已关闭的连接，不跟随重定向。
- 修复会话随机密钥、成员更新响应、删除 IP 后重复响应、成员名称操作和 CIDR 校验。
- 新增 Docker Compose、随机初始化密码、官方 idtool 生成 planet/moon、重复初始化保护和一致性备份脚本。
- 运行容器非 root、无附加 capabilities、只读根文件系统；UI/下载默认只绑定 loopback；Controller API 不映射公网。
- 明确来源、GPL UI 与 ZeroTier Controller 的独立授权边界；提供详细安装、客户端、恢复及故障排查文档。
