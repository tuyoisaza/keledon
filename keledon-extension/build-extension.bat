@echo off
setlocal
title KELEDON Extension Build

echo ==================================
echo   KELEDON Extension Build Tool
echo ==================================
echo.

REM ---- Confirm start ----
set /p READY=Start build now? (Y/N): 
if /I not "%READY%"=="Y" (
  echo Build cancelled by user.
  goto END
)

echo.

REM ---- Hard paths (Windows-safe) ----
set NODE_EXE=C:\Program Files\nodejs\node.exe
set NPM_CMD=C:\Program Files\nodejs\npm.cmd

REM ---- Sanity check (minimal) ----
if not exist "%NODE_EXE%" (
  echo ERROR: Node.js not found at:
  echo %NODE_EXE%
  goto SUMMARY
)

if not exist "%NPM_CMD%" (
  echo ERROR: npm.cmd not found at:
  echo %NPM_CMD%
  goto SUMMARY
)

echo OK: Node and npm detected
echo.

REM ---- Install deps ----
if not exist node_modules (
  echo Installing dependencies...
  "%NPM_CMD%" install
  if errorlevel 1 (
    echo ERROR: npm install failed
    goto SUMMARY
  )
  echo OK: dependencies installed
) else (
  echo OK: dependencies already installed
)

echo.

REM ---- Build ----
echo Running build...
"%NPM_CMD%" run build
if errorlevel 1 (
  echo ERROR: build failed
  goto SUMMARY
)

echo OK: build succeeded
echo.

REM ---- Check dist ----
if not exist dist (
  echo ERROR: dist folder not found
  goto SUMMARY
)

echo OK: dist folder exists

REM ---- Check outputs ----
set MISSING=0
for %%F in (manifest.json content.js background.js popup.js popup.html) do (
  if not exist dist\%%F (
    echo ERROR: missing dist\%%F
    set MISSING=1
  )
)

if "%MISSING%"=="0" (
  echo OK: all output files present
)

REM ---- Summary ----
:SUMMARY
echo.
echo ==================================
echo Build finished.
echo ==================================
echo.

REM ---- Confirm close ----
set /p CLOSE=Close window? (Y/N): 
if /I "%CLOSE%"=="Y" goto END

pause

:END
endlocal
