#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
set -eu
cd "$(dirname "$0")/.."
test -d data/one && test -f data/one/identity.secret
umask 077
stamp=$(date -u +%Y%m%dT%H%M%SZ)
dest="backups/$stamp"
test ! -e "$dest"
mkdir -p "$dest"
cid=$(docker compose ps -aq planet)
test -n "$cid" || { echo 'Create the planet container before backup.' >&2; exit 1; }
image=$(docker inspect -f '{{.Image}}' "$cid")
running=$(docker inspect -f '{{.State.Running}}' "$cid")
resume() { if [ "$running" = true ]; then docker compose start planet >/dev/null; fi; }
trap resume EXIT
echo 'Stopping planet for a consistent backup; it will return to its prior running state.'
docker compose stop planet >/dev/null
tar -czf "$dest/state.tar.gz" data .env compose.yaml
docker image save -o "$dest/image.tar" "$image"
gzip "$dest/image.tar"
printf '%s\n' "$image" > "$dest/image-id.txt"
(cd "$dest" && sha256sum state.tar.gz image.tar.gz image-id.txt > SHA256SUMS)
echo "Backup ready: $dest (contains secrets; keep private and copy securely off-host)."
