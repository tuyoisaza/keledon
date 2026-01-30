# KELEDON Development & Deployment Scripts

This document explains the available scripts for running KELEDON locally and deploying to production.

## Local Development

### Windows (Recommended)
```batch
# Run the development environment
dev-run.bat
```

### macOS/Linux
```bash
# Make scripts executable (first time only)
chmod +x scripts/*.sh

# Run development environment
./scripts/dev.sh
```

## Cloud Deployment

### Windows PowerShell (Recommended)
```powershell
# Deploy to Cloud Run with defaults
.\deploy.ps1

# Deploy with custom parameters
.\deploy.ps1 -ProjectId "your-project" -ServiceName "your-service" -ImageTag "v1.0.0"
```

### Cross-Platform (Bash)
```bash
# Deploy to Cloud Run
./deploy-single-container.sh
```

## What the Scripts Do

### dev-run.bat (Local Development)
1. **Checks dependencies** - Verifies cloud/ and landing/ directories exist
2. **Installs packages** - Runs npm install if node_modules missing
3. **Starts services** - Launches backend (port 3001) and frontend (port 5173)
4. **Opens browser** - Automatically opens http://localhost:5173

### deploy.ps1 (Cloud Run Deployment)
1. **Validates environment** - Checks for Dockerfile and sets project
2. **Builds container** - Creates multi-stage Docker image with frontend + backend
3. **Pushes to registry** - Uploads image to Google Container Registry
4. **Deploys to Cloud Run** - Creates/updates service with production settings
5. **Verifies deployment** - Runs health check on deployed service

## Configuration

### Local Development
- Frontend: http://localhost:5173 (Vite dev server)
- Backend: http://localhost:3001 (NestJS)
- API Documentation: http://localhost:3001/api

### Production Deployment
- Service: Cloud Run managed service
- Port: 8080 (nginx reverse proxy)
- Memory: 1GB
- CPU: 1000m
- Auto-scaling: 0-10 instances
- Health checks: /health endpoint

## Environment Variables

### Required for Production
Set these in Google Cloud Console or via gcloud:

```bash
# API Keys
OPENAI_API_KEY=your_openai_key
DEEPGRAM_API_KEY=your_deepgram_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Vector Store
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key
```

### Local Development (.env files)
Create `.env` files in both `cloud/` and `agent/` directories for local testing.

## Troubleshooting

### Local Development Issues
```batch
# Clear node_modules and reinstall
rmdir /s cloud\node_modules
rmdir /s landing\node_modules
dev-run.bat
```

### Deployment Issues
```powershell
# Check Cloud Run logs
gcloud logs tail "resource.type=cloud_run_revision" --limit 50

# Verify service status
gcloud run services describe keledon --region us-central1

# Redeploy with new tag
.\deploy.ps1 -ImageTag "fix-$(Get-Date -Format 'yyyyMMdd-HHmm')"
```

### Docker Issues
```bash
# Clean up Docker resources
docker system prune -f
docker image prune -f

# Test build locally
docker build -t keledon-test .
docker run -p 8080:8080 keledon-test
```

## Next Steps

1. **Set up environment variables** for production APIs
2. **Configure custom domain** if needed
3. **Set up monitoring** and alerting
4. **Create CI/CD pipeline** for automated deployments