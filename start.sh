#!/bin/sh
set -e

echo "Starting KELEDON services"

export SINGLE_CONTAINER=true
export NODE_ENV=${NODE_ENV:-production}

# Start backend on internal port 3001
echo "Starting backend on port 3001"
cd /app/backend

# Pass PORT only to backend (do not override Cloud Run PORT)
PORT=3001 node dist/main.js &
BACKEND_PID=$!

# Give backend time to start
sleep 3

# Verify backend process is alive
if ! kill -0 $BACKEND_PID 2>/dev/null; then
  echo "Backend process exited unexpectedly"
  exit 1
fi

# Optional backend health check
if wget -q -O- http://127.0.0.1:3001/health >/dev/null 2>&1; then
  echo "Backend health check passed"
else
  echo "Backend health endpoint not reachable yet"
fi

# Start nginx in foreground (required by Cloud Run)
echo "Starting nginx on port 8080"
exec nginx -g "daemon off;"
