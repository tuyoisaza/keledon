# Stage 1: build frontend (React + Vite)
FROM node:20-bookworm AS frontend-builder

WORKDIR /app/landing

COPY landing/package*.json ./
RUN npm ci

COPY landing/ ./
RUN rm -rf node_modules/.cache
ENV VITE_SUPABASE_URL=https://isoyzcvjoevyphnaznkl.supabase.co
ENV VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzb3l6Y3Zqb2V2eXBobmF6bmtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjg2NDAxMiwiZXhwIjoyMDUyNDQwMDEyfQ.L3c5Y8R592kv0lrF6YLk9Vp_o5rS_SwpjmLN_MWHK_A
RUN VITE_API_URL=/ npm run build

# Stage 2: build backend (NestJS)
FROM node:20-bookworm AS backend-builder

WORKDIR /app

# Required by cloud build script sentinel
COPY contracts/ ./contracts/

COPY cloud/package*.json ./cloud/
WORKDIR /app/cloud
RUN npm ci

COPY cloud/ ./
RUN npx prisma generate
RUN rm -f tsconfig.floor.tsbuildinfo && npm run build

# Stage 3: copy Qdrant binary
FROM qdrant/qdrant:latest AS qdrant-binary

# Stage 4: runtime (single container)
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends nginx curl ca-certificates libunwind8 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=frontend-builder /app/landing/dist /usr/share/nginx/html

COPY --from=backend-builder /app/cloud/dist ./backend/dist
COPY --from=backend-builder /app/cloud/node_modules ./backend/node_modules
COPY --from=backend-builder /app/cloud/package*.json ./backend/
COPY --from=backend-builder /app/cloud/prisma ./backend/prisma

COPY --from=qdrant-binary /qdrant/qdrant /usr/local/bin/qdrant

COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh /app/start.sh

RUN chmod +x /app/start.sh && \
    mkdir -p /app/data/qdrant /var/log/nginx /var/cache/nginx /var/run/nginx && \
    chown -R www-data:www-data /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -fsS http://127.0.0.1:8080/health >/dev/null || exit 1

CMD ["/app/start.sh"]
