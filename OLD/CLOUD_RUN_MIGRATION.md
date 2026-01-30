# KELEDON - Google Cloud Run Migration Guide

This guide provides complete instructions for migrating KELEDON from local development to Google Cloud Run production deployment.

## Quick Start

### Prerequisites
- Google Cloud project with billing enabled
- gcloud CLI installed and authenticated
- Domain name (optional, for custom URLs)

### One-Command Deployment
```bash
# Deploy backend
./scripts/deploy-cloud.sh your-project-id us-central1

# Deploy frontend  
./scripts/deploy-landing.sh your-project-id us-central1
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud                             │
├─────────────────────────────────────────────────────────────┤
│  Cloud Run Services                                        │
│  ┌─────────────────┐  ┌─────────────────┐                │
│  │  keledon-cloud  │  │ keledon-landing │                │
│  │   (Backend)     │  │  (Frontend)     │                │
│  │   NestJS +      │  │   React +       │                │
│  │   Socket.io     │  │   Nginx         │                │
│  │   Port 8080     │  │   Port 8080     │                │
│  └─────────────────┘  └─────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│  External Services                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │  Supabase   │ │  Deepgram   │ │ ElevenLabs  │          │
│  │ (Database)  │ │  (STT)      │ │   (TTS)     │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  Client Applications                                        │
│  ┌─────────────┐ ┌─────────────┐                         │
│  │ Chrome Ext.  │ │   Web UI    │                         │
│  │  (Agent)    │ │ (Landing)   │                         │
│  └─────────────┘ └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## File Structure After Migration

```
KELEDON/
├── cloud/
│   ├── Dockerfile                 # ✅ Created
│   ├── .dockerignore             # ✅ Created
│   ├── .env.production          # ✅ Created
│   └── src/
│       ├── main.ts              # ✅ Updated (port 8080)
│       ├── health.controller.ts # ✅ Created
│       ├── app.gateway.ts       # ✅ Updated (CORS)
│       └── listening-sessions/
│           └── listening.gateway.ts # ✅ Updated
├── landing/
│   ├── Dockerfile               # ✅ Created
│   ├── .dockerignore           # ✅ Created
│   ├── nginx.conf              # ✅ Created
│   └── .env.production        # ✅ Created
├── agent/
│   ├── background.js           # ✅ Updated (BACKEND_URL)
│   └── PRODUCTION_CONFIG.md   # ✅ Created
├── scripts/
│   ├── deploy-cloud.sh         # ✅ Created
│   ├── deploy-landing.sh       # ✅ Created
│   ├── deploy-cloud.ps1        # ✅ Created
│   ├── deploy-landing.ps1      # ✅ Created
│   └── README.md              # ✅ Created
└── docs/
    └── CUSTOM_DOMAIN_SETUP.md  # ✅ Created
```

## Configuration Changes

### Backend (cloud/)

**Dockerfile**: Multi-stage build optimized for production
- Node.js 18 Alpine
- Non-root user for security
- Health check endpoint
- Port 8080 (Cloud Run requirement)

**main.ts**: 
- Dynamic port configuration
- Production CORS defaults
- Environment-aware configuration

**WebSocket Configuration**:
- Cloud Run compatible transports
- Production CORS settings
- Proper headers for security

### Frontend (landing/)

**Dockerfile**: Nginx-based serving
- Optimized static asset serving
- Gzip compression
- Security headers
- SPA routing support

**nginx.conf**:
- Production-ready configuration
- WebSocket proxy (optional)
- Caching for static assets

### Chrome Extension (agent/)

**background.js**: Configurable backend URL
- Development: `http://localhost:3001`
- Production: `https://api.your-domain.com`

## Deployment Process

### 1. Backend Deployment
```bash
# Using the provided script
./scripts/deploy-cloud.sh your-project-id us-central1

# Or manually
cd cloud
gcloud run deploy keledon-cloud \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --cpu 1 --memory 1Gi \
  --max-instances 10 --min-instances 0
```

### 2. Frontend Deployment
```bash
# Using the provided script
./scripts/deploy-landing.sh your-project-id us-central1

# Or manually  
cd landing
gcloud run deploy keledon-landing \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --cpu 1 --memory 512Mi \
  --max-instances 10 --min-instances 0
```

### 3. Post-Deployment Configuration

#### Update Environment Variables
```bash
# Update backend CORS
gcloud run services update keledon-cloud \
  --set-env-vars "CORS_ORIGINS=https://app.your-domain.com,chrome-extension://*"
```

