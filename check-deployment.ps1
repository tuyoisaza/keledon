# KELEDON Deployment Check
Write-Host "KELEDON Deployment Check" -ForegroundColor Green
Write-Host "=======================" -ForegroundColor Green

# Check if prerequisites are available
Write-Host ""
Write-Host "Checking Deployment Prerequisites:" -ForegroundColor Yellow

# Check Docker
try {
    $dockerVersion = docker --version 2>$null
    Write-Host "[OK] Docker: $dockerVersion" -ForegroundColor Green
    $dockerAvailable = $true
} catch {
    Write-Host "[MISSING] Docker not found. Please install Docker Desktop." -ForegroundColor Red
    $dockerAvailable = $false
}

# Check Google Cloud CLI
try {
    $gcloudVersion = gcloud version --format='value(gcloud)' 2>$null
    Write-Host "[OK] Google Cloud CLI: $gcloudVersion" -ForegroundColor Green
    $gcloudAvailable = $true
} catch {
    Write-Host "[MISSING] Google Cloud CLI not found." -ForegroundColor Red
    $gcloudAvailable = $false
}

# Check authentication
if ($gcloudAvailable) {
    try {
        $account = gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>$null
        if ([string]::IsNullOrEmpty($account)) {
            Write-Host "[ISSUE] Not authenticated with Google Cloud. Run: gcloud auth login" -ForegroundColor Yellow
        } else {
            Write-Host "[OK] Authenticated as: $account" -ForegroundColor Green
        }
    } catch {
        Write-Host "[ISSUE] Cannot check authentication status." -ForegroundColor Yellow
    }
}

# Check project
if ($gcloudAvailable) {
    try {
        $ProjectId = gcloud config list project --format='value(core.project)' 2>$null
        if ([string]::IsNullOrEmpty($ProjectId)) {
            Write-Host "[ISSUE] No project set. Run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Yellow
        } else {
            Write-Host "[OK] Project: $ProjectId" -ForegroundColor Green
        }
    } catch {
        Write-Host "[ISSUE] Cannot check project configuration." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Required Files Check:" -ForegroundColor Yellow

$files = @("Dockerfile", "nginx.conf", "start.sh", "cloud/package.json", "landing/package.json")
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "[OK] $file" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Deployment Readiness:" -ForegroundColor Cyan

if ($dockerAvailable -and $gcloudAvailable) {
    Write-Host "READY: All prerequisites available. You can run deployment." -ForegroundColor Green
    Write-Host ""
    Write-Host "To deploy:" -ForegroundColor White
    Write-Host "  .\deploykeledon.ps1" -ForegroundColor Gray
} else {
    Write-Host "NOT READY: Install missing prerequisites first." -ForegroundColor Red
    Write-Host ""
    Write-Host "To install:" -ForegroundColor White
    if (-not $dockerAvailable) {
        Write-Host "  1. Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
    }
    if (-not $gcloudAvailable) {
        Write-Host "  2. Google Cloud CLI: https://cloud.google.com/sdk/docs/install" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "After installation:" -ForegroundColor White
    Write-Host "  gcloud auth login" -ForegroundColor Gray
    Write-Host "  gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Gray
    Write-Host "  .\deploykeledon.ps1" -ForegroundColor Gray
}