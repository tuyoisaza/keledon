# KELEDON Deployment URLs - Get and Test Your Services

## 🚀 Quick Commands to Get Your URLs

Run these commands in your local terminal (where gcloud is installed):

### **Get Backend URL**
```bash
gcloud run services describe keledon-cloud \
    --region us-central1 \
    --format 'value(status.url)'
```

### **Get Frontend URL**
```bash
gcloud run services describe keeldon-landing \
    --region us-central1 \
    --format 'value(status.url)'
```

### **Test Backend Health**
```bash
# Replace with your actual backend URL
curl [BACKEND_URL]/health

# Example:
curl https://keeldon-cloud-abc123.a.run.app/health
```

## 🧪 Testing Your Deployment

Once you have the URLs, test these endpoints:

### **Backend Tests**
```bash
# Health check
curl [BACKEND_URL]/health

# Get providers
curl [BACKEND_URL]/api/providers

# Check CORS (should return 200 OPTIONS)
curl -X OPTIONS [BACKEND_URL]/health \
  -H "Origin: chrome-extension://test" \
  -H "Access-Control-Request-Method: GET"
```

### **Frontend Test**
Open `[FRONTEND_URL]` in your browser

## 📋 All-in-One Command
```bash
# Get all URLs and test health in one go
echo "=== Backend ==="
BACKEND_URL=$(gcloud run services describe keeldon-cloud --region us-central1 --format 'value(status.url)')
echo "Backend URL: $BACKEND_URL"
curl -s "$BACKEND_URL/health" && echo "✅ Backend OK" || echo "❌ Backend Failed"

echo ""
echo "=== Frontend ==="
FRONTEND_URL=$(gcloud run services describe keledon-landing --region us-central1 --format 'value(status.url)')
echo "Frontend URL: $FRONTEND_URL"
curl -s -I "$FRONTEND_URL" | head -1 && echo "✅ Frontend OK" || echo "❌ Frontend Failed"

echo ""
echo "=== Test Results ==="
echo "Backend:  $BACKEND_URL/health"
echo "Frontend: $FRONTEND_URL"
```

## 🔍 If Services Don't Appear

Check deployment status:
```bash
gcloud run services list --region us-central1
```

View recent logs:
```bash
gcloud run services logs read keeldon-cloud --region us-central1 --limit 20
gcloud run services logs read keeldon-landing --region us-central1 --limit 20
```

## ✅ Success Criteria

Your deployment is successful when:
- ✅ Both URLs return HTTP 200
- ✅ Backend `/health` returns JSON with status "ok"
- ✅ Frontend loads in browser
- ✅ No CORS errors in console

## 🎯 Next Steps After Success

1. **Update Chrome Extension** - Edit `agent/background.js`:
   ```javascript
   const BACKEND_URL = '[YOUR_BACKEND_URL]';
   ```

2. **Configure Global Providers** - Visit frontend URL and set up:
   - STT: Deepgram API key
   - TTS: ElevenLabs API key  
   - LLM: OpenAI API key

3. **Test Integration** - Install updated Chrome extension and test full flow

---

**Run the commands above to get your URLs and test the deployment!** 🚀