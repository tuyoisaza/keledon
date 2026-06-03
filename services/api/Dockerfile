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
RUN printf '#!/bin/sh\nset -e\nnpx prisma@5.22.0 migrate deploy 2>/dev/null || echo "migration skipped"\necho "--- Seeding database ---"\nTS_NODE_CACHE=0 npx -y ts-node@10.9.2 scripts/seed-main-data.ts && echo "seed-main-data OK" || echo "seed-main-data FAILED (non-fatal)"\nTS_NODE_CACHE=0 npx -y ts-node@10.9.2 scripts/seed-operational-data.ts && echo "seed-operational-data OK" || echo "seed-operational-data FAILED (non-fatal)"\necho "--- Seeds complete ---"\nexec node dist/main\n' > /start.sh && chmod +x /start.sh
EXPOSE 3001
CMD ["/start.sh"]