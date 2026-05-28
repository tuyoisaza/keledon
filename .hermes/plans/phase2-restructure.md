# Phase 2: Architecture Restructure — Railway Multi-Service Deployment

> **Goal:** KELEDON web + API deploy independently as Railway services.
> **Constraint:** Additive-only (Hard Rule #1) — never delete, always copy.

## Current State

- **cloud/** (NestJS API) + **landing/** (Vite/React) = monolith in single Dockerfile
- **browser/** → GitHub Releases (stays as-is)
- **Qdrant** runs in-container (inline binary)
- **Vosk** runs in-container (Python WS server)
- Railway: single service `keledon` at keledon.tuyoisaza.com

## Target State

```
keledon/
├── services/
│   ├── web/          ← copied from landing/
│   └── api/          ← copied from cloud/
├── landing/          ← preserved (Hard Rule #1)
├── cloud/            ← preserved (Hard Rule #1)
├── browser/          ← unchanged
├── contracts/        ← shared (API depends)
│
Railway: 2 services + 1 add-on
├── keledon-web     → Dockerfile: services/web/Dockerfile
├── keledon-api     → Dockerfile: services/api/Dockerfile
└── Qdrant (managed add-on)
```

---

### Task 1: Copy directories + create web Dockerfile

Copy `landing/` to `services/web/`, create minimal nginx Dockerfile.

**Files:**
- Create: `services/web/Dockerfile`
- Copy: `services/web/` ← `landing/`
- Create: `services/web/nginx.conf`

**Dockerfile `services/web/Dockerfile`:**
```dockerfile
# Vite → nginx static host
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN rm -f tsconfig.json tsconfig.node.json tsconfig.app.json && \
    echo '{"compilerOptions":{"target":"ES2020","useDefineForClassFields":true,"module":"ESNext","lib":["ES2020","DOM","DOM.Iterable"],"skipLibCheck":true,"moduleResolution":"bundler","allowImportingTsExtensions":true,"resolveJsonModule":true,"isolatedModules":true,"noEmit":true,"jsx":"react-jsx"},"include":["src"]}' > tsconfig.json && \
    echo '{"compilerOptions":{"target":"ES2023","lib":["ES2023"],"module":"ESNext","types":["node"],"skipLibCheck":true,"moduleResolution":"bundler","allowImportingTsExtensions":true,"verbatimModuleSyntax":true,"moduleDetection":"force","noEmit":true,"strict":true,"noUnusedLocals":true,"noUnusedParameters":true,"erasableSyntaxOnly":true,"noFallthroughCasesInSwitch":true,"noUncheckedSideEffectImports":true},"include":["vite.config.ts"]}' > tsconfig.node.json && \
    echo '{"compilerOptions":{"tsBuildInfoFile":"./node_modules/.tmp/tsconfig.app.tsbuildinfo","target":"ES2020","useDefineForClassFields":true,"module":"ESNext","lib":["ES2020","DOM","DOM.Iterable"],"skipLibCheck":true,"moduleResolution":"bundler","allowImportingTsExtensions":true,"isolatedModules":true,"moduleDetection":"force","noEmit":true,"jsx":"react-jsx","strict":true,"noUnusedLocals":true,"noUnusedParameters":true,"noFallthroughCasesInSwitch":true,"noUncheckedSideEffectImports":true},"include":["src"]}' > tsconfig.app.json
RUN npx vite build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**
```
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

**Commands:**
```bash
mkdir -p services
cp -r landing services/web
cd services/web
rm -rf node_modules dist
```

---

### Task 2: Create API Dockerfile

Copy `cloud/` to `services/api/`, create NestJS production Dockerfile.

**Files:**
- Create: `services/api/Dockerfile`
- Copy: `services/api/` ← `cloud/`
- Create: `services/api/.dockerignore`

**Dockerfile `services/api/Dockerfile` (multi-stage):**
```dockerfile
# Build stage
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN rm -f tsconfig*.json tsconfig.build.json && \
    echo '{"compilerOptions":{"module":"commonjs","moduleResolution":"node","esModuleInterop":true,"declaration":true,"removeComments":true,"emitDecoratorMetadata":true,"experimentalDecorators":true,"allowSyntheticDefaultImports":true,"target":"ES2022","lib":["ES2022","DOM"],"sourceMap":true,"outDir":"./dist","baseUrl":"./","incremental":true,"skipLibCheck":true,"strictNullChecks":false},"include":["src/**/*"]}' > tsconfig.json && \
    echo '{"compilerOptions":{"module":"commonjs","moduleResolution":"node","esModuleInterop":true,"declaration":false,"removeComments":true,"emitDecoratorMetadata":true,"experimentalDecorators":true,"allowSyntheticDefaultImports":true,"target":"ES2022","lib":["ES2022","DOM"],"outDir":"./dist","baseUrl":"./","incremental":false,"skipLibCheck":true,"strictNullChecks":false},"include":["src/**/*"],"exclude":["node_modules","dist"]}' > tsconfig.mvp.json
RUN npm install --omit=dev
RUN npx prisma generate
RUN npm run build

# Runtime stage
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
EXPOSE 3001
CMD ["node", "dist/main"]
```

**Prepare:**
```bash
cp -r cloud services/api
cd services/api
rm -rf node_modules dist
```

---

### Task 3: Qdrant → Railway managed add-on

**Change:**
- Remove in-container Qdrant binary from monolith Dockerfile
- Set QDRANT_URL env var to managed add-on URL (from Railway)
- Code already uses `QDRANT_URL` env var (checked: `config.service.ts` reads it)
- Update `railway.json` defaults if needed

**Files to update:**
- `cloud/src/config/config.service.ts` — verify fallback URL logic
- `cloud/src/health/health.service.ts` — verify Qdrant health check
- `cloud/src/rag/rag.service.ts` — verify Qdrant client init

**Key: Most code already reads `QDRANT_URL` from env. The managed add-on provides this URL automatically. Just need to remove the in-container qdrant binary from the monolith Dockerfile.**

**Railway dashboard setup:**
1. Navigate to Railway project → "New" → "Add-on" → "Qdrant"
2. Qdrant URL is auto-injected into both services as `QDRANT_URL`
3. Qdrant auth key auto-injected as `QDRANT_API_KEY`

**Code change:** If Qdrant requires API key, update `vector-store.service.ts` to read `QDRANT_API_KEY`.

---

### Task 4: Vosk → cloud STT API (Deepgram)

**Current:** Vosk runs as a Python subprocess via WebSocket.
**Target:** Replace with Deepgram REST API (simpler, no local model).

**Files to create:**
- `services/api/src/stt/deepgram-stt.service.ts`

**Files to modify (in services/api/ copy):**
- `services/api/src/stt/stt.module.ts` — add Deepgram provider
- `services/api/src/config/config.service.ts` — add DEEPGRAM_API_KEY
- `services/api/src/health/health.service.ts` — update STT health check
- Vosk-related files stay in original `cloud/` (never delete)

**Deepgram SDK:**
```bash
npm install @deepgram/sdk
```

**Deepgram STT service pattern:**
```typescript
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export class DeepgramSttService {
  private deepgram: DeepgramClient;

  constructor(apiKey: string) {
    this.deepgram = createClient(apiKey);
  }

  async transcribe(audioBuffer: Buffer): Promise<string> {
    const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      { model: 'nova-2', smart_format: true }
    );
    return result.results.channels[0].alternatives[0].transcript;
  }

  createLiveStream() {
    return this.deepgram.listen.live({ model: 'nova-2', smart_format: true });
  }
}
```

---

### Task 5: Update Railway config for multi-service

**Current:** Single `railway.json` at project root with one service.
**Target:** Each service gets its own `railway.toml` in its directory, plus project-level config.

**For `services/web/` (in `services/web/railway.toml`):**
```toml
[build]
  builder = "DOCKERFILE"
  dockerfilePath = "Dockerfile"

