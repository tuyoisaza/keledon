# Pre-Deployment Check Script
# Run this BEFORE deploy.ps1 to make sure everything is ready

Write-Host "[CHECK] KELEDON Pre-Deployment Check" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: GCP Project ID
Write-Host "1. Checking GCP Project ID..." -ForegroundColor Yellow
if ($env:GCP_PROJECT_ID) {
    Write-Host "   [OK] GCP_PROJECT_ID is set: $env:GCP_PROJECT_ID" -ForegroundColor Green
} else {
    Write-Host "   [WARN] GCP_PROJECT_ID is not set (will use default: keledon)" -ForegroundColor Yellow
    Write-Host "   To set explicitly: `$env:GCP_PROJECT_ID = 'keledon'" -ForegroundColor Gray
    # Don't fail - script has default value
}

# Check 2: Docker
Write-Host "2. Checking Docker..." -ForegroundColor Yellow
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker ps | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Docker is installed and running" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] Docker is installed but not running!" -ForegroundColor Red
        Write-Host "   Start Docker Desktop and try again" -ForegroundColor Yellow
        $allGood = $false
    }
} else {
    Write-Host "   [FAIL] Docker is not installed!" -ForegroundColor Red
    Write-Host "   Install from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    $allGood = $false
}

# Check 3: gcloud CLI
Write-Host "3. Checking gcloud CLI..." -ForegroundColor Yellow
if (Get-Command gcloud -ErrorAction SilentlyContinue) {
    Write-Host "   [OK] gcloud CLI is installed" -ForegroundColor Green
    
    # Check if authenticated
    $authCheck = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>&1
    if ($authCheck -and $authCheck -ne "") {
        Write-Host "   [OK] Authenticated as: $authCheck" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] Not authenticated!" -ForegroundColor Yellow
        Write-Host "   Run: gcloud auth login" -ForegroundColor Yellow
        $allGood = $false
    }
} else {
    Write-Host "   [FAIL] gcloud CLI is not installed!" -ForegroundColor Red
    Write-Host "   Install from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    $allGood = $false
}

# Check 4: cloud/.env file
Write-Host "4. Checking cloud/.env file..." -ForegroundColor Yellow
$envFile = "cloud\.env"
if (Test-Path $envFile) {
    Write-Host "   [OK] cloud/.env exists" -ForegroundColor Green
    
    # Check for required variables
    $lines = Get-Content $envFile
    $required = @("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY")
    $missing = @()
    
    foreach ($var in $required) {
        $found = $false
        foreach ($line in $lines) {
            # Remove comments and whitespace, check if line starts with variable name
            $cleanLine = $line.Trim()
            if ($cleanLine -and -not $cleanLine.StartsWith('#')) {
                if ($cleanLine -match "^$var\s*=") {
                    $found = $true
                    break
                }
            }
        }
        
        if ($found) {
            Write-Host "   [OK] $var is set" -ForegroundColor Green
        } else {
            Write-Host "   [FAIL] $var is missing!" -ForegroundColor Red
            $missing += $var
            $allGood = $false
        }
    }
} else {
    Write-Host "   [FAIL] cloud/.env file not found!" -ForegroundColor Red
    Write-Host "   Create it with your Supabase credentials" -ForegroundColor Yellow
    $allGood = $false
}

# Check 5: GCP Project exists
Write-Host "5. Checking GCP Project..." -ForegroundColor Yellow
$projectIdToCheck = if ($env:GCP_PROJECT_ID) { $env:GCP_PROJECT_ID } else { "keledon" }
$projectCheck = gcloud projects describe $projectIdToCheck 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Project '$projectIdToCheck' exists" -ForegroundColor Green
} else {
    Write-Host "   [WARN] Project '$projectIdToCheck' not found or not accessible" -ForegroundColor Yellow
    Write-Host "   Your project ID should be: keledon" -ForegroundColor Yellow
    Write-Host "   Verify with: gcloud projects list" -ForegroundColor Yellow
}

Write-Host ""
if ($allGood) {
    Write-Host "[SUCCESS] All checks passed! Ready to deploy." -ForegroundColor Green
    Write-Host ""
    Write-Host "Run: .\deploy.ps1" -ForegroundColor Cyan
} else {
    Write-Host "[FAIL] Some checks failed. Please fix the issues above before deploying." -ForegroundColor Red
}

Write-Host ""
