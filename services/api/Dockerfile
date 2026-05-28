# KELEDON API Service — NestJS cloud backend
#
# Source code comes from git clone (avoids WSL COPY null byte corruption).
# The source stage clones the repo; later stages COPY --from=source.
# Only small config files (none currently) come from build context.

FROM node:20-slim AS source
WORKDIR /tmp/repo
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 https://github.com/tuyoisaza/KELEDON.git /tmp/repo

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=source /tmp/repo/services/api/package*.json ./
RUN npm install
COPY --from=source /tmp/repo/services/api . .
RUN cp tsconfig.mvp.json tsconfig.json
RUN npm install --omit=dev
RUN npx prisma@5.22.0 generate
RUN npx tsc -p tsconfig.mvp.json

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/contracts ./contracts
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"
CMD ["node", "dist/main"]
