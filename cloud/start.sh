#!/bin/sh
echo "[CONTAINER] Starting at $(date)"
echo "[CONTAINER] Current dir: $(pwd)"
echo "[CONTAINER] Files in .: $(ls -la)"
echo "[CONTAINER] Checking dist/main.js..."
if [ -f "dist/main.js" ]; then
  echo "[CONTAINER] dist/main.js exists, size: $(wc -c < dist/main.js)"
else
  echo "[CONTAINER] ERROR: dist/main.js not found!"
fi
echo "[CONTAINER] Starting node..."
exec node --experimental-global-crypto node dist/main
