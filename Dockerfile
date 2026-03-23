# KELEDON v0.0.48
# Monodocker container for Railway deployment

# Stage 1: build frontend (React + Vite)
FROM node:20-bookworm AS frontend-builder

WORKDIR /app/landing
COPY landing/package*.json ./
RUN npm ci
COPY landing/ ./
RUN rm -rf node_modules/.cache
RUN VITE_API_URL=/ npm run build

# Stage 2: build backend (NestJS)
FROM node:20-bookworm AS backend-builder

WORKDIR /app
COPY contracts/ ./contracts/

COPY cloud/package*.json ./cloud/
WORKDIR /app/cloud
RUN npm ci

COPY cloud/ ./
RUN npm install --omit=dev
RUN npx prisma@5.22.0 generate
RUN rm -f tsconfig.floor.tsbuildinfo && npm run build

# Stage 3: build VOSK server (Python-based)
FROM python:3.11-slim AS vosk-builder

WORKDIR /app/vosk-server

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir vosk websockets

COPY cloud/vosk-server/server.py ./

# Stage 4: copy Qdrant binary
FROM qdrant/qdrant:latest AS qdrant-binary

# Stage 5: runtime (single container)
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
    ca-certificates \
    libunwind8 \
    libomp5 \
    libsox3 \
    sox \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy frontend
COPY --from=frontend-builder /app/landing/dist /usr/share/nginx/html

# Copy backend
COPY --from=backend-builder /app/cloud/dist ./backend/dist
COPY --from=backend-builder /app/cloud/node_modules ./backend/node_modules
COPY --from=backend-builder /app/cloud/package*.json ./backend/
COPY --from=backend-builder /app/cloud/prisma ./backend/prisma
COPY --from=backend-builder /app/cloud/scripts ./backend/scripts

# Copy VOSK server and models
COPY --from=vosk-builder /app/vosk-server ./vosk-server
COPY cloud/models ./models

# Copy Qdrant binary
COPY --from=qdrant-binary /qdrant/qdrant /usr/local/bin/qdrant

# Copy nginx and start script
COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh /app/start.sh

RUN chmod +x /app/start.sh && \
    mkdir -p /app/data/qdrant /var/log/nginx /var/cache/nginx /var/run/nginx && \
    chown -R www-data:www-data /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fsS http://127.0.0.1:8080/health >/dev/null || exit 1

CMD ["/app/start.sh"]
