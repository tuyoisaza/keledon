#!/usr/bin/env bash
set -euo pipefail

EMAIL="${1:-${OTEL_EMAIL:-}}"
PASSWORD="${2:-${OTEL_PASSWORD:-}}"
SIGNUP="${OTEL_SIGNUP:-0}"

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" ]]; then
  for env_file in "observability/.env.local.supabase" "cloud/.env"; do
    [[ ! -f "$env_file" ]] && continue
    while IFS='=' read -r key value; do
      [[ -z "$key" || "$key" =~ ^# ]] && continue
      key="$(echo "$key" | tr -d ' ')"
      value="${value%%\r}"
      if [[ "$key" == "SUPABASE_URL" && -z "${SUPABASE_URL:-}" ]]; then export SUPABASE_URL="$value"; fi
      if [[ "$key" == "SUPABASE_ANON_KEY" && -z "${SUPABASE_ANON_KEY:-}" ]]; then export SUPABASE_ANON_KEY="$value"; fi
    done < "$env_file"
  done
fi

if [[ -z "${SUPABASE_URL:-}" ]]; then
  echo "Missing SUPABASE_URL" >&2
  exit 1
fi

if [[ -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "Missing SUPABASE_ANON_KEY" >&2
  exit 1
fi

if [[ -z "$EMAIL" ]]; then
  read -r -p "Supabase email: " EMAIL
fi

if [[ -z "$PASSWORD" ]]; then
  read -r -s -p "Supabase password: " PASSWORD
  echo
fi

if [[ "$SIGNUP" == "1" ]]; then
  curl -sS -X POST "${SUPABASE_URL}/auth/v1/signup" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" >/dev/null || true
fi

RESPONSE="$(curl -sS -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")"

TOKEN="$(printf '%s' "$RESPONSE" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);if(!j.access_token)process.exit(2);process.stdout.write(j.access_token);}catch(e){process.exit(2);}})")" || {
  echo "Login failed. Check credentials and SUPABASE_URL/SUPABASE_ANON_KEY." >&2
  echo "$RESPONSE" >&2
  exit 1
}

echo "Authorization: Bearer $TOKEN"
echo "Export with: export KELEDON_OBS_TOKEN='$TOKEN'"
