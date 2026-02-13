@echo off
setlocal enabledelayedexpansion

echo KELEDON C35 - Jaeger Runtime Proof Fix
echo =====================================

if not exist "cloud\package.json" (
  echo [C35][FAIL] Run this from KELEDON repo root (cloud\package.json not found)
  exit /b 1
)

echo.
echo [C35] Starting observability stack (Jaeger)...
docker compose -f docker-compose.observability.yml up -d
if %errorlevel% neq 0 (
  echo [C35][FAIL] docker compose up failed for observability stack
  exit /b 1
)

set "JAEGER_RUNNING="
for /f "usebackq delims=" %%N in (`docker ps --format "{{.Names}}" ^| findstr /i /x "keledon-jaeger"`) do (
  set "JAEGER_RUNNING=1"
)

if not defined JAEGER_RUNNING (
  echo [C35][FAIL] Required container 'keledon-jaeger' is not running.
  echo [C35] Fix: docker compose -f docker-compose.observability.yml up -d
  exit /b 1
)

echo [C35] OK: keledon-jaeger is running.
echo [C35] Jaeger UI: http://localhost:16686

echo.
echo [C35] Running C12 proof gate...
:: C12 proof expects local containers (keledon-postgres, keledon-qdrant-dev) and a Jaeger UI at localhost.
:: Cloud DB wiring must point to the local proof Postgres container (not local Supabase CLI port 54322).
set "SUPABASE_HOST=localhost"
set "SUPABASE_PORT=5432"
set "SUPABASE_USER=postgres"
set "SUPABASE_PASSWORD=postgres"
set "SUPABASE_DB=postgres"
pushd cloud
if not exist "node_modules" (
  echo [C35] cloud\node_modules missing - installing dependencies...
  call npm install
  if %errorlevel% neq 0 (
    echo [C35][FAIL] npm install failed in cloud
    popd
    exit /b 1
  )
)
call npm run proof:c12:local
set "PROOF_EXIT=%errorlevel%"
popd

if not "%PROOF_EXIT%"=="0" (
  echo.
  echo [C35][FAIL] proof:c12:local failed with exit code %PROOF_EXIT%
  exit /b %PROOF_EXIT%
)

echo.
echo [C35][PASS] proof:c12:local succeeded
exit /b 0

