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

# Run Prisma migrations and seed
echo "[CONTAINER] Running Prisma migrations..."
npx prisma db push

echo "[CONTAINER] Seeding data..."
npx ts-node scripts/seed-main-data.ts || echo "[CONTAINER] Seed completed or skipped"

echo "[CONTAINER] Starting node..."
exec node dist/main
