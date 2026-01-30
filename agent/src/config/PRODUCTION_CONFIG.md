# KELEDON Chrome Extension - Production Configuration

# Update the BACKEND_URL in background.js for production:

# Development (current)
const BACKEND_URL = 'http://localhost:3001';

# Production (replace with your actual Cloud Run URL)
const BACKEND_URL = 'https://keeldon-cloud-xxxxx-xx.a.run.app';

# Or with custom domain:
const BACKEND_URL = 'https://api.your-domain.com';

# Steps to update for production:
# 1. Edit background.js line 96
# 2. Replace localhost URL with your Cloud Run service URL
# 3. Rebuild extension (npm run build if applicable)
# 4. Upload to Chrome Web Store or load unpacked for testing

# Note: Make sure the backend URL is included in CORS_ORIGINS environment variable