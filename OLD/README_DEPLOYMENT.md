# KELEDON Deployment Guide

## 🚀 Quick Start

Deploy KELEDON to Google Cloud Run with a single command:

```bash
# Set your GCP project ID
export GCP_PROJECT_ID=keledon

# Make deploy script executable
chmod +x deploy.sh

# Deploy!
./deploy.sh
```

## 📋 Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and authenticated
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```
3. **Docker** installed and running
4. **GCP Project** created
   ```bash
   gcloud projects create your-project-id
   gcloud config set project your-project-id
   ```

## 🔧 Configuration

### Before First Deployment

1. **Set environment variables** (or use defaults):
   ```bash
   export GCP_PROJECT_ID=keledon
   export SERVICE_NAME=keledon
   export REGION=us-central1
   ```
   
   **Note:** Defaults are already set to `keledon`, so you can skip this if using the default project ID.

2. **Set Environment Variables in Cloud Run** (after first deployment):
   - Go to Cloud Run Console → Your Service → Edit & Deploy New Revision
   - Add these variables:
     ```
     NODE_ENV=production
     PORT=3001
     SINGLE_CONTAINER=true
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_KEY=your-service-key
     CORS_ORIGINS=https://your-service-url.run.app,chrome-extension://*
     ```

## 📦 What Gets Deployed

The `deploy.sh` script:
1. ✅ Builds a single Docker container with:
   - Frontend (React app) served by Nginx
   - Backend (NestJS API) running internally
   - Nginx reverse proxy connecting them
2. ✅ Pushes to Google Container Registry
3. ✅ Deploys to Cloud Run
4. ✅ Provides you with the service URL

## 🌐 Architecture

```
User Request → Cloud Run (Port 8080)
                    ↓
              ┌─────────────┐
              │   Nginx     │
              │  (Port 8080)│
              └──────┬──────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
     /api/*      /socket.io    / (static)
        │            │            │
        ↓            ↓            ↓
   Backend      Backend      Frontend
  (Port 3001)  (Port 3001)   (Static Files)
```

## 🔄 Updating Deployment

To update after code changes:

```bash
./deploy.sh
```

The script will:
- Rebuild the container with latest code
- Push new image
- Update Cloud Run service

## 🧪 Testing Locally

Before deploying, test the container locally:

```bash
# Build image
docker build -t keledon:local .

# Run container
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e SINGLE_CONTAINER=true \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_ANON_KEY=your-key \
  -e SUPABASE_SERVICE_KEY=your-key \
  keledon:local

# Test in browser
open http://localhost:8080
```

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | ✅ | Environment | `production` |
| `PORT` | ✅ | Backend internal port | `3001` |
| `SINGLE_CONTAINER` | ✅ | Enable single container mode | `true` |
| `SUPABASE_URL` | ✅ | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key | `eyJ...` |
| `SUPABASE_SERVICE_KEY` | ✅ | Supabase service key | `eyJ...` |
| `CORS_ORIGINS` | ✅ | Allowed origins | `https://xxx.run.app,chrome-extension://*` |
| `DEEPGRAM_API_KEY` | ❌ | Deepgram API key | `xxx` |
| `OPENAI_API_KEY` | ❌ | OpenAI API key | `sk-xxx` |
| `ELEVENLABS_API_KEY` | ❌ | ElevenLabs API key | `xxx` |

## 🎯 After Deployment

1. **Get your service URL** from the deploy script output
2. **Update agent** (`agent/background.js`):
   ```javascript
   let BACKEND_URL = 'https://your-service-url.run.app';
   ```
3. **Test the deployment**:
   ```bash
   curl https://your-service-url.run.app/health
   ```
4. **Set up custom domain** (optional):
   - Go to Cloud Run → Your Service → Manage Custom Domains
   - Add your domain
   - Update DNS records as instructed

## 🐛 Troubleshooting

### Build fails
- Check Docker is running: `docker ps`
- Check you have enough disk space
- Try: `docker system prune` to free space

### Deployment fails
- Check GCP project ID is correct
- Verify billing is enabled
- Check you have Cloud Run permissions

### Service doesn't start
- Check Cloud Run logs: `gcloud run services logs read keledon`
- Verify environment variables are set
- Check backend health: `curl https://your-url/health`

### Frontend can't connect to backend
- Verify CORS_ORIGINS includes your service URL
- Check nginx is proxying correctly
- Check browser console for errors

## 💰 Cost Estimate

- **Cloud Run**: ~$0.40 per million requests (very cheap)
- **Container Registry**: First 0.5GB free
- **Total**: ~$0-5/month for low traffic

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Container Registry](https://cloud.google.com/container-registry)
- See `DEPLOYMENT_PLAN.md` for architecture details
