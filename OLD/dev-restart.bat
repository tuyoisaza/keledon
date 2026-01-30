cd C:\Keldon

@echo off
echo [1/3] Killing zombie processes on ports 3001 (Cloud) and 5173 (Landing)...

:: Use PowerShell to find and kill processes listening on specific ports
powershell -Command "$PROCESSES = Get-NetTCPConnection -LocalPort 3001,5173,5174,5175 -ErrorAction SilentlyContinue; if ($PROCESSES) { $PROCESSES | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host 'Processes killed.' } else { Write-Host 'No processes found on target ports.' }"

echo [2/3] Starting Backend (Cloud)...
start "Keldon Backend" cmd /k "cd cloud && npm run start:dev"

echo [3/3] Starting Frontend (Landing)...
start "Keldon Frontend" cmd /k "cd landing && npm run dev"

echo.
echo Development environment is starting in separate windows.
echo You can close this window now.
call timeout /t 5
