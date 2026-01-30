#!/bin/bash
# deploy-single-container.sh — KELEDON Single Container Deployment to Cloud Run
# Uses the multi-stage Dockerfile that builds both frontend and backend

set -e

echo "🚀 Deploying KELEDON to Cloud Run..."

# Get Google Cloud project ID
PROJECT_ID=$(gcloud config get-value core/project)
if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: No Google Cloud project configured. Run 'gcloud config set project YOUR_PROJECT_ID'"
  exit 1
fi

echo "📦 Using project: $PROJECT_ID"

# Set image name
IMAGE_NAME="keledon-single-container"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="gcr.io/$PROJECT_ID/$IMAGE_NAME:$IMAGE_TAG"

echo "🐳 Building Docker image..."
docker build -t "$FULL_IMAGE_NAME" .

echo "📤 Pushing to Google Container Registry..."
docker push "$FULL_IMAGE_NAME"

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy keledon \
  --image="$FULL_IMAGE_NAME" \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1000m \
  --timeout=300s \
  --max-instances=10 \
  --min-instances=0

echo "✅ Deployment complete!"
echo "📍 Endpoint: $(gcloud run services describe keledon --region=us-central1 --format='value(status.url)')"