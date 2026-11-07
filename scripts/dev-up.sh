#!/usr/bin/env bash
set -euo pipefail

SSH_HOST="${SFM_SSH_HOST:-ssh.fepdev.app}"
REMOTE_DIR="${SFM_REMOTE_DIR:-sfm-dev}"

echo "==> Verificando túnel SSH (PostgreSQL + Redis)"
if ! systemctl --user is-active --quiet postgresql-tunnel.service; then
  systemctl --user start postgresql-tunnel.service
fi

echo "==> Arrancando Redis en el homelab"
ssh "$SSH_HOST" "cd ~/$REMOTE_DIR && docker compose up -d"

echo "==> Esperando Redis local en 127.0.0.1:6379"
for _ in $(seq 1 30); do
  if nc -z 127.0.0.1 6379 2>/dev/null; then
    break
  fi
  sleep 1
done

ssh "$SSH_HOST" "docker exec sfm-dev-redis redis-cli ping"

echo "==> Verificando PostgreSQL por el túnel"
pg_isready -h 127.0.0.1 -p 15432 -d fac_med_db -U sfm_dev

cat <<'EOF'

Entorno de infraestructura listo.

Backend:
  cd backend
  ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev-homelab

Frontend:
  cd frontend
  npm run dev
EOF
