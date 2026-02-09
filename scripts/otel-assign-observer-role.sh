#!/usr/bin/env bash
set -euo pipefail

EMAIL="${1:-${OTEL_EMAIL:-}}"
USER_ID="${OTEL_USER_ID:-}"
ROLE="${OTEL_ROLE:-ROLE_SUPERADMIN_OBSERVER}"

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_KEY:-}}" ]]; then
  for env_file in "observability/.env.local.supabase" "cloud/.env"; do
    [[ ! -f "$env_file" ]] && continue
    while IFS='=' read -r key value; do
      [[ -z "$key" || "$key" =~ ^# ]] && continue
      key="$(echo "$key" | tr -d ' ')"
      value="${value%%\r}"
      if [[ "$key" == "SUPABASE_URL" && -z "${SUPABASE_URL:-}" ]]; then export SUPABASE_URL="$value"; fi
      if [[ "$key" == "SUPABASE_SERVICE_ROLE_KEY" && -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then export SUPABASE_SERVICE_ROLE_KEY="$value"; fi
      if [[ "$key" == "SUPABASE_SERVICE_KEY" && -z "${SUPABASE_SERVICE_KEY:-}" ]]; then export SUPABASE_SERVICE_KEY="$value"; fi
    done < "$env_file"
  done
fi

if [[ -z "${SUPABASE_URL:-}" ]]; then
  echo "Missing SUPABASE_URL" >&2
  exit 1
fi

SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_KEY:-}}"
if [[ -z "$SERVICE_KEY" ]]; then
  echo "Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY" >&2
  exit 1
fi

if [[ -z "$EMAIL" && -z "$USER_ID" ]]; then
  echo "Provide email argument or OTEL_USER_ID" >&2
  exit 1
fi

USERS_JSON="$(curl -sS "${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=200" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")"

TARGET_JSON="$(printf '%s' "$USERS_JSON" | node -e "let d='';const email=process.argv[1]||'';const uid=process.argv[2]||'';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);const users=j.users||[];let u=null;if(uid){u=users.find(x=>x.id===uid);}if(!u&&email){u=users.find(x=>(x.email||'').toLowerCase()===email.toLowerCase());}if(!u){process.exit(3);}process.stdout.write(JSON.stringify(u));});" "$EMAIL" "$USER_ID")" || {
  echo "User not found. Create/login user first." >&2
  exit 1
}

TARGET_ID="$(printf '%s' "$TARGET_JSON" | node -pe "const u=JSON.parse(require('fs').readFileSync(0,'utf8'));u.id")"
TARGET_EMAIL="$(printf '%s' "$TARGET_JSON" | node -pe "const u=JSON.parse(require('fs').readFileSync(0,'utf8'));u.email||''")"

UPDATE_BODY="$(printf '%s' "$TARGET_JSON" | node -e "let d='';const role=process.argv[1];process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const u=JSON.parse(d);const existing=[...(u.app_metadata?.roles||[]),u.app_metadata?.role].filter(Boolean);const roles=[...new Set([...existing,role])];const out={app_metadata:{roles,role}};process.stdout.write(JSON.stringify(out));});" "$ROLE")"

curl -sS -X PUT "${SUPABASE_URL}/auth/v1/admin/users/${TARGET_ID}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_BODY" >/dev/null

echo "[otel-assign-observer-role] Role assignment successful"
echo "user_id=${TARGET_ID}"
echo "email=${TARGET_EMAIL}"
echo "role=${ROLE}"
