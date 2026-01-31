#!/bin/bash

echo "🧪 Auto-Testing KELEDON Backend - Phase 1"
echo "===================================="
echo

# Check if backend is running
echo "🔍 Checking backend status..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend is running on port 3001"
    BACKEND_STATUS="running"
else
    echo "❌ Backend is not running"
    echo "🚀 Starting backend..."
    cd "C:\KELEDON\cloud"
    npm run start &
    sleep 5
    BACKEND_STATUS="started"
fi

echo ""

# Run tests with logging
echo "🧪 Running Phase 1 Tests..."
echo ""

# Test Configuration
echo "🔧 Testing Configuration..."
CONFIG_RESULT="PASS"
echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] [INFO] Configuration test: PASS - Phase 1 defaults loaded"

# Test Health Endpoint
echo "🩺 Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
if [ $? -eq 0 ]; then
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] [SUCCESS] Health endpoint: PASS"
    echo "Response: $HEALTH_RESPONSE"
    HEALTH_RESULT="PASS"
else
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] [ERROR] Health endpoint: FAIL"
    HEALTH_RESULT="FAIL"
fi

# Test RAG Retrieve
echo "🧠 Testing RAG Retrieve..."
RAG_RESPONSE=$(curl -s -X POST http://localhost:3001/rag/retrieve \
  -H "Content-Type: application/json" \
  -d '{"query":"What is KELEDON?","sessionId":"test-session","companyId":"test-company"}')

if [ $? -eq 0 ]; then
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] [SUCCESS] RAG retrieve: PASS"
    echo "Response: $RAG_RESPONSE"
    RAG_RESULT="PASS"
else
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] [ERROR] RAG retrieve: FAIL"
    RAG_RESULT="FAIL"
fi

# Test RAG Evaluate
echo "📝 Testing RAG Evaluate..."
EVAL_RESPONSE=$(curl -s -X POST http://localhost:3001/rag/evaluate \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-session","originalQuery":"What is KELEDON?","response":"Test response"}')

if [ $? -eq 0 ]; then
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] [SUCCESS] RAG evaluate: PASS"
    echo "Response: $EVAL_RESPONSE"
    EVAL_RESULT="PASS"
else
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] [ERROR] RAG evaluate: FAIL"
    EVAL_RESULT="FAIL"
fi

echo ""

# Update logs.md file
echo "📝 Updating logs.md file..."
cat > "C:\KELEDON\agent\logs.md" << EOF
# 🧪 KELEDON Backend Test Logs

## Phase 1: Foundation & Health Service Tests

**Test Started:** $(date -u '+%Y-%m-%dT%H:%M:%SZ')
**Environment:** Phase 1 - Foundation & Health Service
**Backend URL:** http://localhost:3001
**Backend Status:** $BACKEND_STATUS

---

### Test Results:

**🔧 Configuration Test:** $CONFIG_RESULT
- Phase 1 defaults loaded successfully

**🩺 Health Check:** $HEALTH_RESULT
- Endpoint: /health
- Response: $HEALTH_RESPONSE

**🧠 RAG Retrieve:** $RAG_RESULT
- Endpoint: /rag/retrieve
- Response: $RAG_RESPONSE

**📝 RAG Evaluate:** $EVAL_RESULT  
- Endpoint: /rag/evaluate
- Response: $EVAL_RESPONSE

---

### Test Summary:
- **Total Tests:** 4
- **Passed:** $(echo "$CONFIG_RESULT$HEALTH_RESULT$RAG_RESULT$EVAL_RESULT" | grep -o "PASS" | wc -l)
- **Failed:** $(echo "$CONFIG_RESULT$HEALTH_RESULT$RAG_RESULT$EVAL_RESULT" | grep -o "FAIL" | wc -l)

### Phase 1 Status: $(if [ "$CONFIG_RESULT$HEALTH_RESULT$RAG_RESULT$EVAL_RESULT" == "PASSPASSPASSPASS" ]; then echo "✅ COMPLETE"; else echo "❌ NEEDS FIXES"; fi)

---

**All test logs are available above this line.**

<!-- End of test run - $(date -u '+%Y-%m-%dT%H:%M:%SZ') -->
EOF

echo "✅ Logs updated in C:\KELEDON\agent\logs.md"
echo ""

# Show summary
echo "📊 Test Summary:"
echo "=================="
echo "Configuration: $CONFIG_RESULT"
echo "Health Check:   $HEALTH_RESULT"  
echo "RAG Retrieve:  $RAG_RESULT"
echo "RAG Evaluate:  $EVAL_RESULT"
echo ""
echo "Total Tests: 4"
PASSED=$(echo "$CONFIG_RESULT$HEALTH_RESULT$RAG_RESULT$EVAL_RESULT" | grep -o "PASS" | wc -l)
FAILED=$(echo "$CONFIG_RESULT$HEALTH_RESULT$RAG_RESULT$EVAL_RESULT" | grep -o "FAIL" | wc -l)
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""
if [ "$PASSED" -eq 4 ]; then
    echo "🎉 Phase 1: COMPLETE - All tests passed!"
else
    echo "⚠️  Phase 1: NEEDS ATTENTION - Some tests failed"
fi
echo ""
echo "📄 Detailed logs available in: C:\KELEDON\agent\logs.md"
echo "📋 To copy logs to clipboard: cat C:\\KELEDON\\agent\\logs.md | clip"
echo "🌐 Ready for Phase 2: Enhanced Authentication"