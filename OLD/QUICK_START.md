# 🚀 KELEDON Quick Start - Single Container Deployment

## ✅ What's Ready

Your KELEDON project is now configured for **single-container deployment** to Google Cloud Run!

### Files Created:
- ✅ `Dockerfile` - Builds frontend + backend in one container
- ✅ `nginx.conf` - Reverse proxy configuration
- ✅ `start.sh` - Starts both services
- ✅ `deploy.sh` - Linux/Mac deployment script
- ✅ `deploy.ps1` - Windows PowerShell deployment script
- ✅ `.dockerignore` - Optimizes build
- ✅ Updated `landing/src/lib/config.ts` - Supports relative URLs
- ✅ Updated `cloud/src/main.ts` - Supports port 3001 internally

### Cleaned Up:
- 🗑️ Removed 24 old deployment scripts
- ✅ Kept utility scripts (seed, test, etc.)

## 🎯 Next Steps

### 1. Run Pre-Deployment Check (Recommended!)

**Windows:**
```powershell
.\PRE_DEPLOY_CHECK.ps1
```

This will verify:
- ✅ GCP Project ID is set
- ✅ Docker is installed and running
- ✅ gcloud CLI is installed and authenticated
- ✅ cloud/.env file exists with required keys
- ✅ GCP project exists

### 2. Set Your GCP Project ID

**Windows (PowerShell):**
```powershell
$env:GCP_PROJECT_ID = "keledon"
```

**Linux/Mac:**
```bash
export GCP_PROJECT_ID=keledon
```

### 3. Deploy!

**Windows:**
```powershell
.\deploy.ps1
```

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### 4. Update Agent

After deployment, update `agent/background.js`:
```javascript
let BACKEND_URL = 'https://your-service-url.run.app';
```

## 📚 Documentation

- **`README_DEPLOYMENT.md`** - Full deployment guide
- **`DEPLOYMENT_PLAN.md`** - Architecture and planning details
- **`DEPLOYMENT_CONFIG_GUIDE.md`** - Environment variable reference

## 🧪 Test Locally First

Before deploying, test the container:

```bash
# Build
docker build -t keledon:local .

# Run
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e SINGLE_CONTAINER=true \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_ANON_KEY=your-key \
  -e SUPABASE_SERVICE_KEY=your-key \
  keledon:local

# Test
curl http://localhost:8080/health
```

## 🎉 That's It!

Your single container will:
- Serve frontend on `/`
- Proxy API calls from `/api/*` to backend
- Proxy WebSocket from `/socket.io` to backend
- Run on Cloud Run with automatic HTTPS
- Scale automatically
- Cost ~$0-5/month for low traffic

## 💡 Architecture

```
User → Cloud Run:8080 → Nginx → Frontend (static)
                      ↓
                   Backend:3001 (internal)
```

All in one container! Simple and efficient.
