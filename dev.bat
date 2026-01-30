@echo off
:: KELEDON Vector Store Development Scripts
:: Cross-platform development workflow management for Windows

setlocal enabledelayedexpansion

:: Colors for output (limited Windows support)
set "INFO=[INFO]"
set "SUCCESS=[SUCCESS]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"

:: Print status message
:print_status
set "level=%~1"
set "message=%~2"
echo %level% %date% %time% %message%
goto :eof

:: Check if we're in the right directory
:check_project_root
if not exist "package.json" (
    if not exist "landing" (
        if not exist "cloud" (
            call :print_status "ERROR" "Please run this script from the KELEDON project root"
            exit /b 1
        )
    )
)
goto :eof

:: Install dependencies
:install_deps
call :print_status "INFO" "Installing dependencies..."

if exist "landing" (
    call :print_status "INFO" "Installing frontend dependencies..."
    cd landing
    call npm install
    if %errorlevel% neq 0 (
        call :print_status "ERROR" "Failed to install frontend dependencies"
        exit /b 1
    )
    cd ..
)

if exist "cloud" (
    call :print_status "INFO" "Installing backend dependencies..."
    cd cloud
    call npm install
    if %errorlevel% neq 0 (
        call :print_status "ERROR" "Failed to install backend dependencies"
        exit /b 1
    )
    cd ..
)

call :print_status "SUCCESS" "Dependencies installed successfully!"
goto :eof

:: Setup Vector Store environment
:setup_vector_store
call :print_status "INFO" "Setting up Vector Store environment..."

:: Create environment files from templates
if exist ".env.local.template" (
    if not exist ".env.local" (
        copy ".env.local.template" ".env.local" >nul
        call :print_status "SUCCESS" "Created .env.local from template"
    )
)

if exist ".env.production.template" (
    if not exist ".env.production" (
        copy ".env.production.template" ".env.production" >nul
        call :print_status "SUCCESS" "Created .env.production from template"
    )
)

:: Create backup directory
if not exist "vs-backups" mkdir "vs-backups"

:: Setup Qdrant
if exist "landing\scripts\setup-qdrant.js" (
    cd landing
    call node scripts\setup-qdrant.js status >nul 2>&1
    if %errorlevel% neq 0 (
        call :print_status "INFO" "Starting Qdrant container..."
        call node scripts\setup-qdrant.js start
        if %errorlevel% neq 0 (
            call :print_status "ERROR" "Failed to start Qdrant"
            exit /b 1
        )
    )
    cd ..
)

call :print_status "SUCCESS" "Vector Store environment setup complete!"
goto :eof

:: Start development servers
:dev
call :print_status "INFO" "Starting KELEDON development environment..."

:: Check if Qdrant is running
if exist "landing\scripts\setup-qdrant.js" (
    cd landing
    call node scripts\setup-qdrant.js health >nul 2>&1
    if %errorlevel% neq 0 (
        call :print_status "WARNING" "Qdrant is not running, starting it..."
        call node scripts\setup-qdrant.js start
        timeout /t 5 /nobreak >nul
    )
    cd ..
)

:: Start frontend and backend concurrently
if exist "landing" (
    if exist "cloud" (
        call :print_status "INFO" "Starting frontend and backend concurrently..."
        :: Use PowerShell for concurrent execution if available
        powershell -Command "Start-Process cmd -ArgumentList '/c', 'cd cloud && npm run start:dev' -Wait -PassThru; Start-Process cmd -ArgumentList '/c', 'cd landing && npm run dev' -Wait -PassThru"
    ) else (
        call :print_status "INFO" "Starting frontend only..."
        cd landing
        call npm run dev
    )
) else if exist "cloud" (
    call :print_status "INFO" "Starting backend only..."
    cd cloud
    call npm run start:dev
) else (
    call :print_status "ERROR" "No frontend or backend directories found"
    exit /b 1
)
goto :eof

:: Build project
:build
call :print_status "INFO" "Building KELEDON project..."

if exist "landing" (
    call :print_status "INFO" "Building frontend..."
    cd landing
    call npm run build
    if %errorlevel% neq 0 (
        call :print_status "ERROR" "Frontend build failed"
        exit /b 1
    )
    cd ..
    call :print_status "SUCCESS" "Frontend build complete!"
)

