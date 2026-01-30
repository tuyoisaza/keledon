#!/bin/bash

# KELEDON Single Container Deployment Script for Google Cloud Run
# This script builds, pushes, and deploys the container to Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - UPDATE THESE VALUES
PROJECT_ID="${GCP_PROJECT_ID:-keledon}"  # Your GCP Project ID
SERVICE_NAME="${SERVICE_NAME:-keledon}"         # Cloud Run service name
REGION="${REGION:-us-central1}"                  # Cloud Run region
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Check if required tools are installed
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker is required but not installed.${NC}" >&2; exit 1; }
command -v gcloud >/dev/null 2>&1 || { echo -e "${RED}❌ gcloud CLI is required but not installed.${NC}" >&2; exit 1; }

echo -e "${GREEN}🚀 KELEDON Deployment Script${NC}"
echo -e "${YELLOW}Project ID: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Service Name: ${SERVICE_NAME}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"
echo ""

# Step 1: Set GCP project
echo -e "${GREEN}📋 Step 1: Setting GCP project...${NC}"
gcloud config set project ${PROJECT_ID} || {
    echo -e "${RED}❌ Failed to set GCP project. Please check your project ID.${NC}"
    exit 1
}

# Step 2: Enable required APIs
echo -e "${GREEN}📋 Step 2: Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    artifactregistry.googleapis.com || {
    echo -e "${YELLOW}⚠️  Some APIs may already be enabled. Continuing...${NC}"
}

# Step 3: Configure Docker for GCR
echo -e "${GREEN}📋 Step 3: Configuring Docker authentication...${NC}"
gcloud auth configure-docker --quiet || {
    echo -e "${RED}❌ Failed to configure Docker.${NC}"
    exit 1
}

# Step 4: Build Docker image
echo -e "${GREEN}📋 Step 4: Building Docker image...${NC}"
echo -e "${YELLOW}This may take several minutes...${NC}"
docker build -t ${IMAGE_NAME}:latest . || {
    echo -e "${RED}❌ Docker build failed.${NC}"
    exit 1
}

# Step 5: Push image to Container Registry
echo -e "${GREEN}📋 Step 5: Pushing image to Container Registry...${NC}"
docker push ${IMAGE_NAME}:latest || {
    echo -e "${RED}❌ Failed to push image.${NC}"
    exit 1
}

# Step 6: Load environment variables from cloud/.env
echo -e "${GREEN}📋 Step 6: Loading environment variables from cloud/.env...${NC}"

ENV_FILE="cloud/.env"
ENV_VARS="NODE_ENV=production,PORT=3001,SINGLE_CONTAINER=true"

if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Reading environment variables from $ENV_FILE...${NC}"
    
    # Read Supabase variables
    if grep -q "^SUPABASE_URL=" "$ENV_FILE"; then
        SUPABASE_URL=$(grep "^SUPABASE_URL=" "$ENV_FILE" | cut -d '=' -f2-)
        ENV_VARS="$ENV_VARS,SUPABASE_URL=$SUPABASE_URL"
        echo -e "${GREEN}  ✓ SUPABASE_URL${NC}"
    fi
    if grep -q "^SUPABASE_ANON_KEY=" "$ENV_FILE"; then
        SUPABASE_ANON=$(grep "^SUPABASE_ANON_KEY=" "$ENV_FILE" | cut -d '=' -f2-)
        ENV_VARS="$ENV_VARS,SUPABASE_ANON_KEY=$SUPABASE_ANON"
        echo -e "${GREEN}  ✓ SUPABASE_ANON_KEY${NC}"
    fi
    if grep -q "^SUPABASE_SERVICE_KEY=" "$ENV_FILE"; then
        SUPABASE_SERVICE=$(grep "^SUPABASE_SERVICE_KEY=" "$ENV_FILE" | cut -d '=' -f2-)
        ENV_VARS="$ENV_VARS,SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE"
        echo -e "${GREEN}  ✓ SUPABASE_SERVICE_KEY${NC}"
    fi
    
    # Read optional API keys
    for key in DEEPGRAM_API_KEY OPENAI_API_KEY ELEVENLABS_API_KEY; do
        if grep -q "^$key=" "$ENV_FILE"; then
            value=$(grep "^$key=" "$ENV_FILE" | cut -d '=' -f2-)
            if [ -n "$value" ]; then
                ENV_VARS="$ENV_VARS,$key=$value"
                echo -e "${GREEN}  ✓ $key${NC}"
            fi
        fi
    done
else
    echo -e "${YELLOW}⚠️  cloud/.env not found. You'll need to set environment variables manually in Cloud Run Console.${NC}"
fi

echo ""

# Step 7: Deploy to Cloud Run
echo -e "${GREEN}📋 Step 7: Deploying to Cloud Run...${NC}"

# Check if service exists
if gcloud run services describe ${SERVICE_NAME} --region=${REGION} --project=${PROJECT_ID} >/dev/null 2>&1; then
    echo -e "${YELLOW}Service exists. Updating...${NC}"
    UPDATE_FLAG="--update"
else
    echo -e "${YELLOW}Service does not exist. Creating...${NC}"
    UPDATE_FLAG=""
fi

# Deploy with environment variables
gcloud run deploy ${SERVICE_NAME} \
    ${UPDATE_FLAG} \
    --image ${IMAGE_NAME}:latest \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300 \
    --set-env-vars "${ENV_VARS}" \
    --project ${PROJECT_ID} || {
    echo -e "${RED}❌ Deployment failed.${NC}"
    exit 1
}

# Step 8: Get service URL and update CORS_ORIGINS
echo -e "${GREEN}📋 Step 8: Getting service URL and updating CORS_ORIGINS...${NC}"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --project=${PROJECT_ID} --format 'value(status.url)')

# Update CORS_ORIGINS with the actual service URL
CORS_ORIGINS="${SERVICE_URL},chrome-extension://*"
echo -e "${YELLOW}Updating CORS_ORIGINS to: ${CORS_ORIGINS}${NC}"
gcloud run services update ${SERVICE_NAME} \
    --region=${REGION} \
    --update-env-vars "CORS_ORIGINS=${CORS_ORIGINS}" \
    --project=${PROJECT_ID} >/dev/null 2>&1

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${GREEN}🌐 Service URL: ${SERVICE_URL}${NC}"
echo ""
echo -e "${YELLOW}📝 Environment variables automatically set from cloud/.env:${NC}"
echo -e "${GREEN}  ✓ NODE_ENV=production${NC}"
echo -e "${GREEN}  ✓ PORT=3001${NC}"
echo -e "${GREEN}  ✓ SINGLE_CONTAINER=true${NC}"
if [ -n "$SUPABASE_URL" ]; then echo -e "${GREEN}  ✓ SUPABASE_URL${NC}"; fi
if [ -n "$SUPABASE_ANON" ]; then echo -e "${GREEN}  ✓ SUPABASE_ANON_KEY${NC}"; fi
if [ -n "$SUPABASE_SERVICE" ]; then echo -e "${GREEN}  ✓ SUPABASE_SERVICE_KEY${NC}"; fi
echo -e "${GREEN}  ✓ CORS_ORIGINS=${CORS_ORIGINS}${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "1. Update agent/background.js with:"
echo -e "   BACKEND_URL=${SERVICE_URL}"
echo ""
echo -e "2. Test your deployment:"
echo -e "   curl ${SERVICE_URL}/health"
echo ""
