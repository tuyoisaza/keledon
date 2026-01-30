@echo off
setlocal enabledelayedexpansion

echo KELEDON Clean Build Script
echo ==========================

:: Check if we're in the right directory
if not exist "cloud\package.json" (
    echo ERROR: Please run this from the KELEDON root directory
    echo Expected to find cloud\package.json
    pause
    exit /b 1
)

echo.
echo WARNING: This will delete all node_modules and build artifacts!
echo Press Ctrl+C to cancel, or any key to continue...
pause >nul

echo.
echo Cleaning up...

:: Clean backend
echo   Cleaning backend...
if exist "cloud\node_modules" rmdir /s /q "cloud\node_modules" >nul 2>&1
if exist "cloud\dist" rmdir /s /q "cloud\dist" >nul 2>&1
if exist "cloud\.nuxt" rmdir /s /q "cloud\.nuxt" >nul 2>&1

:: Clean frontend
echo   Cleaning frontend...
if exist "landing\node_modules" rmdir /s /q "landing\node_modules" >nul 2>&1
if exist "landing\dist" rmdir /s /q "landing\dist" >nul 2>&1
if exist "landing\.vite" rmdir /s /q "landing\.vite" >nul 2>&1

:: Clean agent
echo   Cleaning agent...
if exist "agent\node_modules" rmdir /s /q "agent\node_modules" >nul 2>&1
if exist "agent\dist" rmdir /s /q "agent\dist" >nul 2>&1

echo   [OK] Cleanup complete

echo.
echo Running fresh build...

:: Install and build backend
echo   Installing and building backend...
cd cloud
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies
    cd ..
    pause
    exit /b 1
)
call npm run build
if errorlevel 1 (
    echo WARNING: Backend build failed or script not found
    echo   Continuing...
)
cd ..

:: Install and build frontend
echo   Installing and building frontend...
cd landing
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build frontend
    cd ..
    pause
    exit /b 1
)
cd ..

:: Install agent
echo   Installing agent...
cd agent
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install agent dependencies
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ==========================================
echo [OK] Clean Build Complete!
echo ==========================================
echo.
echo All components installed and built successfully!
echo Run run-dev.bat to start development servers.
echo.
echo Press any key to exit...
pause >nul