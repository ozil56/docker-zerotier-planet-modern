[English README](../README.md) | [简体中文](zh-CN/LICENSING.md)

# Use and distribution boundaries

Reviewed on 2026-10-22 against [ZeroTier 1.16.2 nonfree/LICENSE.md](https://github.com/zerotier/ZeroTierOne/blob/1.16.2/nonfree/LICENSE.md); a copy is in [licenses/ZeroTier-Controller.txt](../licenses/ZeroTier-Controller.txt). The actual license governs.

The ZeroTier Agent is MPL-2.0. The embedded Controller in the 1.16 series has a separate Source-Available License, not an OSI open-source license. `ZT_NONFREE=1` enables compilation of the Controller; it does not bypass or remove license terms.

The license provides for noncommercial use in personal, noncommercial environments. Its definitions for organizations, providing services, and incorporation into products or distributions are broader than everyday usage: being free of charge does not itself establish eligibility. Eligible personal noncommercial users may build for their own use; other users must check their situation or obtain authorization from ZeroTier.

The reviewed official license and embedded Controller code path did not reveal a personal self-hosting client-count term or a hard-coded subscription quota. This is not a claim of unlimited capacity, nor a statement about ZeroTier Central cloud-service plans.

Public distribution of a combined image is a separate question from personal self-use. The license includes a noncommercial distribution grant, but also broad definitions covering incorporation into distributions. This project does not expand that grant on the upstream author's behalf. It publishes Docker build files and UI source for eligible users to fetch the official source and build themselves. **No public prebuilt image containing the nonfree Controller is provided.** Obtain explicit clarification/permission from ZeroTier for that distribution scenario before publishing one.

`ACCEPT_ZEROTIER_SOURCE_LICENSE=yes` records your confirmation of having read the license and checked your eligibility. It grants no additional rights. This repository's GPL-3.0 license applies only to the code identified in its notices; it cannot replace ZeroTier's separate license.