if exist "cloud" (
    call :print_status "INFO" "Building backend..."
    cd cloud
    call npm run build
    if %errorlevel% neq 0 (
        call :print_status "ERROR" "Backend build failed"
        exit /b 1
    )
    cd ..
    call :print_status "SUCCESS" "Backend build complete!"
)

call :print_status "SUCCESS" "Project build complete!"
goto :eof

:: Run tests
:test
call :print_status "INFO" "Running tests..."

if exist "landing" (
    call :print_status "INFO" "Running frontend tests..."
    cd landing
    call npm test >nul 2>&1
    if %errorlevel% neq 0 (
        call :print_status "WARNING" "No frontend tests found"
    )
    cd ..
)

if exist "cloud" (
    call :print_status "INFO" "Running backend tests..."
    cd cloud
    call npm test
    if %errorlevel% neq 0 (
        call :print_status "ERROR" "Backend tests failed"
        exit /b 1
    )
    cd ..
)

call :print_status "SUCCESS" "Tests complete!"
goto :eof

:: Lint code
:lint
call :print_status "INFO" "Linting code..."

if exist "landing" (
    call :print_status "INFO" "Linting frontend..."
    cd landing
    call npm run lint
    if %errorlevel% neq 0 (
        call :print_status "ERROR" "Frontend linting failed"
        exit /b 1
    )
    cd ..
)

if exist "cloud" (
    call :print_status "INFO" "Linting backend..."
    cd cloud
    call npm run lint
    if %errorlevel% neq 0 (
        call :print_status "ERROR" "Backend linting failed"
        exit /b 1
    )
    cd ..
)

call :print_status "SUCCESS" "Linting complete!"
goto :eof

:: Clean build artifacts
:clean
call :print_status "INFO" "Cleaning build artifacts..."

if exist "landing" (
    cd landing
    if exist "dist" rmdir /s /q "dist"
    if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"
    cd ..
)

if exist "cloud" (
    cd cloud
    if exist "dist" rmdir /s /q "dist"
    cd ..
)

call :print_status "SUCCESS" "Clean complete!"
goto :eof

:: Vector Store specific commands
:qdrant
set "qdrant_cmd=%~2"
if "%qdrant_cmd%"=="" set "qdrant_cmd=status"

if exist "landing\scripts\setup-qdrant.js" (
    cd landing
    call node scripts\setup-qdrant.js %qdrant_cmd%
    cd ..
) else (
    call :print_status "ERROR" "Qdrant setup script not found"
    exit /b 1
)
goto :eof

:: Show help
:help
echo KELEDON Development Scripts
echo.
echo Usage: %~nx0 [COMMAND]
echo.
echo Commands:
echo   install          Install all dependencies
echo   setup            Setup Vector Store environment
echo   dev              Start development servers
echo   build            Build production bundles
echo   test             Run all tests
echo   lint             Lint all code
echo   clean            Clean build artifacts
echo   qdrant [cmd]     Manage Qdrant container (start^|stop^|status^|health^|logs)
echo   help             Show this help message
echo.
echo Examples:
echo   %~nx0 install       # Install dependencies
echo   %~nx0 setup         # Setup Vector Store
echo   %~nx0 dev           # Start development
echo   %~nx0 build         # Build for production
echo   %~nx0 qdrant start  # Start Qdrant only
goto :eof

:: Main script logic
:main
set "command=%~1"
if "%command%"=="" set "command=help"

call :check_project_root

if "%command%"=="install" (
    call :install_deps
) else if "%command%"=="setup" (
    call :setup_vector_store
) else if "%command%"=="dev" (
    call :dev
) else if "%command%"=="build" (
    call :build
) else if "%command%"=="test" (
    call :test
) else if "%command%"=="lint" (
    call :lint
) else if "%command%"=="clean" (
    call :clean
) else if "%command%"=="qdrant" (
    call :qdrant %*
) else if "%command%"=="help" (
    call :help
) else if "%command%"=="--help" (
    call :help
) else if "%command%"=="-h" (
    call :help
) else (
    call :print_status "ERROR" "Unknown command: %command%"
    call :help
    exit /b 1
)

goto :eof

:: Run main function with all arguments
call :main %*