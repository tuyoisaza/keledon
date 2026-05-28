# KELEDON API Dockerfile — deploys from build context (no git clone source stage)
# Build context is services/api/ via `railway up ./services/api --path-as-root`

FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm install --omit=dev && \
    npx prisma@5.22.0 generate && \
    npx tsc -p tsconfig.mvp.json

FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/contracts ./contracts
EXPOSE 3001
CMD ["node", "dist/main"]