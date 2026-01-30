# KELEDON Cloud Run Deployment Script
# Updated for single-container deployment

param(
    [string]$ProjectId = "keledon",
    [string]$ServiceName = "keledon",
    [string]$Region = "us-central1",
    [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"

# Configuration
$ImageName = "gcr.io/$ProjectId/keledon-single-container:$ImageTag"

Write-Host "🚀 KELEDON Cloud Run Deployment" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "Project : $ProjectId"
Write-Host "Service : $ServiceName"
Write-Host "Region  : $Region"
Write-Host "Image   : $ImageName"
Write-Host ""

# Validate current directory
if (-not (Test-Path "Dockerfile")) {
    throw "❌ Error: Dockerfile not found in current directory. Please run from KELEDON root."
}

# Step 1: Set project
Write-Host "📋 Setting Google Cloud project..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Step 2: Normalize line endings for start.sh
Write-Host "🔧 Normalizing start.sh line endings..." -ForegroundColor Yellow
$startScript = "start.sh"
if (Test-Path $startScript) {
    $content = Get-Content $startScript -Raw
    $content = $content -replace "`r`n", "`n"
    Set-Content -Path $startScript -Value $content -NoNewline
}

# Step 3: Configure Docker auth
Write-Host "🔐 Configuring Docker authentication..." -ForegroundColor Yellow
gcloud auth configure-docker gcr.io --quiet

# Step 4: Build Docker image
Write-Host "🐳 Building Docker image..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..."
docker build -t $ImageName .

if ($LASTEXITCODE -ne 0) {
    throw "❌ Docker build failed"
}

# Step 5: Push image to registry
Write-Host "📤 Pushing image to Google Container Registry..." -ForegroundColor Yellow
docker push $ImageName

if ($LASTEXITCODE -ne 0) {
    throw "❌ Docker push failed"
}

# Step 6: Deploy to Cloud Run
Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $ServiceName `
    --image $ImageName `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --port 8080 `
    --memory 1Gi `
    --cpu 1000m `
    --timeout 300 `
    --max-instances 10 `
    --min-instances 0 `
    --quiet

if ($LASTEXITCODE -ne 0) {
    throw "❌ Cloud Run deployment failed"
}

# Step 7: Get service URL
Write-Host "🔍 Getting service URL..." -ForegroundColor Yellow
$ServiceUrl = gcloud run services describe $ServiceName `
    --region $Region `
    --format "value(status.url)"

# Step 8: Verify deployment
Write-Host "🏥 Verifying deployment health..." -ForegroundColor Yellow
$healthUrl = "$ServiceUrl/health"
try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Health check returned status code: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Health check failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   The service might still be starting up. Check again in a few minutes." -ForegroundColor Yellow
}

# Success
Write-Host ""
Write-Host "🎉 Deployment successful!" -ForegroundColor Green
Write-Host "🌐 Service URL: $ServiceUrl"
Write-Host "🏥 Health URL:  $healthUrl"
Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor Cyan
Write-Host "   View logs: gcloud logs tail 'resource.type=cloud_run_revision' --limit 50" -ForegroundColor Cyan
Write-Host "   Service status: gcloud run services describe $ServiceName --region $Region" -ForegroundColor Cyan
Write-Host "   Update deployment: .\deploy.ps1 -ImageTag '$(Get-Date -Format 'yyyyMMdd-HHmm')'" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")