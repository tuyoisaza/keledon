#!/bin/bash

# QUICK BACKEND DEPLOYMENT TEST
# Deploy basic backend to identify issues

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
WHITE='\033[1;37m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${WHITE}🔍 QUICK BACKEND TEST${NC}"
echo -e "${WHITE}====================${NC}"

cd ../cloud

# Create simple package.json for testing
cat > package-simple.json << 'EOF'
{
  "name": "keeldon-backend-simple",
  "version": "1.0.0",
  "main": "dist/src/main.js",
  "scripts": {
    "start": "node dist/src/main.js",
    "build": "nest build",
    "start:prod": "node dist/src/main"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/core": "^11.0.1",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/platform-socket.io": "^11.1.12",
    "@nestjs/websockets": "^11.1.12",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "socket.io": "^4.8.3"
  }
}
EOF

# Create simple Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy simple package first
COPY package-simple.json package.json
RUN npm install

# Copy and build source
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm install -g @nestjs/cli && npm run build

EXPOSE 8080

CMD ["npm", "run", "start:prod"]
EOF

echo -e "${BLUE}📦 Building container...${NC}"
gcloud builds submit --tag gcr.io/keledon/keeldon-test:latest

echo -e "${BLUE}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy keeldon-backend-test \
    --image gcr.io/keledon/keledon-test:latest \
    --region=us-central1 \
    --allow-unauthenticated \
    --memory=512Mi \
    --cpu=1 \
    --platform=managed \
    --set-env-vars="NODE_ENV=production"

echo -e "${GREEN}✅ Test deployment complete${NC}"

# Get URL and test
BACKEND_URL=$(gcloud run services describe keeldon-backend-test --region=us-central1 --format='value(status.url)')
echo -e "${BLUE}Testing: $BACKEND_URL${NC}"

sleep 10
if curl -s -f "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Test backend working!${NC}"
else
    echo -e "${RED}❌ Test backend failed${NC}"
fi

exit 0