@echo off
:: Qdrant Setup Script for Windows
:: This script sets up a local Qdrant instance using Docker for KELEDON development

setlocal enabledelayedexpansion

:: Default values
set "CONTAINER_NAME=keledon-qdrant"
set "PORT=6333"
set "DATA_DIR=.\qdrant-data"
set "IMAGE=qdrant/qdrant:latest"

:: Colors for output (Windows ANSI support)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:: Help function
:print_help
echo KELEDON Qdrant Setup Script
echo.
echo Usage: %~nx0 [COMMAND] [OPTIONS]
echo.
echo Commands:
echo   start       Start Qdrant container
echo   stop        Stop Qdrant container
echo   restart     Restart Qdrant container
echo   status      Show container status
echo   logs        Show container logs
echo   health      Check Qdrant health
echo   cleanup     Remove container and data
echo   help        Show this help message
echo.
echo Options:
echo   -n, --name      Container name (default: %CONTAINER_NAME%)
echo   -p, --port      Port to expose (default: %PORT%)
echo   -d, --data      Data directory (default: %DATA_DIR%)
echo   -i, --image     Docker image (default: %IMAGE%)
echo.
echo Examples:
echo   %~nx0 start                           # Start with defaults
echo   %~nx0 start -p 7333                   # Start on port 7333
echo   %~nx0 start -d C:\opt\qdrant-data     # Use custom data directory
echo   %~nx0 logs                            # View logs
echo   %~nx0 health                          # Check health
goto :eof

:: Print colored output
:print_status
set "color=%~1"
set "message=%~2"
echo %color%[%date% %time%] %message%%NC%
goto :eof

:: Check if Docker is installed
:check_docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    call :print_status "%RED%" "Docker is not installed or not in PATH"
    echo Please install Docker Desktop first: https://www.docker.com/products/docker-desktop
    exit /b 1
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    call :print_status "%RED%" "Docker daemon is not running"
    echo Please start Docker Desktop first
    exit /b 1
)
goto :eof

:: Create data directory if it doesn't exist
:create_data_dir
if not exist "%DATA_DIR%" (
    call :print_status "%YELLOW%" "Creating data directory: %DATA_DIR%"
    mkdir "%DATA_DIR%"
)
goto :eof

:: Start Qdrant container
:start_qdrant
call :print_status "%BLUE%" "Starting Qdrant container..."

:: Check if container already exists
docker ps -a --format "table {{.Names}}" | findstr /C:"%CONTAINER_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    call :print_status "%YELLOW%" "Container '%CONTAINER_NAME%' already exists"
    
    :: Check if it's running
    docker ps --format "table {{.Names}}" | findstr /C:"%CONTAINER_NAME%" >nul 2>&1
    if %errorlevel% equ 0 (
        call :print_status "%GREEN%" "Container is already running"
        call :show_status
        goto :eof
    ) else (
        call :print_status "%BLUE%" "Starting existing container..."
        docker start "%CONTAINER_NAME%"
    )
) else (
    call :print_status "%BLUE%" "Creating new container..."
    :: Convert relative paths to absolute paths for Docker volume mounting
    for %%i in ("%DATA_DIR%") do set "ABS_DATA_DIR=%%~fi"
    docker run -d ^
        --name "%CONTAINER_NAME%" ^
        -p "%PORT%:6333" ^
        -p "%PORT%:6334" ^
        -v "%ABS_DATA_DIR%:/qdrant/storage" ^
        -e QDRANT__SERVICE__HTTP_PORT=6333 ^
        -e QDRANT__SERVICE__GRPC_PORT=6334 ^
        "%IMAGE%"
)

:: Wait for container to be ready
call :print_status "%BLUE%" "Waiting for Qdrant to be ready..."
timeout /t 5 /nobreak >nul

:: Check health
call :health_check_internal
if %errorlevel% equ 0 (
    call :print_status "%GREEN%" "Qdrant started successfully!"
    call :print_status "%BLUE%" "Web UI: http://localhost:%PORT%"
    call :print_status "%BLUE%" "API Endpoint: http://localhost:%PORT%"
    call :show_status
) else (
    call :print_status "%RED%" "Failed to start Qdrant or health check failed"
    call :print_status "%YELLOW%" "Check logs with: %~nx0 logs"
    exit /b 1
)
goto :eof

:: Stop Qdrant container
:stop_qdrant
call :print_status "%BLUE%" "Stopping Qdrant container..."

docker ps --format "table {{.Names}}" | findstr /C:"%CONTAINER_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    docker stop "%CONTAINER_NAME%"
    call :print_status "%GREEN%" "Container stopped"
) else (
    call :print_status "%YELLOW%" "Container is not running"
)
goto :eof

:: Restart Qdrant container
:restart_qdrant
call :stop_qdrant
timeout /t 2 /nobreak >nul
call :start_qdrant
goto :eof

:: Show container status
:show_status
docker ps --format "table {{.Names}}" | findstr /C:"%CONTAINER_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    call :print_status "%GREEN%" "Container Status: Running"
    
    :: Get container info
    for /f "tokens=*" %%i in ('docker inspect "%CONTAINER_NAME%" --format "{{.Status}}"') do set "container_info=%%i"
    for /f "tokens=*" %%i in ('docker port "%CONTAINER_NAME%"') do set "port_mapping=%%i"
    
    echo Container Info: !container_info!
    echo Port Mappings: !port_mapping!
    
    :: Try to get version info
    curl -s "http://localhost:%PORT%/health" >nul 2>&1
    if %errorlevel% equ 0 (
        call :print_status "%GREEN%" "API Health: Healthy"
    ) else (
        call :print_status "%YELLOW%" "API Health: Unknown (may still be starting)"
    )
) else (
    docker ps -a --format "table {{.Names}}" | findstr /C:"%CONTAINER_NAME%" >nul 2>&1
    if %errorlevel% equ 0 (
        call :print_status "%YELLOW%" "Container Status: Stopped"
    ) else (
        call :print_status "%RED%" "Container Status: Not found"
    )
)
goto :eof

