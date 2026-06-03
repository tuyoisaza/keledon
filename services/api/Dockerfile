# KELEDON API Dockerfile — deploys from build context (no git clone source stage)
# Build context is services/api/ via `railway up ./services/api --path-as-root`

FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma@5.22.0 generate && \
    npx tsc -p tsconfig.mvp.json
RUN npm install --omit=dev

FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/contracts ./contracts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/data ./data
RUN npm install -g ts-node@10.9.2
RUN cat > /start.sh << 'SEEDSCRIPT'
#!/bin/sh
set -e
# Auto-injected variable fallback: Railway creates DATABASE_<url> with the real password
_real_db_url=$(env | awk -F= '!/^DATABASE_URL=/ && /^DATABASE_/ && /postgresql:\/\// {rest=substr($0, index($0,"=")+1); print rest; exit}')
if [ -n "$_real_db_url" ]; then
  export DATABASE_URL="$_real_db_url"
  echo "Using real DATABASE_URL from auto-injected variable"
fi
echo "--- Waiting for database ---"
# Retry loop: DB proxy may take a moment to accept connections
for i in 1 2 3 4 5; do
  npx prisma@5.22.0 migrate deploy 2>/dev/null && break
  echo "migrate attempt $i failed, retrying in 3s..."
  sleep 3
done
echo "--- Seeding database ---"
ts-node -O '{"module":"commonjs"}' scripts/seed-main-data.ts && echo "seed-main-data OK" || echo "seed-main-data FAILED (non-fatal)"
ts-node -O '{"module":"commonjs"}' scripts/seed-operational-data.ts && echo "seed-operational-data OK" || echo "seed-operational-data FAILED (non-fatal)"
echo "--- Seeds complete ---"
exec node dist/main
SEEDSCRIPT
RUN chmod +x /start.sh
EXPOSE 3001
CMD ["/start.sh"]