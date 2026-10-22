# Credits, sources and licenses

This project modernizes the private Planet deployment approach and experience of [xubiaolin/docker-zerotier-planet](https://github.com/xubiaolin/docker-zerotier-planet). Thank you to xubiaolin and the contributors for making private Planet deployment accessible. The reference source commit was `9ade8a66db14dac2514c7056b77f91d9299f8583`.

The deployment and initialization code here was newly written; installation scripts without an explicit license in that repository were not copied. Planet generation uses ZeroTier's official idtool directly.

`ui/` is based on [Key Networks / ztncui](https://github.com/key-networks/ztncui), reference commit `1b2284864de48d2dcae22582fff122fe24909c3d`. Copyright belongs to Key Networks and the original contributors, under GPL-3.0. Original headers and the complete license are retained. Changes on 2026-10-22 include Node/argon2 and UI dependency updates, Bootstrap 5 migration, validation adaptations, Controller HTTP request fixes, session secrets and member updates. See [CHANGELOG.md](CHANGELOG.md). Thank you to Key Networks.

New code in this repository is GPL-3.0-only. That license does not cover the separately built ZeroTier Controller or replace third-party dependency licenses.

[ZeroTier One](https://github.com/zerotier/ZeroTierOne) 1.16.2 is pinned to `fc5c3ec22090b5b2a0f274e863651fe9ca489bf4`. The Agent is MPL-2.0; the `nonfree/` Controller uses ZeroTier Source-Available License 1.0. Builds fetch unmodified official source and retain upstream and ext/ dependency licenses in the image. Thank you to the ZeroTier authors and contributors. See [licensing boundaries](docs/LICENSING.md).

Node.js, Alpine Linux and npm dependencies retain their own licenses. Installed npm package licenses are preserved; exact versions and integrity records are in `ui/package-lock.json`. This project is not an official product of, or endorsed by, the named authors.

[简体中文](THIRD_PARTY_NOTICES.zh-CN.md)
