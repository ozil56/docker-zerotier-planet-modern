# 来源、感谢与许可证

本项目基于 [xubiaolin/docker-zerotier-planet](https://github.com/xubiaolin/docker-zerotier-planet) 的私有 Planet 部署方案与使用体验开展现代化维护。感谢 xubiaolin 及贡献者让私有 Planet 的部署更容易。参考时的源码提交为 `9ade8a66db14dac2514c7056b77f91d9299f8583`。

本仓库新编写部署流程与初始化代码，不复制该仓库没有明确许可的安装脚本；Planet 生成直接调用 ZeroTier 官方 idtool。

`ui/` 基于 [Key Networks / ztncui](https://github.com/key-networks/ztncui)，参考提交 `1b2284864de48d2dcae22582fff122fe24909c3d`。版权属于 Key Networks 及原贡献者，GPL-3.0，原版权头与完整 LICENSE 保留。2026-10-22 的修改包括 Node/argon2 与 UI 依赖更新、Bootstrap 5 迁移、表单校验适配、控制器 HTTP 请求修复、会话密钥和成员更新修复。详见 CHANGELOG.md。感谢 Key Networks。

本仓库新代码亦使用 GPL-3.0-only。此授权不覆盖单独构建的 ZeroTier Controller，也不改变第三方包的许可证。

[ZeroTier One](https://github.com/zerotier/ZeroTierOne) 1.16.2 源码提交固定为 `fc5c3ec22090b5b2a0f274e863651fe9ca489bf4`。Agent 为 MPL-2.0；`nonfree/` Controller 为 ZeroTier Source-Available License 1.0。构建从官方仓库获取源代码，不修改其源码；镜像保留上游及 ext/ 依赖许可。感谢 ZeroTier 的作者与贡献者。阅读 [许可边界](docs/LICENSING.md)。

Node.js、Alpine Linux 和 npm 依赖各自遵循原许可证；npm 包的 LICENSE 随安装保留，精确版本和完整性信息见 `ui/package-lock.json`。项目不代表上述作者的官方产品或获得其背书。
