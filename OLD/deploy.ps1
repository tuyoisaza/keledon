$ErrorActionPreference = "Stop"

# -------------------------------
# HARD CONFIG (NO INFERENCE)
# -------------------------------

$PROJECT_ID   = "keledon"
$SERVICE_NAME = "keledon"
$REGION       = "us-central1"

$IMAGE_NAME = "gcr.io/keledon/keledon:latest"

Write-Host "[DEPLOY] KELEDON Cloud Run Deployment"
Write-Host "Project : $PROJECT_ID"
Write-Host "Service : $SERVICE_NAME"
Write-Host "Region  : $REGION"
Write-Host "Image   : $IMAGE_NAME"
Write-Host ""

# Guardrail: fail fast if image is wrong
if ($IMAGE_NAME -notmatch ":") {
    throw "IMAGE_NAME is invalid: $IMAGE_NAME"
}

# -------------------------------
# Step 1: Set project
# -------------------------------

gcloud config set project $PROJECT_ID | Out-Null

# -------------------------------
# Step 2: Normalize start.sh
# -------------------------------

$startScript = "start.sh"
if (Test-Path $startScript) {
    $content = Get-Content $startScript -Raw
    $content = $content -replace "`r`n", "`n"
    Set-Content -Path $startScript -Value $content -NoNewline
}

# -------------------------------
# Step 3: Docker auth
# -------------------------------

gcloud auth configure-docker gcr.io --quiet

# -------------------------------
# Step 4: Build image
# -------------------------------

docker build -t $IMAGE_NAME .

if ($LASTEXITCODE -ne 0) {
    throw "Docker build failed"
}

# -------------------------------
# Step 5: Push image
# -------------------------------

docker push $IMAGE_NAME

if ($LASTEXITCODE -ne 0) {
    throw "Docker push failed"
}

# -------------------------------
# Step 6: Deploy
# -------------------------------

gcloud run deploy $SERVICE_NAME `
    --image $IMAGE_NAME `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --port 8080 `
    --memory 1Gi `
    --timeout 300 `
    --quiet

if ($LASTEXITCODE -ne 0) {
    throw "Cloud Run deployment failed"
}

# -------------------------------
# Step 7: URL
# -------------------------------

$SERVICE_URL = gcloud run services describe $SERVICE_NAME `
    --region $REGION `
    --format "value(status.url)"

Write-Host ""
Write-Host "Deployment successful"
Write-Host "Service URL: $SERVICE_URL"
