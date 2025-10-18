#!/bin/bash

# Quick deployment script for Google Cloud Run
# Make this file executable: chmod +x deploy.sh

set -e  # Exit on error

# Change to project root directory
cd "$(dirname "$0")/.."

echo "🚀 Deploying CodeRevAI to Google Cloud Run..."
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No Google Cloud project set. Run:"
    echo "   gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📦 Project: $PROJECT_ID"
echo ""

# Fetch public keys from Secret Manager for build-time substitution
echo "🔑 Fetching public keys from Secret Manager..."
CLERK_PUB_KEY=$(gcloud secrets versions access latest --secret="CLERK_PUBLISHABLE_KEY" 2>/dev/null || echo "")
STRIPE_PUB_KEY=$(gcloud secrets versions access latest --secret="STRIPE_PUBLISHABLE_KEY" 2>/dev/null || echo "")
STRIPE_PRICE_ID=$(gcloud secrets versions access latest --secret="STRIPE_PRICE_ID_PRO" 2>/dev/null || echo "")

if [ -z "$CLERK_PUB_KEY" ] || [ -z "$STRIPE_PUB_KEY" ] || [ -z "$STRIPE_PRICE_ID" ]; then
    echo "⚠️  Warning: Some secrets are missing. Build may fail."
    echo "   Run ./scripts/setup-secrets.sh to configure secrets"
fi

echo ""

# Configuration
SERVICE_NAME="coderevai"
REGION="us-central1"
MEMORY="512Mi"
CPU="1"
MAX_INSTANCES="10"
MIN_INSTANCES="0"
TIMEOUT="300"

# Build and deploy
echo "🔨 Building Docker image with Cloud Build..."
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_CLERK_PUBLISHABLE_KEY="$CLERK_PUB_KEY",_STRIPE_PUBLISHABLE_KEY="$STRIPE_PUB_KEY",_STRIPE_PRICE_ID_PRO="$STRIPE_PRICE_ID"

echo ""
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/coderevai:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1 \
  --update-secrets \
GEMINI_API_KEY=GEMINI_API_KEY:latest,\
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=CLERK_PUBLISHABLE_KEY:latest,\
CLERK_SECRET_KEY=CLERK_SECRET_KEY:latest,\
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY:latest,\
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=STRIPE_PRICE_ID_PRO:latest,\
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,\
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest \
  --max-instances $MAX_INSTANCES \
  --min-instances $MIN_INSTANCES \
  --memory $MEMORY \
  --cpu $CPU \
  --timeout $TIMEOUT

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')

echo ""
echo "✅ Deployment successful!"
echo ""
echo "🌐 Your app is live at:"
echo "   $SERVICE_URL"
echo ""
echo "📊 View logs:"
echo "   gcloud run services logs read $SERVICE_NAME --region $REGION"
echo ""
echo "⚙️  View service details:"
echo "   gcloud run services describe $SERVICE_NAME --region $REGION"
echo ""
echo "📝 Next steps:"
echo "   1. Update Clerk authorized origins with: $SERVICE_URL"
echo "   2. Update Stripe webhook URL with: $SERVICE_URL/api/webhooks/stripe"
echo "   3. Test your application"
echo ""
