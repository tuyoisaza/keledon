#!/usr/bin/env bash
set -euo pipefail

if ! command -v npx >/dev/null 2>&1; then
  echo "[dev-supabase-cli-local] npx not found" >&2
  exit 1
fi

if ! npx supabase --version >/dev/null 2>&1; then
  echo "[dev-supabase-cli-local] Supabase CLI unavailable via npx" >&2
  exit 1
fi

if ! npx supabase start; then
  echo "[dev-supabase-cli-local] supabase start failed" >&2
  exit 1
fi

status_env="$(npx supabase status -o env)"

supabase_url=""
anon_key=""
service_role_key=""

while IFS='=' read -r key value; do
  value="${value%\"}"
  value="${value#\"}"
  case "$key" in
    API_URL) supabase_url="$value" ;;
    ANON_KEY) anon_key="$value" ;;
    SERVICE_ROLE_KEY) service_role_key="$value" ;;
  esac
done <<< "$status_env"

if [[ -z "$supabase_url" || -z "$anon_key" || -z "$service_role_key" ]]; then
  echo "[dev-supabase-cli-local] Failed to read API_URL/ANON_KEY/SERVICE_ROLE_KEY from supabase status -o env" >&2
  exit 1
fi

echo "[dev-supabase-cli-local] SUPABASE_URL=${supabase_url}"
echo "[dev-supabase-cli-local] SUPABASE_ANON_KEY=${anon_key}"
echo "[dev-supabase-cli-local] SUPABASE_SERVICE_ROLE_KEY=${service_role_key}"
