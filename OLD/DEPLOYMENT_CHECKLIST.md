# ✅ KELEDON Deployment Readiness Checklist

## Code Status: ✅ READY FOR DEPLOYMENT

All critical components are in place and configured correctly.

## ✅ Pre-Deployment Checklist

### Configuration Files
- [x] `Dockerfile` - Multi-stage build for frontend + backend
- [x] `nginx.conf` - Reverse proxy configuration
- [x] `start.sh` - Service startup script
- [x] `.dockerignore` - Build optimization
- [x] `deploy.sh` / `deploy.ps1` - Deployment scripts

### Code Updates
- [x] Frontend uses relative URLs (`landing/src/lib/config.ts`)
- [x] Backend supports port 3001 internally (`cloud/src/main.ts`)
- [x] All hardcoded localhost URLs removed
- [x] Environment variables properly configured

### Backend Endpoints Verified
- [x] `/health` - Health check endpoint exists
- [x] `/api/*` - API routes configured
- [x] `/socket.io/` - WebSocket support
- [x] `/listen/` - Listening session WebSocket

### Nginx Configuration
- [x] Frontend static files served from `/`
- [x] API proxied from `/api/*` to backend
- [x] WebSocket proxied from `/socket.io/` to backend
- [x] Health check proxied from `/health` to backend

## 🔧 Before First Deployment

### 1. Run Pre-Deployment Check (EASY WAY!)

**Run this script to check everything:**
```powershell
.\PRE_DEPLOY_CHECK.ps1
```

This will verify all prerequisites automatically!

### 2. Set GCP Project ID
```powershell
$env:GCP_PROJECT_ID = "keledon"
```

### 3. Manual Prerequisites Check (if not using script)
- [ ] Google Cloud account with billing enabled
- [ ] `gcloud` CLI installed and authenticated (`gcloud auth login`)
- [ ] Docker installed and running
- [ ] GCP project created (your project ID: `keledon`, project number: `1062969561553`)
- [ ] `cloud/.env` file exists with Supabase keys

### 3. Test Locally (Optional but Recommended)
```bash
# Build the container
docker build -t keledon:local .

# Run with environment variables from cloud/.env
# Replace values with actual values from your cloud/.env file
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e SINGLE_CONTAINER=true \
  -e SUPABASE_URL=$(grep SUPABASE_URL cloud/.env | cut -d '=' -f2) \
  -e SUPABASE_ANON_KEY=$(grep SUPABASE_ANON_KEY cloud/.env | cut -d '=' -f2) \
  -e SUPABASE_SERVICE_KEY=$(grep SUPABASE_SERVICE_KEY cloud/.env | cut -d '=' -f2) \
  keledon:local
```

**Or manually copy values from `cloud/.env`:**
```bash
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e SINGLE_CONTAINER=true \
  -e SUPABASE_URL=<value-from-cloud/.env> \
  -e SUPABASE_ANON_KEY=<value-from-cloud/.env> \
  -e SUPABASE_SERVICE_KEY=<value-from-cloud/.env> \
  keledon:local
```

Then test:
- http://localhost:8080 (frontend)
- http://localhost:8080/health (backend health)
- http://localhost:8080/api/tech-status (API)

## 🚀 Deployment Steps

### Step 1: Deploy
```powershell
.\deploy.ps1
```

### Step 2: Environment Variables (AUTOMATIC! ✅)

**The deployment script automatically reads `cloud/.env` and sets all environment variables in Cloud Run!**

No manual steps needed - the script will:
- ✅ Read `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` from `cloud/.env`
- ✅ Read any API keys (DEEPGRAM_API_KEY, OPENAI_API_KEY, ELEVENLABS_API_KEY) if configured
- ✅ Set `NODE_ENV=production`, `PORT=3001`, `SINGLE_CONTAINER=true`
- ✅ Automatically set `CORS_ORIGINS` with your service URL after deployment

**Important:** The deployment uses a two-step process:
1. **First deployment**: Uses default CORS (`chrome-extension://*`) which works immediately
2. **Immediate update**: Sets `CORS_ORIGINS` with your actual service URL (happens automatically, takes ~5 seconds)

**Why this works:**
- Frontend and backend are same-origin (nginx proxy), so no CORS needed for frontend
- Chrome extension uses `chrome-extension://*` which is in the default CORS
- The service URL is added for completeness and future-proofing

**Just make sure `cloud/.env` has your values before running the deploy script!**

### Step 3: Update Agent
Update `agent/background.js`:
```javascript
let BACKEND_URL = 'https://your-service-url.run.app';
```

### Step 4: Verify
After deployment, the script will show you the actual service URL. Use that URL to verify:

```bash
# The script will output something like:
# 🌐 Service URL: https://keledon-xxxxx-xx.a.run.app
# Use that actual URL:
curl https://keledon-xxxxx-xx.a.run.app/health
```

**Note:** The actual URL will be displayed in the deployment script output - it's unique to your deployment!

## 🐛 Known Issues / Notes

### Health Check
- Uses `wget` which is installed in the container
- Health check endpoint: `/health` (proxied through nginx)

### Port Configuration
- Nginx: Port 8080 (Cloud Run requirement)
- Backend: Port 3001 (internal, not exposed)
- Frontend: Served by Nginx (static files)

### WebSocket
- Socket.io: `/socket.io/`
- Listening sessions: `/listen/`
- Both proxied through nginx with upgrade headers

## ✅ Post-Deployment Verification

**Use the actual service URL from the deployment script output** (e.g., `https://keledon-xxxxx-xx.a.run.app`)

- [ ] Frontend loads at root URL: `https://your-actual-url.run.app`
- [ ] Health check returns 200: `curl https://your-actual-url.run.app/health`
- [ ] API endpoints work: `curl https://your-actual-url.run.app/api/tech-status`
- [ ] WebSocket connects (check browser console)
- [ ] Authentication works
- [ ] No CORS errors in browser console

**The deployment script will show you the exact URL to use!**

## 📝 Environment Variables Reference

**All values come from `cloud/.env` file. Use the helper script to extract them:**

```powershell
# Windows
.\scripts\get-env-for-cloudrun.ps1
```

```bash
# Linux/Mac
./scripts/get-env-for-cloudrun.sh
```

| Variable | Source | Notes |
|----------|--------|-------|
| `NODE_ENV` | Set manually | Always `production` |
| `PORT` | Set manually | Always `3001` |
| `SINGLE_CONTAINER` | Set manually | Always `true` |
| `SUPABASE_URL` | `cloud/.env` | Copy from your .env file |
| `SUPABASE_ANON_KEY` | `cloud/.env` | Copy from your .env file |
| `SUPABASE_SERVICE_KEY` | `cloud/.env` | Copy from your .env file |
| `CORS_ORIGINS` | **Auto-set by script** | Automatically set to `https://your-actual-service-url.run.app,chrome-extension://*` after deployment |
| `DEEPGRAM_API_KEY` | `cloud/.env` | Optional - Only if configured |
| `OPENAI_API_KEY` | `cloud/.env` | Optional - Only if configured |
| `ELEVENLABS_API_KEY` | `cloud/.env` | Optional - Only if configured |

## 🎉 Ready to Deploy!

Everything is configured and ready. Run `.\deploy.ps1` when ready!
