#!/bin/bash

# KELEDON URL RETRIEVAL SCRIPT
# Gets the actual deployment URLs for testing

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "🔗 KELEDON Service URL Retrieval"
echo "================================="

PROJECT_ID="keledon"
REGION="us-central1"
BACKEND_SERVICE="keledon-cloud"
FRONTEND_SERVICE="keledon-landing"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Backend Service: $BACKEND_SERVICE"
echo "Frontend Service: $FRONTEND_SERVICE"
echo ""

# Get Backend URL
echo -e "${BLUE}🔗 Getting Backend URL...${NC}"
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE \
    --region $REGION \
    --format 'value(status.url)' 2>/dev/null)

if [ $? -eq 0 ] && [ ! -z "$BACKEND_URL" ]; then
    echo -e "${GREEN}✅ Backend URL: $BACKEND_URL${NC}"
else
    echo -e "${YELLOW}⚠️ Backend service not found or not accessible${NC}"
fi

# Get Frontend URL  
echo -e "${BLUE}🔗 Getting Frontend URL...${NC}"
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE \
    --region $REGION \
    --format 'value(status.url)' 2>/dev/null)

if [ $? -eq 0 ] && [ ! -z "$FRONTEND_URL" ]; then
    echo -e "${GREEN}✅ Frontend URL: $FRONTEND_URL${NC}"
else
    echo -e "${YELLOW}⚠️ Frontend service not found or not accessible${NC}"
fi

echo ""
echo -e "${BLUE}🧪 Testing Health Endpoints...${NC}"

# Test Backend Health
if [ ! -z "$BACKEND_URL" ]; then
    echo -e "${BLUE}🏥 Testing Backend Health: $BACKEND_URL/health${NC}"
    HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BACKEND_URL/health" 2>/dev/null)
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
    BODY=$(echo "$HEALTH_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Backend Health: OK (200)${NC}"
        echo "Response: $BODY"
    else
        echo -e "${YELLOW}⚠️ Backend Health: HTTP $HTTP_CODE${NC}"
        echo "Response: $BODY"
    fi
fi

echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "===================="
if [ ! -z "$BACKEND_URL" ]; then
    echo "Backend: $BACKEND_URL"
    echo "Health:  $BACKEND_URL/health"
else
    echo "Backend: Not deployed or not accessible"
fi

if [ ! -z "$FRONTEND_URL" ]; then
    echo "Frontend: $FRONTEND_URL"
else
    echo "Frontend: Not deployed or not accessible"
fi

echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "============================="
if [ ! -z "$BACKEND_URL" ]; then
    echo "# Backend Health"
    echo "curl $BACKEND_URL/health"
    echo ""
    echo "# View Backend Logs"
    echo "gcloud run services logs read $BACKEND_SERVICE --region $REGION --limit 20"
fi

if [ ! -z "$FRONTEND_URL" ]; then
    echo ""
    echo "# View Frontend Logs"
    echo "gcloud run services logs read $FRONTEND_SERVICE --region $REGION --limit 20"
fi

echo ""
echo -e "${BLUE}🎯 Testing URLs:${NC}"
echo "==================="
if [ ! -z "$BACKEND_URL" ]; then
    echo "Backend API: $BACKEND_URL/api/providers"
    echo "Backend WS:  $BACKEND_URL"
fi

if [ ! -z "$FRONTEND_URL" ]; then
    echo "Frontend:    $FRONTEND_URL"
fi

echo ""
echo -e "${GREEN}🎉 KELEDON URL retrieval completed!${NC}"