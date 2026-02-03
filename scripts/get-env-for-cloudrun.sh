#!/bin/bash
# Script to extract environment variables from cloud/.env for Cloud Run deployment

echo "📋 Environment Variables for Cloud Run"
echo "Copy these values to Cloud Run Console → Variables & Secrets"
echo ""

ENV_FILE="cloud/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ File not found: $ENV_FILE"
    echo "Please create cloud/.env with your configuration"
    exit 1
fi

echo "Required Variables:"
echo "=================="
echo "NODE_ENV=production"
echo "PORT=3001"
echo "SINGLE_CONTAINER=true"
echo ""

# Read Supabase variables
if grep -q "^SUPABASE_URL=" "$ENV_FILE"; then
    echo "SUPABASE_URL=$(grep "^SUPABASE_URL=" "$ENV_FILE" | cut -d '=' -f2-)"
fi
if grep -q "^SUPABASE_ANON_KEY=" "$ENV_FILE"; then
    echo "SUPABASE_ANON_KEY=$(grep "^SUPABASE_ANON_KEY=" "$ENV_FILE" | cut -d '=' -f2-)"
fi
if grep -q "^SUPABASE_SERVICE_KEY=" "$ENV_FILE"; then
    echo "SUPABASE_SERVICE_KEY=$(grep "^SUPABASE_SERVICE_KEY=" "$ENV_FILE" | cut -d '=' -f2-)"
fi

echo ""
echo "CORS_ORIGINS=https://YOUR-SERVICE-URL.run.app,chrome-extension://*"
echo "(Replace YOUR-SERVICE-URL with actual Cloud Run URL after deployment)"
echo ""

# Optional API keys
HAS_OPTIONAL=false
for key in DEEPGRAM_API_KEY OPENAI_API_KEY ELEVENLABS_API_KEY; do
    if grep -q "^$key=" "$ENV_FILE"; then
        value=$(grep "^$key=" "$ENV_FILE" | cut -d '=' -f2-)
        if [ -n "$value" ]; then
            if [ "$HAS_OPTIONAL" = false ]; then
                echo "Optional Variables (if configured):"
                echo "==================================="
                HAS_OPTIONAL=true
            fi
            echo "$key=$value"
        fi
    fi
done

echo ""
echo "✅ Copy the above variables to Cloud Run Console"
