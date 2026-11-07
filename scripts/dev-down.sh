#!/usr/bin/env bash
set -euo pipefail

SSH_HOST="${SFM_SSH_HOST:-ssh.fepdev.app}"
REMOTE_DIR="${SFM_REMOTE_DIR:-sfm-dev}"

echo "==> Deteniendo Redis en el homelab"
ssh "$SSH_HOST" "cd ~/$REMOTE_DIR && docker compose stop"

echo "Redis detenido. PostgreSQL y el túnel SSH siguen activos."
