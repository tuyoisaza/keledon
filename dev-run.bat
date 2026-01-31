@echo off
setlocal

echo "🚀 Starting KELEDON Development Environment..."

:: Set working directory
cd /d C:\KELEDON

:: Check if required directories exist
if not exist "cloud" (
    echo "❌ Error: cloud directory not found"
    pause
    exit /b 1
)


:: Start services in separate windows
echo "🌐 Starting backend (NestJS)..."
start "KELEDON Cloud Backend" cmd /k "cd /d C:\KELEDON\cloud && npm run start:dev"

echo "🎨 Starting frontend (React)..."
start "KELEDON Landing Frontend" cmd /k "cd /d C:\KELEDON\landing && npm run dev"

:: Wait a moment for services to start
timeout /t 5 /nobreak >nul

:: Open browser
echo "🌍 Opening browser..."
start http://localhost:5173

echo ""
echo "✅ KELEDON development environment started!"
echo "📍 Frontend: http://localhost:5173"
echo "📍 Backend:  http://localhost:3001"
echo "📍 API Docs: http://localhost:3001/api"
echo ""
echo "Press any key to close this window..."
pause >nul