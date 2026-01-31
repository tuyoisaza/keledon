@echo off
echo Starting KELEDON Backend - Phase 1 (Health + RAG Mock)
echo.

cd /d "C:\KELEDON\cloud"
start "KELEDON Backend" cmd /k "npm run start"

echo Backend starting...
echo Test Harness: C:\KELEDON\agent\test-harness.html
echo Health Endpoint: http://localhost:3001/health
echo RAG Endpoint: http://localhost:3001/rag/retrieve
echo.
echo Press any key to stop backend...
pause > nul

echo Stopping backend...
taskkill /f /im node.exe 2>nul
echo Backend stopped.
pause