#### Configure Global Providers
1. Access `https://app.your-domain.com`
2. Login as superadmin
3. Navigate to **Admin → Providers**
4. Configure API keys:
   - **STT**: Deepgram API key
   - **TTS**: ElevenLabs API key  
   - **LLM**: OpenAI API key

#### Update Chrome Extension
```javascript
// In agent/background.js
const BACKEND_URL = 'https://api.your-domain.com';
```

## Cost Analysis

### Cloud Run Costs (us-central1)
| Service | CPU | Memory | Cost per 100k requests | Monthly Estimate* |
|---------|-----|--------|----------------------|-------------------|
| Backend | 1 vCPU | 1Gi | $0.40 | $20-50 |
| Frontend | 1 vCPU | 512Mi | $0.30 | $10-25 |

### External Service Costs
| Service | Usage Rate | Monthly Estimate* |
|---------|------------|-------------------|
| Supabase | Basic plan | $0-25 |
| Deepgram (STT) | $0.0059/min | $30-100 |
| ElevenLabs (TTS) | $1/1000 chars | $20-80 |
| OpenAI (LLM) | $0.03-0.06/1K tokens | $50-150 |

**Total Estimated Monthly Cost: $130-430**

*Estimates based on moderate usage (10-20 hours of calls per day)

## Security Considerations

### ✅ Implemented
- Non-root containers
- HTTPS by default (Cloud Run)
- CORS restrictions
- Security headers
- API keys in management UI (not hardcoded)

### ⚠️ Your Responsibility
- Strong passwords for Supabase
- API key rotation policy
- Rate limiting configuration
- Monitoring and alerts
- Backup strategy

## Monitoring and Maintenance

### Health Checks
```bash
# Backend health
curl https://api.your-domain.com/health

# Frontend availability
curl -I https://app.your-domain.com
```

### Log Monitoring
```bash
# Backend logs
gcloud run services logs read keledon-cloud --region us-central1

# Frontend logs  
gcloud run services logs read keledon-landing --region us-central1
```

### Performance Monitoring
- Google Cloud Monitoring (built-in)
- Uptime alerts setup
- Custom metrics for:
  - WebSocket connections
  - API response times
  - Error rates

## Scaling Configuration

### Auto-scaling Settings
```bash
# Backend scaling
gcloud run services update keledon-cloud \
  --max-instances 20 \
  --min-instances 0 \
  --cpu 1 \
  --memory 2Gi \
  --concurrency 80

# Frontend scaling
gcloud run services update keledon-landing \
  --max-instances 50 \
  --min-instances 1 \
  --cpu 1 \
  --memory 1Gi \
  --concurrency 100
```

## Troubleshooting Guide

### Common Issues

1. **WebSocket Connection Failed**
   ```
   Solution: Check CORS_ORIGINS includes your domain
   ```

2. **Extension Can't Connect**
   ```
   Solution: Update BACKEND_URL in background.js
   ```

3. **Build Failures**
   ```
   Solution: Check Dockerfiles and package.json scripts
   ```

4. **Health Check Failing**
   ```
   Solution: Verify /health endpoint exists and responds
   ```

### Debug Commands
```bash
# Service status
gcloud run services list

# Service details
gcloud run services describe keledon-cloud --region us-central1

# Recent logs
gcloud run services logs read keledon-cloud --region us-central1 --limit 50
```

## Rollback Plan

### Quick Rollback
```bash
# Deploy previous version
gcloud run services update-traffic keledon-cloud \
  --region us-central1 \
  --to-revisions=keledon-cloud-00001-abc=100

# Emergency rollback to localhost (development)
const BACKEND_URL = 'http://localhost:3001';
```

### Backup Strategy
- Export Supabase data regularly
- Version control for configuration
- Monitor for regressions
- A/B test major changes

## Support and Resources

### Documentation
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)
- [Socket.io Deployment Guide](https://socket.io/docs/v4/deployment/)

### Community Support
- Google Cloud Community
- Stack Overflow
- KELEDON Repository Issues

### Emergency Contacts
- Google Cloud Support (if subscription)
- Internal development team
- System administrator

---

## 🎉 Migration Complete!

Once you've completed these steps, KELEDON will be running successfully on Google Cloud Run with:

- ✅ Scalable backend with WebSocket support
- ✅ Optimized frontend with CDN-like performance  
- ✅ Secure HTTPS connections
- ✅ Provider configuration via management UI
- ✅ Chrome extension connectivity
- ✅ Production-ready monitoring

For any issues, refer to the troubleshooting section or create an issue in the KELEDON repository.