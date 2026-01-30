@echo off
echo ========================================
echo KELEDON URL RETRIEVAL SCRIPT
echo ========================================
echo.

set PROJECT_ID=keledon
set REGION=us-central1
set BACKEND_SERVICE=keledon-cloud
set FRONTEND_SERVICE=keledon-landing

echo Project: %PROJECT_ID%
echo Region: %REGION%
echo Backend Service: %BACKEND_SERVICE%
echo Frontend Service: %FRONTEND_SERVICE%
echo.

echo Getting Backend URL...
for /f "tokens=*" %%i in ('gcloud run services describe %BACKEND_SERVICE% --region %REGION% --format "value(status.url)" 2^>nul') do set BACKEND_URL=%%i

if defined BACKEND_URL (
    echo ✅ Backend URL: %BACKEND_URL%
) else (
    echo ❌ Backend service not found
)

echo.
echo Getting Frontend URL...
for /f "tokens=*" %%i in ('gcloud run services describe %FRONTEND_SERVICE% --region %REGION% --format "value(status.url)" 2^>nul') do set FRONTEND_URL=%%i

if defined FRONTEND_URL (
    echo ✅ Frontend URL: %FRONTEND_URL%
) else (
    echo ❌ Frontend service not found
)

echo.
echo ========================================
echo TESTING URLS
echo ========================================

if defined BACKEND_URL (
    echo Testing Backend Health: %BACKEND_URL%/health
    curl -s "%BACKEND_URL%/health" && echo ✅ Backend OK || echo ❌ Backend Failed
    echo.
)

echo ========================================
echo RESULTS
echo ========================================
if defined BACKEND_URL (
    echo Backend:  %BACKEND_URL%
    echo Health:   %BACKEND_URL%/health
    echo API:      %BACKEND_URL%/api/providers
) else (
    echo Backend:  Not deployed or not accessible
)

if defined FRONTEND_URL (
    echo Frontend: %FRONTEND_URL%
) else (
    echo Frontend: Not deployed or not accessible
)

echo.
echo ========================================
echo MANAGEMENT COMMANDS
echo ========================================
if defined BACKEND_URL (
    echo # Test Backend Health
    echo curl %BACKEND_URL%/health
    echo.
    echo # View Backend Logs
    echo gcloud run services logs read %BACKEND_SERVICE% --region %REGION% --limit 20
    echo.
)

if defined FRONTEND_URL (
    echo # View Frontend Logs
    echo gcloud run services logs read %FRONTEND_SERVICE% --region %REGION% --limit 20
)

echo.
echo Press any key to exit...
pause >nul