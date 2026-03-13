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

# Initialize SQLite database if not exists
echo "[CONTAINER] Initializing database..."
mkdir -p /app/data
npx prisma db push --skip-generate

echo "[CONTAINER] Starting node..."
exec node dist/main
