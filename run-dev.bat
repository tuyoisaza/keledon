@echo off
echo Starting KELEDON Development Environment
echo =====================================

:: Check if we're in right directory
if not exist "cloud\package.json" (
    echo ERROR: Please run this from KELEDON root directory
    pause
    exit /b 1
)

:: Start backend
echo Starting backend on port 3001...
start "KELEDON Backend" cmd /k "cd cloud && npm run start:dev"

:: Start frontend
echo Starting frontend on port 5173...
start "KELEDON Frontend" cmd /k "cd landing && npm run dev"

:: Wait and open browser
timeout /t 3 /nobreak >nul
echo Opening browser to http://localhost:5173
start http://localhost:5173

echo.
echo Services started! Backend: http://localhost:3001 | Frontend: http://localhost:5173
echo.
echo Login Options:
echo   - Google Auth (requires Supabase config)
echo   - Email/Password (requires Supabase config)  
echo   - Super Admin: superadmin@keledon.com / 123123
echo   - No Login: "Start Using KELEDON Now" button
echo   - Register: Create Admin account with company+brand
echo.
echo Press any key to exit (services will continue running)...
pause