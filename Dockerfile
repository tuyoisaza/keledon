# KELEDON v0.0.63
# Monodocker container for Railway deployment
#
# Source code comes from git clone — avoids WSL COPY null byte corruption.
# All COPY from build context is limited to small config files.
# The source stage clones the repo; later stages COPY --from=source.

# Stage 0: fetch clean source code from git (bypass WSL COPY corruption)
FROM node:20-bookworm AS source
WORKDIR /app
RUN git clone --depth 1 --single-branch \
    https://github.com/tuyoisaza/KELEDON.git /tmp/repo && \
    rm -rf /tmp/repo/.git

# Stage 1: build frontend (React + Vite)
FROM node:20-bookworm AS frontend-builder

WORKDIR /app/landing
COPY --from=source /tmp/repo/landing/package*.json ./
RUN npm ci
COPY --from=source /tmp/repo/landing ./
# Belt-and-suspenders: always regenerate tsconfig files
RUN rm -f tsconfig.json tsconfig.node.json && \
    echo '{"compilerOptions":{"target":"ES2020","useDefineForClassFields":true,"module":"ESNext","lib":["ES2020","DOM","DOM.Iterable"],"skipLibCheck":true,"moduleResolution":"bundler","allowImportingTsExtensions":true,"resolveJsonModule":true,"isolatedModules":true,"noEmit":true,"jsx":"react-jsx"},"include":["src"],"references":[{"path":"./tsconfig.node.json"}]}' > tsconfig.json && \
    echo '{"compilerOptions":{"tsBuildInfoFile":"./node_modules/.tmp/tsconfig.node.tsbuildinfo","target":"ES2023","lib":["ES2023"],"module":"ESNext","types":["node"],"skipLibCheck":true,"moduleResolution":"bundler","allowImportingTsExtensions":true,"verbatimModuleSyntax":true,"moduleDetection":"force","noEmit":true,"strict":true,"noUnusedLocals":true,"noUnusedParameters":true,"erasableSyntaxOnly":true,"noFallthroughCasesInSwitch":true,"noUncheckedSideEffectImports":true},"include":["vite.config.ts"]}' > tsconfig.node.json
RUN VITE_API_URL=/ npm run build

# Stage 2: build backend (NestJS)
FROM node:20-bookworm AS backend-builder

WORKDIR /app
COPY --from=source /tmp/repo/contracts ./contracts/

WORKDIR /app/cloud
COPY --from=source /tmp/repo/cloud/package*.json ./
RUN npm install
COPY --from=source /tmp/repo/cloud ./
RUN rm -f tsconfig.json tsconfig.mvp.json tsconfig.build.json && \
    echo '{"compilerOptions":{"module":"commonjs","moduleResolution":"node","esModuleInterop":true,"isolatedModules":true,"declaration":true,"removeComments":true,"emitDecoratorMetadata":true,"experimentalDecorators":true,"allowSyntheticDefaultImports":true,"target":"ES2022","lib":["ES2022","DOM"],"sourceMap":true,"outDir":"./dist","baseUrl":"./","incremental":true,"skipLibCheck":true,"strictNullChecks":false,"forceConsistentCasingInFileNames":true,"noImplicitAny":false,"strictBindCallApply":false,"noFallthroughCasesInSwitch":true}}' > tsconfig.json && \
    echo '{"compilerOptions":{"module":"commonjs","moduleResolution":"node","esModuleInterop":true,"isolatedModules":true,"declaration":false,"removeComments":true,"emitDecoratorMetadata":true,"experimentalDecorators":true,"allowSyntheticDefaultImports":true,"target":"ES2022","lib":["ES2022","DOM"],"outDir":"./dist","baseUrl":"./","incremental":false,"skipLibCheck":true,"strictNullChecks":false,"forceConsistentCasingInFileNames":true,"noImplicitAny":false,"strictBindCallApply":false,"noFallthroughCasesInSwitch":true},"include":["src/**/*"],"exclude":["node_modules","dist","**/*.spec.ts","src/controllers/analytics.controller.ts","src/controllers/dashboard.controller.ts","src/controllers/rbac-analysis.controller.ts","src/gateways/dashboard.gateway.ts","src/modules/**/*","src/local-services/**/*","src/services/ui-automation.service.ts","src/services/flow-execution.service.ts","src/services/security.service.ts","src/services/integration-health.service.ts","src/services/real-time-alerting.service.ts","src/services/system-monitoring.service.ts","src/services/rbac-recommendation.service.ts","src/services/voice-analytics.service.ts","src/rbac/**/*","src/MinimalCloudServer.ts"]}' > tsconfig.mvp.json
RUN npm install --omit=dev
RUN npx prisma@5.22.0 generate
RUN npm run build

# Stage 3: build VOSK server (Python-based)
FROM python:3.11-slim AS vosk-builder

WORKDIR /app/vosk-server

COPY --from=source /tmp/repo/cloud/vosk-server/server.py ./

RUN echo "Vosk-builder complete"

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
    python3 \
    python3-pip \
    && pip3 install --no-cache-dir --break-system-packages vosk websockets \
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
COPY --from=source /tmp/repo/cloud/models ./models

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