:: Show logs
:show_logs
docker ps -a --format "table {{.Names}}" | findstr /C:"%CONTAINER_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    docker logs -f "%CONTAINER_NAME%"
) else (
    call :print_status "%RED%" "Container '%CONTAINER_NAME%' not found"
    exit /b 1
)
goto :eof

:: Internal health check (returns errorlevel)
:health_check_internal
setlocal
set /a "max_attempts=30"
set /a "attempt=1"

:health_check_loop
curl -s "http://localhost:%PORT%/health" >nul 2>&1
if %errorlevel% equ 0 (
    exit /b 0
)

timeout /t 2 /nobreak >nul
set /a "attempt+=1"
if !attempt! leq %max_attempts% goto health_check_loop

exit /b 1

:: Health check with user-friendly output
:health_check
call :print_status "%BLUE%" "Checking Qdrant health at http://localhost:%PORT%"

:: Check if curl is available
curl --version >nul 2>&1
if %errorlevel% neq 0 (
    call :print_status "%RED%" "curl is not available. Please install curl or use PowerShell: (Invoke-WebRequest -Uri 'http://localhost:%PORT%/health').StatusCode"
    exit /b 1
)

call :health_check_internal
if %errorlevel% equ 0 (
    call :print_status "%GREEN%" "Qdrant is healthy!"
    :: Try to get version info
    for /f "tokens=2 delims=:" %%i in ('curl -s "http://localhost:%PORT%/health" ^| findstr "version" 2^>nul') do (
        set "version=%%i"
        set "version=!version:~1,-1!"  :: Remove quotes
    )
    if defined version (
        echo Version: !version!
    ) else (
        echo Version: Unknown
    )
) else (
    call :print_status "%RED%" "Qdrant health check failed!"
    exit /b 1
)
goto :eof

:: Cleanup function
:cleanup_qdrant
call :print_status "%YELLOW%" "Cleaning up Qdrant container and data..."

:: Stop and remove container
docker ps -a --format "table {{.Names}}" | findstr /C:"%CONTAINER_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    docker stop "%CONTAINER_NAME%" >nul 2>&1
    docker rm "%CONTAINER_NAME%"
    call :print_status "%GREEN%" "Container removed"
)

:: Ask about data directory
set /p "remove_data=Remove data directory '%DATA_DIR%'? (y/N): "
if /i "!remove_data!"=="y" (
    if exist "%DATA_DIR%" (
        rmdir /s /q "%DATA_DIR%"
        call :print_status "%GREEN%" "Data directory removed"
    )
)

call :print_status "%GREEN%" "Cleanup completed"
goto :eof

:: Parse command line arguments
:parse_args
:parse_args_loop
if "%~1"=="" goto :eof

if "%~1"=="-n" (
    set "CONTAINER_NAME=%~2"
    shift
    shift
    goto parse_args_loop
)
if "%~1"=="--name" (
    set "CONTAINER_NAME=%~2"
    shift
    shift
    goto parse_args_loop
)
if "%~1"=="-p" (
    set "PORT=%~2"
    shift
    shift
    goto parse_args_loop
)
if "%~1"=="--port" (
    set "PORT=%~2"
    shift
    shift
    goto parse_args_loop
)
if "%~1"=="-d" (
    set "DATA_DIR=%~2"
    shift
    shift
    goto parse_args_loop
)
if "%~1"=="--data" (
    set "DATA_DIR=%~2"
    shift
    shift
    goto parse_args_loop
)
if "%~1"=="-i" (
    set "IMAGE=%~2"
    shift
    shift
    goto parse_args_loop
)
if "%~1"=="--image" (
    set "IMAGE=%~2"
    shift
    shift
    goto parse_args_loop
)
if "%~1"=="-h" (
    call :print_help
    exit /b 0
)
if "%~1"=="--help" (
    call :print_help
    exit /b 0
)

shift
goto parse_args_loop

:: Main script logic
:main
:: Parse command line arguments first
call :parse_args %*

:: Get command (first non-option argument)
set "command=%~1"
if "%command%"=="" set "command=help"

:: Validate command
if not "%command%"=="start" if not "%command%"=="stop" if not "%command%"=="restart" if not "%command%"=="status" if not "%command%"=="logs" if not "%command%"=="health" if not "%command%"=="cleanup" if not "%command%"=="help" (
    call :print_status "%RED%" "Unknown command: %command%"
    call :print_help
    exit /b 1
)

:: Check Docker availability (except for help and cleanup)
if not "%command%"=="help" if not "%command%"=="cleanup" (
    call :check_docker
)

:: Create data directory for start command
if "%command%"=="start" (
    call :create_data_dir
)

:: Execute command
if "%command%"=="start" (
    call :start_qdrant
) else if "%command%"=="stop" (
    call :stop_qdrant
) else if "%command%"=="restart" (
    call :restart_qdrant
) else if "%command%"=="status" (
    call :show_status
) else if "%command%"=="logs" (
    call :show_logs
) else if "%command%"=="health" (
    call :health_check
) else if "%command%"=="cleanup" (
    call :cleanup_qdrant
) else if "%command%"=="help" (
    call :print_help
)

goto :eof

:: Run main function with all arguments
call :main %*