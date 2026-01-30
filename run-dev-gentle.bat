@echo off
setlocal enabledelayedexpansion

echo KELEDON Gentle Development Startup
echo =================================

:: Check if we're in the right directory
if not exist "cloud\package.json" (
    echo ERROR: Please run this from the KELEDON root directory
    echo Expected to find cloud\package.json
    pause
    exit /b 1
)

echo.
echo Checking project structure...
if exist "cloud" echo    [OK] cloud/ - Backend (NestJS)
if exist "landing" echo    [OK] landing/ - Frontend (React)
if exist "agent" echo    [OK] agent/ - Chrome Extension

echo.
echo This script will start development servers without killing any existing processes.
echo.
echo Press Ctrl+C to cancel, or any key to continue...
pause >nul

echo.
echo Starting development services...

:: Start backend in new window
echo   Starting backend (NestJS) on port 3001...
start "KELEDON Backend" cmd /k "cd /d %CD% && echo Backend starting... && cd cloud && npm run start:dev"

:: Wait a moment
timeout /t 3 /nobreak >nul

:: Start frontend in new window
echo   Starting frontend (React) on port 5173...
start "KELEDON Frontend" cmd /k "cd /d %CD% && echo Frontend starting... && cd landing && npm run dev"

:: Wait for services to start
timeout /t 5 /nobreak >nul

:: Open browser to frontend
echo   Opening browser to http://localhost:5173
start http://localhost:5173

echo.
echo ==========================================
echo [OK] Development Environment Started!
echo ==========================================
echo.
echo Services running in separate windows:
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo.
echo To stop services:
echo   1. Close the service windows (Backend and Frontend)
echo   2. Or press Ctrl+C in each window
echo.
echo Chrome Extension:
echo   Load from: C:\KELEDON\agent\
echo   Go to chrome://extensions/ and Load unpacked
echo.
echo Press any key to exit this window (services continue)...
pause >nul