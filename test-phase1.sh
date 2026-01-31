#!/bin/bash

echo "🧪 Testing KELEDON Backend - Phase 1"
echo "=================================="
echo

# Start backend in background
echo "🚀 Starting KELEDON backend..."
cd "C:\KELEDON\cloud"
npm run start &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Test health endpoint
echo ""
echo "🩺 Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
if [ $? -eq 0 ]; then
    echo "✅ Health endpoint responding:"
    echo "$HEALTH_RESPONSE" | jq . 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo "❌ Health endpoint not responding"
fi

# Test RAG endpoint
echo ""
echo "🧠 Testing RAG Endpoint..."
RAG_RESPONSE=$(curl -s -X POST http://localhost:3001/rag/retrieve \
  -H "Content-Type: application/json" \
  -d '{"query":"What is KELEDON?","sessionId":"test-session","companyId":"test-company"}')

if [ $? -eq 0 ]; then
    echo "✅ RAG endpoint responding:"
    echo "$RAG_RESPONSE" | jq . 2>/dev/null || echo "$RAG_RESPONSE"
else
    echo "❌ RAG endpoint not responding"
fi

# Test detailed health
echo ""
echo "📊 Testing Detailed Health..."
DETAILED_HEALTH=$(curl -s http://localhost:3001/health/detailed)
if [ $? -eq 0 ]; then
    echo "✅ Detailed health endpoint responding:"
    echo "$DETAILED_HEALTH" | jq . 2>/dev/null || echo "$DETAILED_HEALTH"
else
    echo "❌ Detailed health endpoint not responding"
fi

# Cleanup
echo ""
echo "🧹 Stopping backend..."
kill $BACKEND_PID 2>/dev/null
wait $BACKEND_PID 2>/dev/null

echo ""
echo "🎯 Phase 1 Testing Complete!"
echo "Open test harness: C:\KELEDON\agent\test-harness.html"
echo "Backend endpoints: http://localhost:3001"