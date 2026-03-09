#!/bin/bash

# KELEDON Full Development Environment
# Builds extension and starts all services

set -e

echo "========================================="
echo "KELEDON Full Development Environment"
echo "========================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -d "agent" ] || [ ! -d "cloud" ]; then
    echo "Error: Please run from KELEDON root directory"
    exit 1
fi

echo -e "${BLUE}[1/4] Building Chrome Extension...${NC}"
cd agent
npm run build
cd ..
echo -e "${GREEN}[1/4] Extension built successfully!${NC}"

echo ""
echo -e "${BLUE}[2/4] Checking Docker services...${NC}"
if command -v docker &> /dev/null; then
    docker compose -f docker-compose.observability.yml up -d 2>/dev/null || true
    docker compose -f docker-compose.yml up -d 2>/dev/null || true
    echo "Docker services started"
else
    echo -e "${YELLOW}Docker not found, skipping...${NC}"
fi

echo ""
echo -e "${BLUE}[3/4] Starting Cloud Backend (port 3001)...${NC}"
cd cloud
npm run start:dev &
CLOUD_PID=$!
cd ..

echo ""
echo -e "${BLUE}[4/4] Starting Frontend (port 5173)...${NC}"
if [ -d "landing" ]; then
    cd landing
    npm run dev &
    LANDING_PID=$!
    cd ..
fi

echo ""
echo "========================================="
echo -e "${GREEN}KELEDON Development Environment Ready!"
echo "========================================="
echo ""
echo "Services:"
echo "  - Chrome Extension: Load from agent/dist/"
echo "  - Backend API:      http://localhost:3001"
echo "  - Frontend:         http://localhost:5173"
echo "  - API Docs:         http://localhost:3001/docs"
echo "  - Jaeger:           http://localhost:16686"
echo ""
echo "Extension is built at: agent/dist/"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping services...'; kill $CLOUD_PID $LANDING_PID 2>/dev/null; exit 0" SIGINT
wait
