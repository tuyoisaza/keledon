@echo off
echo =============================================
echo KELEDON Test Server
echo =============================================
echo.
echo Starting HTTP server...
echo Then open: http://localhost:8080/test-keledon.html
echo.
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
python -m http.server 8080
