# KELEDON Single Container Deployment Guide

This document explains how to deploy KELEDON using the single-container approach that combines both frontend and backend.

## Overview

The deployment uses a multi-stage Dockerfile that:
1. Builds the React frontend (Vite)
2. Builds the NestJS backend
3. Combines both in a single container with nginx as reverse proxy

## Prerequisites

- Google Cloud CLI installed and configured
- Docker installed and running
- gcloud project set (`gcloud config set project YOUR_PROJECT_ID`)

## Quick Deploy

```bash
# Make script executable
chmod +x deploy-single-container.sh

# Run deployment
./deploy-single-container.sh
```

## Manual Steps

If you prefer manual deployment:

```bash
# 1. Build and push Docker image
PROJECT_ID=$(gcloud config get-value core/project)
docker build -t gcr.io/$PROJECT_ID/keledon-single-container:latest .
docker push gcr.io/$PROJECT_ID/keledon-single-container:latest

# 2. Deploy to Cloud Run
gcloud run deploy keledon \
  --image=gcr.io/$PROJECT_ID/keledon-single-container:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1000m \
  --timeout=300s
```

## Architecture

```
┌─────────────────────────────────────┐
│              Cloud Run              │
│  ┌─────────────────────────────┐   │
│  │         nginx (Port 8080)   │   │
│  │  ┌─────────┬─────────────┐   │   │
│  │  │ Frontend│   Backend   │   │   │
│  │  │  (Files)│  (Port 3001)│   │   │
│  │  └─────────┴─────────────┘   │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Environment Variables

The container automatically sets:
- `SINGLE_CONTAINER=true`
- `NODE_ENV=production`
- Backend runs on internal port 3001
- nginx serves on port 8080

## Health Checks

- Container health check: `GET http://localhost:8080/`
- Backend health check: `GET http://localhost:8080/health`

## Resource Configuration

- **Memory**: 1GB (adjustable)
- **CPU**: 1000m (adjustable)
- **Timeout**: 300 seconds
- **Max instances**: 10 (auto-scaling)
- **Min instances**: 0 (scale to zero)

## API Routes

All backend routes are proxied through `/api/`:
- Frontend: `https://your-app.com/`
- API: `https://your-app.com/api/`
- WebSocket: `https://your-app.com/socket.io/`
- Audio streaming: `https://your-app.com/listen/`

## Troubleshooting

### Build Issues
```bash
# Check if all required files exist
ls -la Dockerfile nginx.conf start.sh
```

### Deployment Issues
```bash
# Check Cloud Run logs
gcloud logs read "resource.type=cloud_run_revision" --limit=50

# Check service status
gcloud run services describe keledon --region=us-central1
```

### Runtime Issues
```bash
# Get container logs
gcloud logs read "resource.type=cloud_run_revision" --limit=100 --format='table(textPayload)'
```

## Custom Domains

To use a custom domain:
```bash
# Map domain
gcloud run services update-traffic keledon \
  --region=us-central1 \
  --to-latest-tag

# Configure domain mapping
gcloud run domain-mappings create \
  --service=keledon \
  --domain=your-domain.com \
  --region=us-central1
```

## Next Steps

1. Configure environment variables for production (API keys, database URLs)
2. Set up monitoring and alerting
3. Configure custom SSL certificates if needed
4. Set up CI/CD pipeline for automated deployments