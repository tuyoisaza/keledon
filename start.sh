#!/bin/sh
set -eu

echo "[BOOT] Starting KELEDON single-container runtime v0.0.61"

export SINGLE_CONTAINER=true
export NODE_ENV=${NODE_ENV:-production}
export BACKEND_PORT=${BACKEND_PORT:-3001}
export DATABASE_URL=${DATABASE_URL}
export KELEDON_ENV_TIER=${KELEDON_ENV_TIER:-CI_PROOF}
export KELEDON_ALLOW_ALL_CORS=${KELEDON_ALLOW_ALL_CORS:-true}
export KELEDON_CLOUD_BASE_URL=${KELEDON_CLOUD_BASE_URL:-http://127.0.0.1:$BACKEND_PORT}
export KELEDON_REQUIRE_QDRANT=${KELEDON_REQUIRE_QDRANT:-true}
export KELEDON_QDRANT_URL=${KELEDON_QDRANT_URL:-http://127.0.0.1:6333}
export QDRANT_URL=${QDRANT_URL:-$KELEDON_QDRANT_URL}
export QDRANT_COLLECTION=${QDRANT_COLLECTION:-keledon}
export KELEDON_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=${KELEDON_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT:-http://127.0.0.1:4318/v1/traces}
export CORS_ORIGINS=${CORS_ORIGINS:-*}

# VOSK Configuration
export VOSK_PORT=${VOSK_PORT:-9090}
export VOSK_WS_PORT=${VOSK_WS_PORT:-9091}
export VOSK_MODEL_PATH=${VOSK_MODEL_PATH:-/app/models/vosk-model-small-en-us-0.15}
export VOSK_SAMPLE_RATE=${VOSK_SAMPLE_RATE:-16000}

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
echo "[BOOT] Qdrant ready"

echo "[BOOT] Starting VOSK server on 127.0.0.1:$VOSK_PORT (HTTP) and $VOSK_WS_PORT (WS)"
cd /app/vosk-server
python3 server.py >/tmp/vosk.log 2>&1 &
VOSK_PID=$!

VOSK_READY=false
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:$VOSK_PORT/health >/dev/null 2>&1; then
    VOSK_READY=true
    break
  fi
  sleep 1
done

if [ "$VOSK_READY" != "true" ]; then
  echo "[BOOT] VOSK server may still be loading models..."
else
  echo "[BOOT] VOSK server ready"
fi

echo "[BOOT] Running Prisma schema sync"
cd /app/backend

if [ "${KELEDON_RESET_DB:-false}" = "true" ]; then
  echo "[BOOT] Resetting database..."
  rm -f /app/data/keledon.db
fi

if [ -n "$DATABASE_URL" ]; then
  npx prisma db push --accept-data-loss
  echo "[BOOT] Database sync complete"
else
  echo "[BOOT] WARNING: DATABASE_URL not set, skipping Prisma sync"
fi



if [ ! -f /app/data/qdrant/config.json ] || [ "${KELEDON_RESET_DB:-false}" = "true" ]; then
  echo "[BOOT] Ensuring Qdrant collection '$QDRANT_COLLECTION' exists"
  curl -fsS -X PUT "http://127.0.0.1:6333/collections/$QDRANT_COLLECTION" \
    -H "Content-Type: application/json" \
    -d '{"vectors":{"size":768,"distance":"Cosine"}}' >/dev/null || true
  
  echo "[BOOT] Seeding Qdrant via JavaScript script"
  cd /app/backend
  node scripts/seed-qdrant.js || echo "[BOOT] Seed script not available, skipping"
  cd /app
fi

echo "[BOOT] Starting backend on 127.0.0.1:$BACKEND_PORT"
cd /app/backend
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

echo "[BOOT] All services ready. Starting nginx on 8080"
echo "[BOOT] Summary:"
echo "  - Qdrant:   127.0.0.1:6333"
echo "  - VOSK:     127.0.0.1:$VOSK_PORT (HTTP), $VOSK_WS_PORT (WS)"
echo "  - Backend:   127.0.0.1:$BACKEND_PORT"
echo "  - Nginx:     0.0.0.0:8080"

exec nginx -g "daemon off;"
