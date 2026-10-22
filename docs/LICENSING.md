# 使用和分发边界

核对日期：2026-10-22。以 [ZeroTier 1.16.2 正式源码的 nonfree/LICENSE.md](https://github.com/zerotier/ZeroTierOne/blob/1.16.2/nonfree/LICENSE.md) 为准，本地副本在 `licenses/ZeroTier-Controller.txt`。

ZeroTier Agent 是 MPL-2.0。嵌入式 Controller 从 1.16 系列起使用单独的 Source-Available License，并非 OSI 开源许可证。`ZT_NONFREE=1` 恢复编译 Controller 的能力，不等于绕过或取消许可。

该许可列明个人、非商业环境的非商业用途。企业、政府、非营利组织、对外提供服务，以及纳入产品或发行物等定义更广，不能因为“免费”就推定允许。符合个人非商业条件的自用部署可按许可构建；其他用途须自行确认或向 ZeroTier 取得相应授权。

在所核对的正式许可和嵌入式 Controller 路径中，未发现个人自托管的客户端数量条款/硬编码套餐配额。这不代表无限性能，也不等同于 ZeroTier Central 云服务的免费套餐。

公开分发组合成品镜像与个人自用不是同一问题。许可包含非商业分发授权，同时对纳入发行物的定义较宽；本项目不替上游作扩大授权解释。因此仓库发布 Docker 构建文件和 UI 源码，默认由符合条件的使用者自行拉取官方源代码构建，不发布内含 nonfree Controller 的公共预构建镜像。若要公开推送完整镜像，请先获得 ZeroTier 对该分发场景的明确许可。

设置 `ACCEPT_ZEROTIER_SOURCE_LICENSE=yes` 仅表示你已阅读并确认自己的使用资格；它不会授予新的权利。GPL-3.0 的仓库 LICENSE 仅适用于本文注明的本仓库代码，不能替换 ZeroTier 的许可。
