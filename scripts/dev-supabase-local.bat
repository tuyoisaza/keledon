@echo off
setlocal

echo [dev-supabase-local] DEPRECATED. Use scripts\dev-supabase-cli-local.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev-supabase-cli-local.ps1"
if errorlevel 1 exit /b 1

endlocal
