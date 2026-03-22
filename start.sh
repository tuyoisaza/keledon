#!/bin/sh
set -eu

echo "[BOOT] Starting KELEDON single-container runtime"

export SINGLE_CONTAINER=true
export NODE_ENV=${NODE_ENV:-production}
export BACKEND_PORT=${BACKEND_PORT:-3001}
export DATABASE_URL=${DATABASE_URL:-file:/app/data/keledon.db}
export KELEDON_ENV_TIER=${KELEDON_ENV_TIER:-CI_PROOF}
export KELEDON_ALLOW_ALL_CORS=${KELEDON_ALLOW_ALL_CORS:-true}
export KELEDON_CLOUD_BASE_URL=${KELEDON_CLOUD_BASE_URL:-http://127.0.0.1:$BACKEND_PORT}
export KELEDON_REQUIRE_QDRANT=${KELEDON_REQUIRE_QDRANT:-true}
export KELEDON_QDRANT_URL=${KELEDON_QDRANT_URL:-http://127.0.0.1:6333}
export QDRANT_URL=${QDRANT_URL:-$KELEDON_QDRANT_URL}
export QDRANT_COLLECTION=${QDRANT_COLLECTION:-keledon}
export KELEDON_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=${KELEDON_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT:-http://127.0.0.1:4318/v1/traces}
export CORS_ORIGINS=${CORS_ORIGINS:-*}

mkdir -p /app/data /app/data/qdrant

echo "[BOOT] Starting embedded Qdrant on 127.0.0.1:6333"
QDRANT__SERVICE__HTTP_PORT=6333 \
QDRANT__SERVICE__GRPC_PORT=6334 \
QDRANT__SERVICE__HOST=127.0.0.1 \
QDRANT__STORAGE__STORAGE_PATH=/app/data/qdrant \
qdrant >/tmp/qdrant.log 2>&1 &
QDRANT_PID=$!

QDRANT_READY=false
for i in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:6333/collections >/dev/null 2>&1; then
    QDRANT_READY=true
    break
  fi
  sleep 1
done

if [ "$QDRANT_READY" != "true" ]; then
  echo "[BOOT] Qdrant failed to start"
  cat /tmp/qdrant.log || true
  exit 1
fi

echo "[BOOT] Running Prisma schema sync"
cd /app/backend
if [ "${KELEDON_RESET_DB:-false}" = "true" ]; then
  echo "[BOOT] KELEDON_RESET_DB=true - Removing old database files..."
  rm -f /app/data/keledon.db /app/data/keledon.db-journal /app/data/keledon.db-wal /app/data/keledon.db-shm
  rm -rf /app/data/qdrant
fi

if [ "${KELEDON_RESET_DB:-false}" = "true" ]; then
  echo "[BOOT] Ensuring Qdrant collection '$QDRANT_COLLECTION' exists"
  curl -fsS -X PUT "http://127.0.0.1:6333/collections/$QDRANT_COLLECTION" \
    -H "Content-Type: application/json" \
    -d '{"vectors":{"size":32,"distance":"Cosine"}}' >/dev/null || true

  echo "[BOOT] Seeding Qdrant collection '$QDRANT_COLLECTION'"
  curl -fsS -X PUT "http://127.0.0.1:6333/collections/$QDRANT_COLLECTION/points?wait=true" \
    -H "Content-Type: application/json" \
    -d '{"points":[{"id":1,"vector":[0.01,0.02,0.03,0.04,0.05,0.06,0.07,0.08,0.09,0.10,0.11,0.12,0.13,0.14,0.15,0.16,0.17,0.18,0.19,0.20,0.21,0.22,0.23,0.24,0.25,0.26,0.27,0.28,0.29,0.30,0.31,0.32],"payload":{"doc_id":"seed-doc-1","text":"KELEDON runtime knowledge seed for deterministic vector retrieval.","category":"runtime","source":"keledon","company_id":"keledon-default","created_at":"2026-01-01T00:00:00.000Z"}}]}' >/dev/null
fi

ls -la /app/data/ || true
npx prisma db push
echo "[BOOT] Database sync complete"

echo "[BOOT] Starting backend on 127.0.0.1:$BACKEND_PORT"
PORT="$BACKEND_PORT" node dist/main.js >/tmp/backend.log 2>&1 &
BACKEND_PID=$!

BACKEND_READY=false
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
    BACKEND_READY=true
    break
  fi
  sleep 1
done

if [ "$BACKEND_READY" != "true" ]; then
  echo "[BOOT] Backend failed to start"
  cat /tmp/backend.log || true
  exit 1
fi

echo "[BOOT] Backend and Qdrant are healthy. Starting nginx on 8080"
exec nginx -g "daemon off;"
