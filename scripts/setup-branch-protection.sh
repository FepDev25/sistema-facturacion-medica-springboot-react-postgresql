#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-FepDev25/sistema-facturacion-medica-springboot-react-postgresql}"
BRANCH="${2:-main}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Falta GitHub CLI (gh). Instalalo desde https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Autenticate primero con: gh auth login"
  exit 1
fi

echo "Protegiendo $REPO@$BRANCH..."
gh api --method PUT "repos/$REPO/branches/$BRANCH/protection" --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Backend", "Frontend"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON

echo "Listo. Verificá con:"
echo "  gh api repos/$REPO/branches/$BRANCH/protection"
