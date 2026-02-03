# Script to extract environment variables from cloud/.env for Cloud Run deployment
# This helps you copy the values to Cloud Run Console

Write-Host "[INFO] Environment Variables for Cloud Run" -ForegroundColor Green
Write-Host "Copy these values to Cloud Run Console → Variables & Secrets" -ForegroundColor Yellow
Write-Host ""

$envFile = "cloud\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "[FAIL] File not found: $envFile" -ForegroundColor Red
    Write-Host "Please create cloud\.env with your configuration" -ForegroundColor Yellow
    exit 1
}

Write-Host "Required Variables:" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host "NODE_ENV=production"
Write-Host "PORT=3001"
Write-Host "SINGLE_CONTAINER=true"
Write-Host ""

# Read Supabase variables
$supabaseUrl = (Get-Content $envFile | Select-String -Pattern "^SUPABASE_URL=" | ForEach-Object { $_.Line -replace '^SUPABASE_URL=', '' })
$supabaseAnon = (Get-Content $envFile | Select-String -Pattern "^SUPABASE_ANON_KEY=" | ForEach-Object { $_.Line -replace '^SUPABASE_ANON_KEY=', '' })
$supabaseService = (Get-Content $envFile | Select-String -Pattern "^SUPABASE_SERVICE_KEY=" | ForEach-Object { $_.Line -replace '^SUPABASE_SERVICE_KEY=', '' })

if ($supabaseUrl) {
    Write-Host "SUPABASE_URL=$supabaseUrl"
}
if ($supabaseAnon) {
    Write-Host "SUPABASE_ANON_KEY=$supabaseAnon"
}
if ($supabaseService) {
    Write-Host "SUPABASE_SERVICE_KEY=$supabaseService"
}

Write-Host ""
Write-Host "CORS_ORIGINS=https://YOUR-SERVICE-URL.run.app,chrome-extension://*" -ForegroundColor Yellow
Write-Host "(Replace YOUR-SERVICE-URL with actual Cloud Run URL after deployment)" -ForegroundColor Yellow
Write-Host ""

# Optional API keys
$optionalKeys = @("DEEPGRAM_API_KEY", "OPENAI_API_KEY", "ELEVENLABS_API_KEY")
$hasOptional = $false

foreach ($key in $optionalKeys) {
    $value = (Get-Content $envFile | Select-String -Pattern "^$key=" | ForEach-Object { $_.Line -replace "^$key=", '' })
    if ($value -and $value -ne "") {
        if (-not $hasOptional) {
            Write-Host "Optional Variables (if configured):" -ForegroundColor Cyan
            Write-Host "===================================" -ForegroundColor Cyan
            $hasOptional = $true
        }
        Write-Host "$key=$value"
    }
}

Write-Host ""
Write-Host "[SUCCESS] Copy the above variables to Cloud Run Console" -ForegroundColor Green
