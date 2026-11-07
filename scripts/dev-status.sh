#!/usr/bin/env bash
set -euo pipefail

SSH_HOST="${SFM_SSH_HOST:-ssh.fepdev.app}"
REMOTE_DIR="${SFM_REMOTE_DIR:-sfm-dev}"

echo "==> Túnel SSH"
systemctl --user is-active postgresql-tunnel.service || true
ss -ltn | grep -E ":(15432|6379)\b" || echo "   puertos locales no encontrados"

echo
echo "==> Redis (homelab)"
ssh "$SSH_HOST" "cd ~/$REMOTE_DIR && docker compose ps"
ssh "$SSH_HOST" "docker exec sfm-dev-redis redis-cli ping" 2>/dev/null || true

echo
echo "==> PostgreSQL"
pg_isready -h 127.0.0.1 -p 15432 -d fac_med_db -U sfm_dev
