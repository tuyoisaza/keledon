@echo off
echo ========================================
echo KELEDON DEPLOYMENT STATUS CHECK
echo ========================================
echo.

echo Checking current project...
gcloud config get-value project
echo.

echo Checking Cloud Run services...
gcloud run services list --region=us-central1
echo.

echo Checking billing status...
gcloud billing projects describe keledon --format="value(billingEnabled)"
echo.

echo Checking enabled APIs...
gcloud services list --enabled --filter="name~run OR name~cloudbuild OR name~artifactregistry" --format="table(name,state)"
echo.

echo Checking recent builds...
gcloud builds list --limit=5 --format="table(id,status,createTime)"
echo.

echo ========================================
echo DEPLOYMENT TROUBLESHOOTING
echo ========================================
echo.
echo If no services are listed:
echo 1. Check if billing is enabled: gcloud billing projects describe keledon
echo 2. Enable required APIs: gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
echo 3. Redeploy manually: cd C:\Keldon\scripts && ./deploy-all.sh
echo.
echo If services exist but not accessible:
echo 1. Check service logs: gcloud run services logs read SERVICE_NAME --region=us-central1 --limit=50
echo 2. Check service status: gcloud run services describe SERVICE_NAME --region=us-central1
echo.

pause