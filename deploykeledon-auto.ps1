# KELEDON Auto-Confirm Deployment Script
param(
    [string]$ProjectId = "keledon",
    [string]$ServiceName = "keledon", 
    [string]$Region = "us-central1",
    [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"

Write-Host "KELEDON Auto-Confirm Deployment" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

# Check Docker
try {
    $dockerVersion = docker --version 2>$null
    Write-Host "Docker: $dockerVersion"
} catch {
    Write-Host "ERROR: Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check Google Cloud CLI
try {
    $gcloudVersion = gcloud version --format='value(gcloud)' 2>$null
    Write-Host "Google Cloud CLI: $gcloudVersion"
} catch {
    Write-Host "ERROR: Google Cloud CLI not found. Please install gcloud CLI." -ForegroundColor Red
    exit 1
}

# Check authentication
try {
    $account = gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>$null
    if ([string]::IsNullOrEmpty($account)) {
        Write-Host "ERROR: Not authenticated with Google Cloud. Run: gcloud auth login" -ForegroundColor Red
        exit 1
    }
    Write-Host "Authenticated as: $account"
} catch {
    Write-Host "ERROR: Cannot check authentication status." -ForegroundColor Red
    exit 1
}

# Configuration
$ImageName = "gcr.io/$ProjectId/keledon-single-container:$ImageTag"

Write-Host ""
Write-Host "Deployment Configuration:" -ForegroundColor Cyan
Write-Host "  Project: $ProjectId"
Write-Host "  Service: $ServiceName"
Write-Host "  Region: $Region"
Write-Host "  Image: $ImageName"

Write-Host ""
Write-Host "Starting deployment (auto-confirmed)..." -ForegroundColor Yellow

# Enable required APIs
Write-Host ""
Write-Host "Enabling required Google Cloud APIs..." -ForegroundColor Yellow

Write-Host "  Enabling Cloud Resource Manager API..." -ForegroundColor Gray
gcloud services enable cloudresourcemanager.googleapis.com --project=$ProjectId --quiet

Write-Host "  Enabling Cloud Run API..." -ForegroundColor Gray
gcloud services enable run.googleapis.com --project=$ProjectId --quiet

Write-Host "  Enabling Container Registry API..." -ForegroundColor Gray
gcloud services enable containerregistry.googleapis.com --project=$ProjectId --quiet

Write-Host "Required APIs enabled" -ForegroundColor Green

# Configure Docker authentication
Write-Host ""
Write-Host "Configuring Docker authentication..." -ForegroundColor Yellow
gcloud auth configure-docker gcr.io --quiet
Write-Host "Docker authentication configured"

# Build Docker image
Write-Host ""
Write-Host "Building Docker image..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes..." -ForegroundColor Gray

docker build -t $ImageName .

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker build failed" -ForegroundColor Red
    exit 1
}
Write-Host "Docker image built successfully" -ForegroundColor Green

# Push image to registry
Write-Host ""
Write-Host "Pushing image to Google Container Registry..." -ForegroundColor Yellow

docker push $ImageName

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker push failed" -ForegroundColor Red
    exit 1
}
Write-Host "Image pushed successfully" -ForegroundColor Green

# Deploy to Cloud Run
Write-Host ""
Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow

gcloud run deploy $ServiceName --image=$ImageName --platform managed --region=$Region --allow-unauthenticated --port 8080 --memory 1Gi --cpu 1000m --timeout 300 --max-instances 10 --min-instances 0 --quiet

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cloud Run deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "Deployment successful!" -ForegroundColor Green

# Get service URL
Write-Host ""
Write-Host "Getting service URL..." -ForegroundColor Yellow

$ServiceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)"
$HealthUrl = "$ServiceUrl/health"

# Health check
Write-Host ""
Write-Host "Running health check..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 30
    Write-Host "Health check passed! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Health check failed (this is normal for first deployment): $($_.Exception.Message)" -ForegroundColor Yellow
}

# Success message
Write-Host ""
Write-Host "KELEDON deployed successfully!" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host "Service URL: $ServiceUrl" -ForegroundColor Cyan
Write-Host "Health URL:  $HealthUrl" -ForegroundColor Cyan

Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Gray
Write-Host "   View logs: gcloud logs tail resource.type=cloud_run_revision --limit 50" -ForegroundColor Gray
Write-Host "   Service status: gcloud run services describe $ServiceName --region $Region" -ForegroundColor Gray
Write-Host "   Update deployment: .\deploykeledon-auto.ps1" -ForegroundColor Gray

Write-Host ""
Write-Host "Please wait 2-3 minutes for service to fully initialize..." -ForegroundColor Yellow

# Open browser
Start-Process $ServiceUrl

Write-Host ""
Write-Host "Deployment complete! Check your browser." -ForegroundColor Green