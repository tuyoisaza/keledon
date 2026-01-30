@echo off

echo KELEDON Port Checker
echo ===================

echo Checking if required ports are available...

:: Check port 3001
echo.
echo Checking port 3001 (Backend):
netstat -ano | findstr :3001 >nul 2>&1
if errorlevel 1 (
    echo   [OK] Port 3001 is available
) else (
    echo   [BUSY] Port 3001 is in use:
    netstat -ano | findstr :3001
)

:: Check port 5173
echo.
echo Checking port 5173 (Frontend):
netstat -ano | findstr :5173 >nul 2>&1
if errorlevel 1 (
    echo   [OK] Port 5173 is available
) else (
    echo   [BUSY] Port 5173 is in use:
    netstat -ano | findstr :5173
)

echo.
echo If ports are busy, you can:
echo 1. Close the windows using those ports manually
echo 2. Use Task Manager to end the node.exe processes
echo 3. Or run run-dev-force.bat to force cleanup (NOT RECOMMENDED)

echo.
echo Press any key to exit...
pause >nul