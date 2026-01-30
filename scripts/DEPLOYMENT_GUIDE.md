# KELEDON Complete Deployment Scripts

This directory contains the complete deployment automation for KELEDON to Google Cloud Run.

## 🚀 Quick Start

### Linux/macOS
```bash
# Execute complete deployment
./deploy-all.sh

# Or with specific region
./deploy-all.sh us-west1
```

### Windows (PowerShell)
```powershell
# Execute complete deployment
.\deploy-all.ps1

# Or with specific region
.\deploy-all.ps1 -REGION "us-west1"
```

## 📋 What These Scripts Do

### 1️⃣ Prerequisites Validation
- ✅ gcloud CLI installation check
- ✅ Authentication verification
- ✅ Dockerfile existence check
- ✅ Project configuration validation

### 2️⃣ Environment Setup
- ✅ Set project to `keledon` automatically
- ✅ Enable required Google Cloud APIs
- ✅ Validate project access

### 3️⃣ Backend Deployment (keledon-cloud)
- ✅ Build and deploy NestJS backend
- ✅ Configure production environment variables
- ✅ Set resource limits (1 CPU, 1Gi memory)
- ✅ Configure auto-scaling (0-10 instances)
- ✅ Apply Supabase configuration

### 4️⃣ Frontend Deployment (keledon-landing)
- ✅ Build and deploy React frontend
- ✅ Configure Nginx for production
- ✅ Set resource limits (1 CPU, 512Mi memory)
- ✅ Configure auto-scaling (0-10 instances)

### 5️⃣ Post-Configuration
- ✅ Update CORS with real frontend URL
- ✅ Generate production environment files
- ✅ Configure WebSocket URLs
- ✅ Apply security settings

### 6️⃣ Documentation Generation
- ✅ Create `cloudconf.md` with all service URLs
- ✅ Generate management commands
- ✅ Provide next steps instructions
- ✅ Include troubleshooting guide

### 7️⃣ Verification
- ✅ Health check for backend
- ✅ Accessibility test for frontend
- ✅ Service status validation

## 🔧 Project Configuration

The scripts are pre-configured for your project:

- **Project ID**: `keledon`
- **Project Number**: `1062969561553`
- **Default Region**: `us-central1`
- **Backend Service**: `keledon-cloud`
- **Frontend Service**: `keledon-landing`

### Supabase Configuration
- **URL**: `https://isoyzcvjoevyphnaznkl.supabase.co`
- **Anon Key**: `sb_publishable_9sKVxamNyK4CdXM-yH69qg_fEHRvHRa`
- **Service Key**: `sb_secret_yqq_tgfKS_2BgKviwVn1lw_W_RbzJVV`

## 📁 Files Generated

### cloudconf.md
Complete configuration file generated after deployment containing:
- Service URLs (backend, frontend, health)
- Management commands
- Required configuration steps
- Cost estimates
- Troubleshooting guide

### landing/.env.production
Production environment file for frontend with:
- Real backend URL
- WebSocket configuration
- Supabase credentials
- Application settings

## 🎯 Post-Deployment Steps

After running the scripts, you need to:

### 1. Configure Global Providers
1. Access the frontend URL from `cloudconf.md`
2. Login as superadmin
3. Navigate to **Admin → Providers**
4. Configure API keys:
   - **STT**: Deepgram API key
   - **TTS**: ElevenLabs API key
   - **LLM**: OpenAI API key

### 2. Update Chrome Extension
Edit `agent/background.js`:
```javascript
const BACKEND_URL = 'https://your-backend-url.run.app';
```

### 3. Test Integration
1. Install updated Chrome extension
2. Test WebSocket connection
3. Verify audio capture
4. Test provider functionality

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Error**
   ```bash
   gcloud auth login
   gcloud config set project keledon
   ```

2. **Build Failures**
   - Check Dockerfiles exist in correct directories
   - Verify `package.json` build scripts
   - Check for syntax errors in source code

3. **Health Check Failures**
   - Wait 2-3 minutes for services to fully start
   - Check logs: `gcloud run services logs read keledon-cloud --region us-central1`
   - Verify environment variables

### Debug Commands

```bash
# Check service status
gcloud run services list

# Check service details
gcloud run services describe keledon-cloud --region us-central1

# View logs
gcloud run services logs read keledon-cloud --region us-central1 --limit 50

# Restart service
gcloud run services update keledon-cloud --region us-central1 --new-revision
```

## 💰 Cost Estimates

Based on moderate usage:

| Service | Monthly Cost |
|----------|--------------|
| Cloud Run (Backend) | $20-50 |
| Cloud Run (Frontend) | $10-25 |
| Supabase | $0-25 |
| AI Providers | $100-330 |

**Total**: $130-430/month

## 🔐 Security Considerations

### ✅ Automated
- Non-root containers
- HTTPS by default (Cloud Run)
- CORS restrictions
- API keys in management UI (not hardcoded)

### ⚠️ Your Responsibility
- Strong passwords for Supabase
- API key rotation policy
- Rate limiting configuration
- Monitoring and alerts

## 📚 Additional Scripts

### Individual Service Scripts
- `deploy-cloud.sh` / `deploy-cloud.ps1` - Backend only
- `deploy-landing.sh` / `deploy-landing.ps1` - Frontend only

### When to Use Individual Scripts
- Updating only one service
- Testing changes
- Staged deployments
- Rollback scenarios

## 🔄 Customization

### Changing Region
```bash
./deploy-all.sh us-west1
```

Available regions: `us-central1`, `us-west1`, `us-east1`, `europe-west1`, etc.

### Modifying Resources
Edit the script variables:
```bash
CPU=1
MEMORY="1Gi"
MAX_INSTANCES=10
MIN_INSTANCES=0
```

## 📞 Support

### Resources
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [KELEDON Repository](https://github.com/your-org/keledon)
- [Google Cloud Support](https://cloud.google.com/support)

### Issues
1. Check `cloudconf.md` for service URLs
2. Review deployment logs
3. Verify gcloud configuration
4. Create GitHub issue

---

## 🎉 Ready to Deploy!

Execute the script and watch KELEDON deploy to Google Cloud Run automatically:

```bash
./deploy-all.sh
```

The script will handle everything from validation to final verification, generating a complete configuration guide (`cloudconf.md`) for your production deployment.