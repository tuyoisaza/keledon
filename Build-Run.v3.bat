@echo off
setlocal enabledelayedexpansion

echo KELEDON C38 - Supabase Cloud DB Proof
echo =====================================

if not exist "cloud\package.json" (
  echo [C38][FAIL] Run this from KELEDON repo root (cloud\package.json not found)
  exit /b 1
)

if not exist "cloud\.env.cloud.local" (
  echo [C38][FAIL] cloud\.env.cloud.local not found
  echo [C38] Please create it with Supabase Cloud credentials
  exit /b 1
)

echo.
echo [C38] Starting observability stack (Jaeger)...
docker compose -f docker-compose.observability.yml up -d
if %errorlevel% neq 0 (
  echo [C38][FAIL] docker compose up failed for observability stack
  exit /b 1
)

set "JAEGER_RUNNING="
for /f "usebackq delims=" %%N in (`docker ps --format "{{.Names}}" ^| findstr /i /x "keledon-jaeger"`) do (
  set "JAEGER_RUNNING=1"
)

if not defined JAEGER_RUNNING (
  echo [C38][FAIL] Required container 'keledon-jaeger' is not running.
  echo [C38] Fix: docker compose -f docker-compose.observability.yml up -d
  exit /b 1
)

echo [C38] OK: keledon-jaeger is running.
echo [C38] Jaeger UI: http://localhost:16686

echo.
echo [C38] Running C12 proof gate with Supabase Cloud...
:: C38: Uses .env.cloud.local for Supabase connection (no local Postgres)
pushd cloud
if not exist "node_modules" (
  echo [C38] cloud\node_modules missing - installing dependencies...
  call npm install
  if %errorlevel% neq 0 (
    echo [C38][FAIL] npm install failed in cloud
    popd
    exit /b 1
  )
)
call npm run proof:c12:local
set "PROOF_EXIT=%errorlevel%"
popd

if not "%PROOF_EXIT%"=="0" (
  echo.
  echo [C38][FAIL] proof:c12:local failed with exit code %PROOF_EXIT%
  exit /b %PROOF_EXIT%
)

echo.
echo [C38][PASS] proof:c12:local succeeded using Supabase Cloud
exit /b 0

