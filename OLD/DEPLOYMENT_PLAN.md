# KELEDON Single Container Deployment Plan

## 🎯 Architecture Overview

**Single Container Approach:**
- ✅ **Pros**: Simpler deployment, single container to manage, easier coordination, lower cost
- ✅ **Perfect for**: Cloud Run (designed for single containers)
- ✅ **How it works**: Nginx reverse proxy on port 8080 serves frontend and proxies API/WebSocket to backend

## 📐 Container Architecture

```
┌─────────────────────────────────────┐
│   Cloud Run Container (Port 8080)   │
│                                     │
│  ┌──────────────┐                  │
│  │   Nginx      │  Port 8080       │
│  │  (Frontend)  │  (Cloud Run)     │
│  └──────┬───────┘                  │
│         │                           │
│         │ Proxies:                  │
│         │ - /api/* → Backend        │
│         │ - /socket.io → Backend    │
│         │ - / → Frontend (static)  │
│         │                           │
│  ┌──────▼───────┐                  │
│  │   Backend    │  Port 3001       │
│  │  (NestJS)    │  (Internal)      │
│  └──────────────┘                  │
│                                     │
└─────────────────────────────────────┘
```

## 🔧 Technical Details

### Port Configuration
- **Nginx**: Listens on port 8080 (Cloud Run requirement)
- **Backend**: Runs on port 3001 (internal, not exposed)
- **Frontend**: Served by Nginx as static files

### Request Flow
1. User visits `https://your-app.run.app/`
   → Nginx serves React app from `/usr/share/nginx/html`

2. Frontend makes API call to `/api/knowledge/documents`
   → Nginx proxies to `http://localhost:3001/api/knowledge/documents`

3. Frontend connects WebSocket to `/socket.io`
   → Nginx proxies to `http://localhost:3001/socket.io`

### Environment Variables
- Frontend: Built with `VITE_API_URL=/` (relative URLs, same origin)
- Backend: Uses `PORT=3001` (internal)
- CORS: Backend allows same-origin (no CORS needed since same container)

## 📦 Dockerfile Strategy

### Multi-stage Build:
1. **Stage 1**: Build frontend (React/Vite)
2. **Stage 2**: Build backend (NestJS/TypeScript)
3. **Stage 3**: Runtime container with:
   - Nginx (serves frontend + reverse proxy)
   - Node.js (runs backend)
   - Process manager (runs both services)

### Process Management Options:
- **Option A**: Simple shell script with `&` (background processes)
- **Option B**: `supervisord` (more robust, better logging)
- **Option C**: `pm2` (Node.js process manager)

**Recommendation**: Start with Option A (simple script), can upgrade later.

## 🚀 Deployment Steps

### 1. Build Process
```bash
# Build frontend
cd landing
npm install
npm run build  # Creates dist/ folder

# Build backend
cd ../cloud
npm install
npm run build  # Creates dist/ folder
```

### 2. Container Build
```bash
# Build Docker image
docker build -t gcr.io/PROJECT_ID/keledon:latest .

# Test locally
docker run -p 8080:8080 gcr.io/PROJECT_ID/keledon:latest
```

### 3. Push to Google Container Registry
```bash
# Authenticate
gcloud auth configure-docker

# Push image
docker push gcr.io/PROJECT_ID/keledon:latest
```

### 4. Deploy to Cloud Run
```bash
gcloud run deploy keledon \
  --image gcr.io/PROJECT_ID/keledon:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "NODE_ENV=production,SUPABASE_URL=...,SUPABASE_ANON_KEY=..."
```

## 📝 Files to Create

1. **`Dockerfile`** (root level)
   - Multi-stage build
   - Combines frontend + backend
   - Sets up nginx + backend

2. **`nginx.conf`** (root level)
   - Serves frontend static files
   - Proxies `/api/*` to backend
   - Proxies WebSocket to backend

3. **`start.sh`** (root level)
   - Starts backend in background
   - Starts nginx in foreground

4. **`deploy.sh`** (root level)
   - Builds image
   - Pushes to GCR
   - Deploys to Cloud Run
   - Sets environment variables

5. **`.dockerignore`** (root level)
   - Excludes unnecessary files

## 🗑️ Cleanup

**Delete all old deployment scripts** in `scripts/`:
- Keep only utility scripts (seed, test)
- Remove all `deploy-*.sh`, `deploy-*.ps1`, `deploy-*.bat`

## ⚙️ Configuration Changes Needed

### Frontend (`landing/`)
- Update `landing/src/lib/config.ts` to use relative URLs (`/api` instead of full URL)
- Build with `VITE_API_URL=/` (or empty, use relative)

### Backend (`cloud/`)
- Update CORS to allow same-origin (or remove CORS since same container)
- Ensure backend listens on port 3001 internally

### Nginx
- Update proxy targets from `http://backend:8080` to `http://localhost:3001`
- Ensure WebSocket upgrade headers are correct

## ✅ Verification Checklist

After deployment:
- [ ] Container builds successfully
- [ ] Frontend loads at root URL
- [ ] API calls work (`/api/health` returns 200)
- [ ] WebSocket connects (check browser console)
- [ ] Authentication works
- [ ] All routes work (React Router)
- [ ] Static assets load (CSS, JS, images)

## 🎯 Next Steps After Deployment

1. **Get Cloud Run URL**: `https://keledon-xxxxx-xx.a.run.app`
2. **Update Agent**: Set `BACKEND_URL` in `agent/background.js` to Cloud Run URL
3. **Buy Domain**: Point custom domain to Cloud Run URL
4. **SSL**: Cloud Run provides HTTPS automatically
5. **Environment Variables**: Set via Cloud Run console or `gcloud` command

## 💰 Cost Considerations

- **Cloud Run**: Pay per request (very cheap for low traffic)
- **Container Registry**: First 0.5GB free, then $0.026/GB/month
- **Domain**: ~$10-15/year (optional)
- **Total**: ~$0-5/month for low traffic

## 🔒 Security Notes

- Backend not exposed directly (only through nginx)
- CORS not needed (same origin)
- Environment variables set in Cloud Run (secure)
- HTTPS automatic (Cloud Run provides)
