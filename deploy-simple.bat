@echo off
echo Starting KELEDON Deployment...

REM Set project ID (you can change this)
set PROJECT_ID=keledon
set SERVICE_NAME=keledon
set REGION=us-central1
set IMAGE_NAME=gcr.io/%PROJECT_ID%/keledon-single-container:latest

echo Project: %PROJECT_ID%
echo Service: %SERVICE_NAME%
echo Region: %REGION%
echo Image: %IMAGE_NAME%

pause

REM Configure Docker auth
echo Configuring Docker auth...
gcloud auth configure-docker gcr.io --quiet

REM Build Docker image
echo Building Docker image...
docker build -t %IMAGE_NAME% .

REM Push image
echo Pushing image...
docker push %IMAGE_NAME%

REM Deploy to Cloud Run
echo Deploying to Cloud Run...
gcloud run deploy %SERVICE_NAME% --image=%IMAGE_NAME% --platform managed --region=%REGION% --allow-unauthenticated --port 8080 --memory 1Gi --cpu 1000m --timeout 300 --max-instances 10 --min-instances 0

REM Get service URL
echo Getting service URL...
gcloud run services describe %SERVICE_NAME% --region=%REGION% --format="value(status.url)" > url.txt

set /p SERVICE_URL=<url.txt
del url.txt

echo Deployment complete!
echo Service URL: %SERVICE_URL%
echo Health URL: %SERVICE_URL%/health

REM Open browser
start "" "%SERVICE_URL%"

pause