@echo off
echo 🧪 Testing KELEDON Backend - Phase 1
echo ==================================
echo.

echo 🚀 Starting KELEDON backend...
cd /d "C:\KELEDON\cloud"
start "KELEDON Backend" /min cmd /c "npm run start"

echo ⏳ Waiting for backend to start...
timeout /t 8 /nobreak >nul

echo.
echo 🩺 Testing Health Endpoint...
curl -s http://localhost:3001/health
echo.

echo 🧠 Testing RAG Endpoint...
curl -s -X POST http://localhost:3001/rag/retrieve ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"What is KELEDON?\",\"sessionId\":\"test-session\",\"companyId\":\"test-company\"}"
echo.

echo 📊 Testing Detailed Health...
curl -s http://localhost:3001/health/detailed
echo.

echo.
echo 🎯 Phase 1 Testing Complete!
echo.
echo 🌐 Open test harness: C:\KELEDON\agent\test-harness.html
echo 🔗 Backend endpoints: http://localhost:3001
echo.
echo Press any key to stop backend and open test harness...
pause >nul

echo 🌐 Opening test harness...
start "" "C:\KELEDON\agent\test-harness.html"

echo 🧹 Stopping backend...
taskkill /f /im node.exe 2>nul

echo ✅ Testing complete!
pause