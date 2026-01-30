@echo off
echo ========================================
echo KELEDON DEPLOYMENT DIAGNOSIS
echo ========================================
echo.

echo Checking deployment status...
echo.

echo 1. Checking project and APIs...
gcloud config get-value project
gcloud services list --enabled --filter="name~appengine" --format="table(name,state)"
echo.

echo 2. Checking App Engine status...
gcloud app describe --format="table(name,statusUrl,servingStatus)" 2>nul || echo App Engine not initialized
echo.

echo 3. Checking deployed services...
gcloud app services list
echo.

echo 4. Testing backend URL...
curl -s -I https://keledon.uc.r.appspot.com/health
echo.

echo 5. Testing frontend storage...
curl -s -I https://keeldon-landing-frontend.storage.googleapis.com/
echo.

echo 6. Checking storage bucket...
gsutil ls gs://keeldon-landing-frontend 2>nul || echo Bucket not found or not accessible
echo.

echo ========================================
echo FIX RECOMMENDATIONS
echo ========================================
echo.
echo If App Engine is not initialized:
echo   gcloud app create --region=us-central1
echo.
echo If backend not deployed:
echo   cd C:\Keldon\scripts && ./deploy-fix.sh
echo.
echo If frontend storage denied:
echo   gsutil iam ch allUsers:objectViewer gs://keeldon-landing-frontend
echo   gsutil web set -m gs://keeldon-landing-frontend
echo.

pause