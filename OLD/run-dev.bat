@echo off
setlocal

cd /d C:\Keldon

start /b cmd /c "cd /d C:\Keldon\launcher && npm run start"
start "Keledon Cloud" cmd /k "cd /d C:\Keldon\cloud && npm run start:dev"
start "Keledon Landing" cmd /k "cd /d C:\Keldon\landing && npm run dev"
timeout /t 3 /nobreak >nul
start "Keledon App" "http://localhost:5173"
