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
node scripts/seed-main-data.js || echo "[CONTAINER] Seed completed or skipped"

echo "[CONTAINER] Fetching KELEDON Browser installer..."
mkdir -p /app/cloud/public/download
if [ -n "$GITHUB_TOKEN" ]; then
  curl -sf \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/tuyoisaza/keledon/releases/latest" \
    -o /tmp/release.json 2>/dev/null
  ASSET_URL=$(python3 -c "
import json, sys
try:
    r = json.load(open('/tmp/release.json'))
    print(next((a['url'] for a in r.get('assets', []) if a['name'] == 'KELEDON.Browser.Setup.exe'), ''))
except Exception:
    print('')
" 2>/dev/null)
  if [ -n "$ASSET_URL" ]; then
    curl -sfL \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/octet-stream" \
      "$ASSET_URL" \
      -o /app/cloud/public/download/KELEDON.Browser.Setup.exe \
    && echo "[CONTAINER] Installer downloaded." \
    || echo "[CONTAINER] WARNING: Installer download failed."
  else
    echo "[CONTAINER] WARNING: Could not find installer asset in latest release."
  fi
else
  echo "[CONTAINER] GITHUB_TOKEN not set — installer download skipped."
fi

echo "[CONTAINER] Starting node..."
exec node dist/main
