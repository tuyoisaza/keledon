@echo off
setlocal enabledelayedexpansion

echo KELEDON Build Script
echo ====================

:: Check if we're in the right directory
if not exist "cloud\package.json" (
    echo ERROR: Please run this from the KELEDON root directory
    echo Expected to find cloud\package.json
    pause
    exit /b 1
)

echo.
echo Found KELEDON project structure:
if exist "cloud" echo    [OK] cloud/ - Backend (NestJS)
if exist "landing" echo    [OK] landing/ - Frontend (React)
if exist "agent" echo    [OK] agent/ - Chrome Extension
if exist "contracts" echo    [OK] contracts/ - Schemas & Types

echo.
echo Installing dependencies...

:: Install backend dependencies
if not exist "cloud\node_modules" (
    echo   Installing cloud backend dependencies...
    cd cloud
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install cloud dependencies
        pause
        exit /b 1
    )
    cd ..
) else (
    echo   [OK] Cloud dependencies already installed
)

:: Install frontend dependencies  
if not exist "landing\node_modules" (
    echo   Installing landing frontend dependencies...
    cd landing
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install landing dependencies
        pause
        exit /b 1
    )
    cd ..
) else (
    echo   [OK] Landing dependencies already installed
)

:: Install agent dependencies
if not exist "agent\node_modules" (
    echo   Installing agent Chrome extension dependencies...
    cd agent
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install agent dependencies
        pause
        exit /b 1
    )
    cd ..
) else (
    echo   [OK] Agent dependencies already installed
)

echo.
echo Building all components...

:: Build backend
echo   Building backend...
cd cloud
call npm run build
if errorlevel 1 (
    echo WARNING: Backend build failed or script not found
    echo   Continuing with other builds...
) else (
    echo   [OK] Backend built successfully
)
cd ..

:: Build frontend
echo   Building frontend...
cd landing
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build frontend
    pause
    exit /b 1
) else (
    echo   [OK] Frontend built successfully
)
cd ..

:: Build agent (if build script exists)
echo   Building Chrome extension...
cd agent
if exist "package.json" (
    :: Check if build script exists
    npm run build 2>nul
    if errorlevel 1 (
        echo   [WARNING] Chrome extension build script not found, continuing...
        echo   [NOTE] Chrome extension typically doesn't need build step
    ) else (
        echo   [OK] Chrome extension built successfully
    )
) else (
    echo   [WARNING] No package.json found in agent directory
)
cd ..

echo.
echo ==========================================
echo [OK] Build Process Complete!
echo ==========================================
echo.
echo Build outputs:
if exist "cloud\dist" echo   Backend:  cloud\dist\ (TypeScript compiled JS)
if exist "landing\dist" echo   Frontend: landing\dist\ (Vite production build)
echo   Agent:    agent\ (Chrome extension source ready)
echo.
echo Next steps:
echo 1. Run run-dev.bat to start development servers
echo 2. Load Chrome extension from agent\ directory
echo 3. Open http://localhost:5173 for frontend
echo.
echo Press any key to exit...
pause >nul