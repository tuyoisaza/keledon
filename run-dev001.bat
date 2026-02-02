@echo off
echo Starting KELEDON Development Environment
echo =====================================

:: Check if we're in right directory
if not exist "cloud\package.json" (
    echo ERROR: Please run this from KELEDON root directory
    echo cloud\package.json not found
    pause
    exit /b 1
)

echo.
echo Starting backend on port 3001...
cd cloud && npm run start:dev

echo.
echo Starting frontend on port 5173...
cd landing && npm run dev

echo.
echo Backend and Frontend started successfully!
echo =====================================
echo KELEDON Development Environment:
echo - Backend: http://localhost:3001
echo - Frontend: http://localhost:5173
echo - API Docs: http://localhost:3001/docs
echo =====================================
echo.
echo Services will continue running...
echo Press Ctrl+C to stop all services
echo.

:: Keep the script running
pause