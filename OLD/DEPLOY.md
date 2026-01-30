# 🚀 KELEDON DEPLOYMENT PLAN - Full System to Cloud Run

## Current Status Analysis

### ✅ Working Now:
- **Simple Backend**: Express server on Cloud Run (not full NestJS)
- **Backend Code**: Complete NestJS app exists in `cloud/`
- **Frontend Code**: React app exists in `landing/`  
- **Chrome Extension**: Ready in `agent/`

### ❌ Not Working:
- **Real Backend**: Full NestJS with STT/TTS/LLM providers
- **Real Frontend**: React app with authentication/Supabase
- **Integration**: Services not connected
- **Full System**: Both services working together on Cloud Run

## Phase 1: Deploy Full Backend to Cloud Run

### Step 1: Fix Native Dependencies
```bash
# Use package.minimal.json to exclude problematic dependencies
cd cloud
cp package.minimal.json package.json
```

### Step 2: Create Production Dockerfile
```dockerfile
# Multi-stage build for cloud/ directory
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 8080
CMD ["npm", "run", "start:prod"]
```

### Step 3: Deploy Backend
```bash
gcloud run deploy keeldon-backend-full \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 1Gi \
    --cpu 1 \
    --set-env-vars="NODE_ENV=production,SUPABASE_URL=https://isoyzcvjoevyphnaznkl.supabase.co,SUPABASE_ANON_KEY=sb_publishable_9sKVxamNyK4CdXM-yH69qg_fEHRvHRa,DEFAULT_STT_PROVIDER=mock,DEFAULT_TTS_PROVIDER=mock"
```

## Phase 2: Deploy Frontend to Cloud Run

### Step 1: Fix Frontend Build
```bash
cd landing
# Fix build issues
npm install
npm run build
```

### Step 2: Create Frontend Dockerfile
```dockerfile
# Multi-stage React build with Nginx
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### Step 3: Deploy Frontend
```bash
gcloud run deploy keeldon-frontend-full \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1
```

## Phase 3: Database & Configuration

### Supabase Setup
- **URL**: https://isoyzcvjoevyphnaznkl.supabase.co
- **Anon Key**: sb_publishable_9sKVxamNyK4CdXM-yH69qg_fEHRvHRa
- **Service Key**: sb_secret_yqq_tgfKS_2BgKviwVn1lw_W_RbzJVV

### Environment Variables
```bash
# Backend Configuration
NODE_ENV=production
PORT=8080
SUPABASE_URL=https://isoyzcvjoevyphnaznkl.supabase.co
SUPABASE_ANON_KEY=sb_publishable_9sKVxamNyK4CdXM-yH69qg_fEHRvHRa
SUPABASE_SERVICE_KEY=sb_secret_yqq_tgfKS_2BgKviwVn1lw_W_RbzJVV
DEFAULT_STT_PROVIDER=deepgram
DEFAULT_TTS_PROVIDER=elevenlabs
DEFAULT_LLM_PROVIDER=openai

# Provider API Keys (configure via management UI)
DEEPGRAM_API_KEY=xxx
ELEVENLABS_API_KEY=xxx
OPENAI_API_KEY=xxx
```

## Phase 4: Integration & Testing

### Chrome Extension Update
```javascript
// agent/background.js - Update production URL
const BACKEND_URL = "https://keeldon-backend-full-xxxxx-uc.a.run.app";
```

### CORS Configuration
```javascript
// Backend CORS setup
app.use(cors({
  origin: [
    'https://keledon-frontend-full-xxxxx-uc.a.run.app',
    'chrome-extension://*'
  ],
  credentials: true
}));
```

### Final Testing
```bash
# Test services
curl https://keeldon-backend-full-xxxxx-uc.a.run.app/health
curl https://keeldon-frontend-full-xxxxx-uc.a.run.app/

# Integration test
# 1. Open Chrome extension
# 2. Test voice automation
# 3. Verify real-time communication
```

## Expected Final Links

### After Successful Deployment:

**Frontend:** https://keeldon-frontend-full-[hash].uc.a.run.app
- Complete React application with authentication
- Admin panel for AI provider configuration
- Real-time voice automation dashboard
- Supabase integration

**Backend:** https://keeldon-backend-full-[hash].uc.a.run.app
- Full NestJS application with all providers
- STT: Deepgram, Whisper, Mock providers
- TTS: ElevenLabs, Qwen3-TTS, Mock providers  
- LLM: OpenAI, Mock providers
- WebSocket support for real-time audio processing
- RPA automation capabilities
- Supabase database integration

**Chrome Extension:** Updated with production backend URL
- Voice capture and streaming
- Flow execution on web pages
- Real-time communication with backend

## Implementation Commands

### Execute in Order:

```bash
# 1. Deploy Full Backend
cd cloud
# [Deploy commands from Phase 1]

# 2. Deploy Frontend  
cd ../landing
# [Deploy commands from Phase 2]

# 3. Update Chrome Extension
cd ../agent
# [Update background.js with new URLs]

# 4. Test Integration
# [Run tests from Phase 4]
```

## Success Criteria

✅ **Complete System Working When:**
- Backend responds to `/health` with all providers configured
- Frontend loads with authentication to Supabase
- Chrome extension connects to backend WebSocket
- Voice automation workflow functions end-to-end
- All services accessible on Cloud Run URLs

## File Structure for Deployment

```
KELEDON/
├── cloud/                 # ✅ NestJS backend (fix dependencies)
│   ├── Dockerfile          # ✅ Create from plan
│   └── package.minimal.json # ✅ Use this version
├── landing/               # ✅ React frontend (fix build)
│   ├── Dockerfile          # ✅ Create from plan  
│   └── nginx.conf          # ✅ Create from plan
├── agent/                 # ✅ Chrome extension
│   └── background.js       # ✅ Update with new URL
└── scripts/               # ✅ Deployment scripts
    └── deploy-full.sh      # ✅ Execute deployment
```

---
**Status:** Ready to execute full deployment! 🚀
**Next:** Run deployment commands in sequence above.