@echo off
echo =============================================
echo KELEDON Test Server
echo =============================================
echo.

cd /d "%~dp0TESTs"
start "KELEDON-TEST-SERVER" cmd /k "python -m http.server 8080"
timeout /t 2 /nobreak >nul
start http://localhost:8080/test-keledon.html
echo.
echo Test page: http://localhost:8080/test-keledon.html
echo.
echo Press any key to exit (server keeps running)...
pause >nul