[deploy]
  numReplicas = 1
  healthcheckPath = "/"
  healthcheckTimeout = 120
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 10
```

**For `services/api/` (in `services/api/railway.toml`):**
```toml
[build]
  builder = "DOCKERFILE"
  dockerfilePath = "Dockerfile"

[deploy]
  numReplicas = 1
  healthcheckPath = "/health"
  healthcheckTimeout = 180
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 10
```

**Railway dashboard setup:**
1. Create 2 new services from the service directories
2. Link Qdrant add-on to both
3. Set environment variables per service
4. Route keledon.tuyoisaza.com to web service
5. Web service proxies /api/ to API service

---

### Task 6: Deploy & validate

**Validate independently:**
1. `railway up --service keledon-web` from `services/web/`
2. `railway up --service keledon-api` from `services/api/`
3. Check web serves index.html at root
4. Check API serves /health
5. Check proxy: web /api/health → API health

---

### Execution Order

1. Task 1 (web copy + Dockerfile) → Codex sub-agent
2. Task 2 (api copy + Dockerfile) → Codex sub-agent (parallel)
3. Task 3 (Qdrant add-on) → manual Railway dashboard config
4. Task 4 (Vosk→Deepgram) → Codex sub-agent
5. Task 5 (Railway config) → manual/dashboard setup
6. Task 6 (deploy) → sequential validation

### Rollback

If anything fails, the original monolith Dockerfile at project root is untouched (`landing/`, `cloud/` preserved, root `Dockerfile` preserved). Site stays live at keledon.tuyoisaza.com via existing deployment. New services deploy alongside without disrupting the live site.
