[English README](../README.md) | [简体中文](zh-CN/BACKUP.md)

# Backup and disaster recovery

## What a backup contains

`sh scripts/backup.sh` briefly stops this project's service, archives all of `data`, `.env`, `compose.yaml` and the actual current Docker image, then restores the previous running state. A previously stopped service stays stopped. Notify users before running it.

Each `backups/<UTC timestamp>/` contains:

- `state.tar.gz`: identity, network/member database, account hashes, signing keys, download key and Compose configuration.
- `image.tar.gz`: export of the actual image ID, independent of a mutable tag.
- `image-id.txt` and `SHA256SUMS`: version and integrity records.

The directory has private permissions, but **the tar.gz files are not encrypted**. Copy them securely to controlled off-host storage and encrypt them there. Do not publish them or send them to untrusted recipients. A copy on the same disk cannot protect against loss of that server.

```bash
sh scripts/backup.sh
```

```bash
docker compose ps
```

Expect exit code 0 and the previously running service to become healthy again. If backup fails, check disk space/permissions and verify service recovery before reporting success.

## Restore into an empty directory

Copy the source and one complete trusted backup directory to the destination server. **Stop the old instance before the restored identity goes online. Never run two instances with the same identity.** In a root Bash terminal, replace `BACKUP_DIR` with the actual absolute path:

```bash
BACKUP_DIR=/root/private-backups/20261022T000000Z
```

```bash
cd "$BACKUP_DIR"
```

```bash
sha256sum -c SHA256SUMS
```

Expect three `OK` results. Never extract an untrusted archive as root.

```bash
docker image load -i image.tar.gz
```

```bash
docker tag "$(cat image-id.txt)" zerotier-planet-modern:restore
```

Create a new directory. If it already exists, stop and choose a different name:

```bash
mkdir /root/planet-restored
```

```bash
tar -xzf "$BACKUP_DIR/state.tar.gz" -C /root/planet-restored
```

```bash
cd /root/planet-restored
```

```bash
PLANET_IMAGE=zerotier-planet-modern:restore docker compose up -d --no-build planet
```

The archived Compose file is sufficient for `--no-build`. **Do not run init.** Check `docker compose ps`, sign in again, and verify the original network IDs, member authorizations, pools and distribution files. Test communication between two clients. Confirm identity files match the backup.

Clients do not need a new Planet when the public IP and UDP port remain unchanged. If the endpoint changes, the signed Planet's endpoints also need attention; **editing .env alone does not make clients discover the new address**. This first release has no one-command endpoint re-signing/distribution feature. Plan and test endpoint changes separately before migration.

## Roll back a failed upgrade

Stop the new container and preserve its state for investigation. Restore the pre-upgrade image and data into a separate directory using the procedure above. Do not let an old program modify data already migrated by a newer version. Rollback is complete only after health, original state and two-client communication pass. Never bring both identities online at once.
