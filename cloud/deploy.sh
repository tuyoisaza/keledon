#!/bin/bash
# deploy.sh — Keledón Cloud Run Deployment (aligned with master brief)

set -e

echo "📦 Building NestJS cloud service..."
npm install
npm run build

echo "🐳 Building Docker image..."
docker build -t gcr.io/$(gcloud config get-value core/project)/keledon-cloud:latest .

echo "📤 Pushing to Artifact Registry..."
gcloud builds submit --tag gcr.io/$(gcloud config get-value core/project)/keledon-cloud:latest .

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy keledon \
  --image gcr.io/$(gcloud config get-value core/project)/keledon-cloud:latest \
  --region=us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port=3000 \
  --timeout=300

echo "✅ Deployed! Endpoint: https://keledon.tuyoisaza.com"