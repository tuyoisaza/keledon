@echo off
setlocal enabledelayedexpansion

echo =============================================
echo KELEDON Full Development Environment
echo =============================================
echo.

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

echo [1/4] Starting Docker services (Qdrant, Redis)...
cd /d "%SCRIPT_DIR%"
docker compose -f docker-compose.dev.v2.yml up -d qdrant redis
echo [1/4] Docker services started!
echo.

echo [1b/4] Starting Observability (Jaeger, OTEL)...
docker compose -f docker-compose.observability.yml up -d
echo [1b/4] Observability started!
echo.

echo [2/4] Starting Cloud Backend (port 3001)...
start "KELEDON-CLOUD" cmd /k "cd /d "%SCRIPT_DIR%\cloud" && node canonical-dev-server.js"

echo [3/4] Waiting for backend to start...
timeout /t 8 /nobreak >nul
echo [3/4] Backend started!
echo.

echo [4/4] Starting Frontend (port 5173)...
start "KELEDON-FRONTEND" cmd /k "cd /d "%SCRIPT_DIR%\landing" && npm run dev"

echo.
echo =============================================
echo KELEDON Development Environment Ready!
echo =============================================
echo.
echo Services:
echo   - Database:       Railway PostgreSQL (Prisma)
echo   - Vector Store:   http://localhost:6333 (Qdrant Docker)
echo   - Cache:          http://localhost:6379 (Redis Docker)
echo   - Backend API:    http://localhost:3001
echo   - Frontend:       http://localhost:5173
echo   - Jaeger UI:      http://localhost:16686
echo   - OTEL Collector: http://localhost:4318
echo.
echo Extension built to: agent\dist\
echo.
echo Press any key to exit (services keep running)...
pause >nul
