@echo off
echo 📋 KELEDON Log Utility
echo =====================
echo.

echo 📄 Options:
echo 1. Copy current logs to clipboard
echo 2. Open logs.md file
echo 3. View recent log entries
echo.

set /p choice=Select option (1-3): 

if "%choice%"=="1" goto copy_logs
if "%choice%"=="2" goto open_logs
if "%choice%"=="3" goto view_recent
goto end

:copy_logs
echo.
echo 📋 Copying logs to clipboard...
type "C:\KELEDON\agent\logs.md" | clip
echo ✅ Logs copied to clipboard!
echo.
echo You can now paste the logs anywhere.
goto end

:open_logs
echo.
echo 📄 Opening logs.md file...
start "" "C:\KELEDON\agent\logs.md"
echo ✅ Logs file opened!
goto end

:view_recent
echo.
echo 📊 Recent log entries:
echo.
type "C:\KELEDON\agent\logs.md" | findstr /C: "[" | more +3
echo.
echo End of recent entries.
goto end

:end
echo.
echo Press any key to exit...
pause > nul