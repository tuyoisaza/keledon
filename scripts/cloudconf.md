# KELEDON Cloud Configuration (DEMO)
Generated: 2026-01-25 11:37:58
Project: keledon (1062969561553)
Region: us-central1

## 🌐 Service URLs (Demo)
- **Backend**: https://keledon-cloud-demo-abcde-12345.a.run.app
- **Frontend**: https://keledon-landing-demo-fghij-67890.a.run.app
- **Health Check**: https://keledon-cloud-demo-abcde-12345.a.run.app/health

## 🔧 Management Commands
```bash
# Backend Health
curl https://keledon-cloud-demo-abcde-12345.a.run.app/health

# View Logs
gcloud run services logs read keledon-cloud --region us-central1 --limit 50
gcloud run services logs read keledon-landing --region us-central1 --limit 50

# Update Services
gcloud run services update keledon-cloud --region us-central1 --new-revision
```

## ⚙️ Configuration Applied
- **CORS_ORIGINS**: chrome-extension://*,https://keledon-landing-demo-fghij-67890.a.run.app
- **NODE_ENV**: production
- **PORT**: 8080
- **Supabase**: https://isoyzcvjoevyphnaznkl.supabase.co

## 🎯 Next Steps (Required)

### 1️⃣ Configure Global Providers
1. Access: https://keledon-landing-demo-fghij-67890.a.run.app
2. Login as superadmin
3. Navigate: Admin → Providers
4. Configure:
   - **STT**: Deepgram API key
   - **TTS**: ElevenLabs API key  
   - **LLM**: OpenAI API key

### 2️⃣ Update Chrome Extension
Edit `agent/background.js`:
```javascript
const BACKEND_URL = 'https://keledon-cloud-demo-abcde-12345.a.run.app';
```

### 3️⃣ Test Integration
1. Install updated Chrome extension
2. Test WebSocket connection
3. Verify audio capture
4. Test provider functionality

## 💰 Estimated Costs
- **Cloud Run (Backend)**: $20-50/month
- **Cloud Run (Frontend)**: $10-25/month
- **Supabase**: Free tier (current usage)
- **AI Providers**: $100-330/month (depending on usage)

## 🚨 Troubleshooting
```bash
# Check service status
gcloud run services list

# Check service details
gcloud run services describe keledon-cloud --region us-central1

# Restart service
gcloud run services update keledon-cloud --region us-central1 --new-revision
```

## 📚 Real Deployment Commands
To run the actual deployment, execute:

### With gcloud CLI installed and authenticated:
```bash
# 1. Authenticate
gcloud auth login
gcloud config set project keledon

# 2. Run deployment
cd scripts
chmod +x deploy-all.sh
./deploy-all.sh
```

### Using the real script:
```bash
./deploy-all.sh us-central1
```

---
🎉 This was a demo! For real deployment, authenticate with Google Cloud first.
