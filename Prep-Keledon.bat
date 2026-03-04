@echo off
setlocal enabledelayedexpansion

echo =============================================
echo KELEDON Docker Preparation
echo =============================================
echo.
echo This will:
echo   1. Pull all Docker images
echo   2. Recreate all Docker volumes
echo.

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

echo [1/2] Pulling Docker images...
cd /d "%SCRIPT_DIR%"
docker compose -f docker-compose.dev.v2.yml pull
docker compose -f docker-compose.observability.yml pull
echo.
echo [1/2] Done pulling images!
echo.

echo [2/2] Recreating Docker volumes...
docker compose -f docker-compose.dev.v2.yml down -v --remove-orphans
docker compose -f docker-compose.observability.yml down --remove-orphans
echo.
echo [2/2] Volumes removed!
echo.

echo =============================================
echo KELEDON Docker Preparation Complete!
echo =============================================
echo.
echo Next step: Run start-keledon.bat
echo.
pause
