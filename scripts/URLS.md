# KELEDON URLs - Get Your Testing Endpoints

## 🚀 Quick Commands to Get URLs

### Option 1: Run the Script (Windows)
```cmd
cd C:\Keldon\scripts
get-urls.bat
```

### Option 2: Manual Commands
Run these in your terminal (where gcloud is installed):

```bash
# Get Backend URL
gcloud run services describe keeldon-cloud --region us-central1 --format 'value(status.url)'

# Get Frontend URL  
gcloud run services describe keledon-landing --region us-central1 --format 'value(status.url)'

# Test Backend Health
curl [BACKEND_URL]/health
```

## 🧪 Once You Have URLs

Test these endpoints:

### Backend Tests
```bash
# Health check
curl [BACKEND_URL]/health

# Get providers
curl [BACKEND_URL]/api/providers

# Test CORS
curl -X OPTIONS [BACKEND_URL]/health \
  -H "Origin: chrome-extension://test" \
  -H "Access-Control-Request-Method: GET"
```

### Frontend Test
Open `[FRONTEND_URL]` in your browser

## 🔍 Troubleshooting

### If services don't appear:
```bash
# Check deployment status
gcloud run services list --region us-central1

# View logs
gcloud run services logs read keledon-cloud --region us-central1 --limit 20
```

### Expected Results:
- ✅ Backend `/health` returns: `{"status":"ok","timestamp":"...","service":"keledon-cloud","version":"1.0.0"}`
- ✅ Frontend loads the KELEDON landing page
- ✅ No CORS errors in browser console

## 🎯 Next Steps After Success

1. **Update Chrome Extension** - Edit `agent/background.js`:
   ```javascript
   const BACKEND_URL = '[YOUR_BACKEND_URL]';
   ```

2. **Configure Providers** - Visit frontend URL and set up:
   - STT: Deepgram API key
   - TTS: ElevenLabs API key  
   - LLM: OpenAI API key

3. **Test Full Integration** - Install Chrome extension and test complete flow

---

**Run `get-urls.bat` or the manual commands to get your URLs!** 🚀