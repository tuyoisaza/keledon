#!/bin/bash

echo "🔍 KELEDON URL FINDER"
echo "====================="

PROJECT_ID="keledon"
REGION="us-central1"

echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Get all Cloud Run services
echo "📋 Cloud Run Services:"
gcloud run services list --region=$REGION --format="table(name,status.url,status.latestReadyRevisionName)"

echo ""
echo "🔧 Getting Service Details..."

# Try to get backend details
echo "Backend Service Details:"
gcloud run services describe keeldon-cloud --region=$REGION --format="value(status.url)" 2>/dev/null || echo "Service 'keledon-cloud' not found"

# Try to get frontend details  
echo "Frontend Service Details:"
gcloud run services describe keeldon-landing --region=$REGION --format="value(status.url)" 2>/dev/null || echo "Service 'keeldon-landing' not found"

echo ""
echo "📊 Storage Buckets:"
gsutil ls 2>/dev/null || echo "gsutil not available"

echo ""
echo "🧪 Testing Common URL Patterns:"

# Test possible backend URLs
echo "Testing backend URLs..."
curl -s -I https://keeldon-cloud-dot-keeldon.uc.r.appspot.com/health 2>/dev/null && echo "✅ https://keeldon-cloud-dot-keledon.uc.r.appspot.com/health" || echo "❌ Backend URL not accessible"

# Test frontend storage
echo "Testing frontend storage..."
curl -s -I https://keeldon-landing-frontend.storage.googleapis.com/ 2>/dev/null && echo "✅ https://keeldon-landing-frontend.storage.googleapis.com/" || echo "❌ Frontend storage not accessible"

echo ""
echo "🎯 Commands to run in your terminal:"
echo "===================================="
echo "# Get actual service URLs:"
echo "gcloud run services list --region=us-central1"
echo ""
echo "# Test backend health:"
echo "curl [BACKEND_URL]/health"
echo ""
echo "# Fix frontend bucket permissions:"
echo "gsutil iam ch allUsers:objectViewer gs://keeldon-landing-frontend"

echo ""
echo "🚀 Next steps:"
echo "1. Run these commands locally"
echo "2. Update Chrome extension with real backend URL"
echo "3. Fix frontend bucket permissions if needed"