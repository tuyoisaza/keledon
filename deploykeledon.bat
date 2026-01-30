@echo off
setlocal enabledelayedexpansion

echo "🚀 KELEDON Cloud Run Deployment Script"
echo "======================================="
echo.

REM Check prerequisites
echo "🔍 Checking prerequisites..."

REM Check for Docker
docker --version >nul 2>&1
if !errorlevel! neq 0 (
    echo "❌ Docker not found. Please install Docker Desktop and run as administrator."
    pause
    exit /b 1
)
echo "✅ Docker found: "
docker --version

REM Check for Google Cloud CLI
gcloud --version >nul 2>&1
if !errorlevel! neq 0 (
    echo "❌ Google Cloud CLI not found. Please install gcloud CLI."
    pause
    exit /b 1
)
echo "✅ Google Cloud CLI found"

REM Check if authenticated
gcloud auth list --filter=status:ACTIVE --format="value(account)" >nul 2>&1
if !errorlevel! neq 0 (
    echo "❌ Not authenticated with Google Cloud. Run: gcloud auth login"
    pause
    exit /b 1
)
echo "✅ Google Cloud authenticated"

REM Check project is set
gcloud config list project --format="value(core.project)" > temp_project.txt 2>nul
if not exist temp_project.txt (
    echo "❌ No project set. Run: gcloud config set project YOUR_PROJECT_ID"
    pause
    exit /b 1
)

set /p PROJECT_ID=<temp_project.txt
del temp_project.txt
echo "✅ Project: !PROJECT_ID!"

REM Configuration
set SERVICE_NAME=keledon
set REGION=us-central1
set IMAGE_TAG=latest
set IMAGE_NAME=gcr.io/!PROJECT_ID!/keledon-single-container:!IMAGE_TAG!

echo.
echo "📋 Deployment Configuration:"
echo "  Project: !PROJECT_ID!"
echo "  Service: !SERVICE_NAME!"
echo "  Region: !REGION!"
echo "  Image: !IMAGE_NAME!"
echo.

REM Confirm deployment
set /p CONFIRM="Proceed with deployment? (y/N): "
if /i not "!CONFIRM!"=="y" (
    echo "Deployment cancelled."
    pause
    exit /b 0
)

REM Normalize start.sh line endings
echo "🔧 Normalizing start.sh line endings..."
if exist start.sh (
    powershell -Command "(Get-Content start.sh -Raw) -replace \"`r`n\", \"`n\" | Set-Content start.sh -NoNewline"
    echo "✅ Line endings normalized"
)

REM Configure Docker auth
echo "🔐 Configuring Docker authentication..."
gcloud auth configure-docker gcr.io --quiet
if !errorlevel! neq 0 (
    echo "❌ Docker authentication failed"
    pause
    exit /b 1
)
echo "✅ Docker authentication configured"

REM Build Docker image
echo.
echo "🐳 Building Docker image..."
echo "This may take 5-10 minutes..."
docker build -t !IMAGE_NAME! .
if !errorlevel! neq 0 (
    echo "❌ Docker build failed"
    pause
    exit /b 1
)
echo "✅ Docker image built successfully"

REM Push image to registry
echo.
echo "📤 Pushing image to Google Container Registry..."
docker push !IMAGE_NAME!
if !errorlevel! neq 0 (
    echo "❌ Docker push failed"
    pause
    exit /b 1
)
echo "✅ Image pushed successfully"

REM Deploy to Cloud Run
echo.
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy !SERVICE_NAME! ^
    --image=!IMAGE_NAME! ^
    --platform managed ^
    --region=!REGION! ^
    --allow-unauthenticated ^
    --port 8080 ^
    --memory 1Gi ^
    --cpu 1000m ^
    --timeout 300 ^
    --max-instances 10 ^
    --min-instances 0 ^
    --quiet

if !errorlevel! neq 0 (
    echo "❌ Cloud Run deployment failed"
    pause
    exit /b 1
)
echo "✅ Deployment successful!"

REM Get service URL
echo.
echo "🔍 Getting service URL..."
gcloud run services describe !SERVICE_NAME! ^
    --region=!REGION! ^
    --format="value(status.url)" > service_url.txt

set /p SERVICE_URL=<service_url.txt
del service_url.txt

REM Health check
echo.
echo "🏥 Running health check..."
set HEALTH_URL=!SERVICE_URL!/health

powershell -Command "try { $response = Invoke-WebRequest -Uri '!HEALTH_URL!' -UseBasicParsing -TimeoutSec 30; Write-Host '✅ Health check passed! Status:', $response.StatusCode } catch { Write-Host '⚠️ Health check failed (this is normal for first deployment):', $_.Exception.Message }"

REM Success message
echo.
echo "🎉 KELEDON deployed successfully!"
echo "================================"
echo "🌐 Service URL: !SERVICE_URL!"
echo "🏥 Health URL:  !HEALTH_URL!"
echo.
echo "📋 Useful commands:"
echo "   View logs: gcloud logs tail \"resource.type=cloud_run_revision\" --limit 50"
echo "   Service status: gcloud run services describe !SERVICE_NAME! --region !REGION!"
echo "   Update deployment: deploykeledon.bat"
echo.
echo "⏳ Please wait 2-3 minutes for the service to fully initialize..."
echo.

REM Open browser
start "" "!SERVICE_URL!"

echo "Press any key to exit..."
pause >nul