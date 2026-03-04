@echo off
echo =============================================
echo KELEDON Full Development Environment
echo =============================================
echo.

echo [1/4] Building Chrome Extension...
cd agent
call npm run build
cd ..
echo [1/4] Extension built successfully!
echo.

echo [2/4] Checking Docker services...
docker compose -f docker-compose.observability.yml up -d 2>nul
docker compose -f docker-compose.yml up -d 2>nul
echo [2/4] Docker services started
echo.

echo [3/4] Starting Cloud Backend (port 3001)...
start "KELEDON-CLOUD" cmd /k "cd cloud && npm run start:dev"

echo.
echo [4/4] Starting Frontend (port 5173)...
if exist "landing" (
    start "KELEDON-LANDING" cmd /k "cd landing && npm run dev"
)

echo.
echo =============================================
echo KELEDON Development Environment Ready!
echo =============================================
echo.
echo Services:
echo   - Chrome Extension: Load from agent\dist\
echo   - Backend API:      http://localhost:3001
echo   - Frontend:         http://localhost:5173
echo   - API Docs:         http://localhost:3001/docs
echo   - Jaeger:           http://localhost:16686
echo.
echo Extension built to: agent\dist\
echo.
echo Press any key to exit (services keep running)...
pause >nul
