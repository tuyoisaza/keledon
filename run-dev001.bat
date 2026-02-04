@echo off
echo Starting KELEDON Development Environment
echo =====================================

if not exist "cloud\package.json" (
  echo ERROR: Run this from KELEDON root directory
  pause
  exit /b 1
)

start "KELEDON-CLOUD" cmd /k "cd cloud && npm install && npm run start:dev"
start "KELEDON-LANDING" cmd /k "cd landing && npm install && npm run dev"

echo.
echo Services running:
echo - Cloud: http://localhost:3001
echo - Frontend: http://localhost:5173
echo.
pause