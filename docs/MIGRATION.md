[English README](../README.md) | [简体中文](zh-CN/MIGRATION.md)

# Upgrades, migration and rollback

## Upgrading this project

1. Notify users of the brief interruption, run `sh scripts/backup.sh`, and copy the backup off-host.
2. Validate the candidate image in an independent test environment. Use independent identities; never start an online copy of a production identity.
3. Read the release notes, update the source and build the image. Building does not stop the running container.
4. During the maintenance window, run `docker compose up -d --no-build planet` to switch to the new image.
5. Check health, UI login, all original network IDs, authorized members, pools, Planet hash and two-client communication. Reauthentication after restart is expected.
6. On failure, stop the new instance and follow [backup and recovery](BACKUP.md) with the pre-upgrade image and state. Retain older backups.

Do not blindly run `git pull` followed by `up --build` on production. Source, dependency lockfiles, image and persistent data are distinct recovery materials.

## Migrating from xubiaolin/docker-zerotier-planet

Do not follow the fresh-install initialization steps for an existing service. Old directories, images and environment settings vary. Record the actual mounts, versions and ports, reading only necessary metadata; do not publish secrets or full Docker inspect output.

| Existing data | New location | Preserve |
| --- | --- | --- |
| ZeroTier one directory | `data/one` | Entire directory, including identity, planet, authtoken and controller.d; never regenerate identity |
| ztncui etc | `data/ui-etc` | passwd, storage, member names and other UI state |
| Download configuration | `data/config` | zerotier-one.port, file_server.port and file_server.key; internal download port must be 3000 |
| Distributed planet / moon | `data/dist` | Preserve exact bytes so clients do not need replacement files |

The new container reads the API token from `one/authtoken.secret` and the control endpoint from `config/zerotier-one.port`. Its internal UI port is 3443. The old .env's copied token is generally unnecessary. Custom internal HTTPS, SSO, external databases, server network membership, TUN or additional processes require separate compatibility work; this project is not a direct replacement for those setups.

Stop the old container to create a consistent backup. Keep the original image and directories. Map a copy of the backup into the new structure and ensure persistent subdirectories belong to `10001:10001`. Preserve the public endpoint, identity, planet, Controller database and password hashes. Check the copy offline with `--network none` before scheduling a single-instance cutover.

There is no automatic script that guesses old mounts and moves or deletes data: an incorrect mapping could break existing networks. Testing a particular deployment does not replace reviewing your own mounts, extensions and customizations.

## Scope

- This repository tests the embedded FileDB Controller with `ZT_NONFREE=1 ZT_CONTROLLER=0 ZT_SSO_SUPPORTED=0`. `ZT_CONTROLLER=0` disables the Central/Postgres build, not the embedded Controller.
- The unprivileged server provides Planet/Controller functions without joining a virtual network. Clients need TUN and the appropriate privileges.
- IPv6 endpoints can be configured, but this fresh-install integration test primarily covered IPv4. An address in a cloud console alone does not establish usable OS routing.
- Cutover briefly interrupts root/controller/UI availability. Existing peer-to-peer data paths may continue, but that is not a guarantee of zero interruption.
