#!/bin/bash

# Deploy script that builds Docker image locally and pushes to GCR
# This bypasses Cloud Build secret access issues

set -e

echo "🚀 Deploying CodeRevAI to Google Cloud Run (local build)..."
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install it first:"
    echo "   https://docs.docker.com/get-docker/"
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

# Configuration
SERVICE_NAME="coderevai"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/coderevai:latest"

# Load environment variables from .env.local
if [ -f .env.local ]; then
    echo "📦 Loading environment variables from .env.local..."
    export $(grep -v '^#' .env.local | grep -E 'NEXT_PUBLIC_' | xargs)
else
    echo "❌ Error: .env.local not found!"
    exit 1
fi

# Configure Docker to use gcloud as a credential helper
echo "🔐 Configuring Docker authentication..."
gcloud auth configure-docker --quiet

# Build Docker image locally
echo ""
echo "🔨 Building Docker image locally..."
docker build \
    --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}" \
    --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}" \
    --build-arg NEXT_PUBLIC_STRIPE_PRICE_ID_PRO="${NEXT_PUBLIC_STRIPE_PRICE_ID_PRO}" \
    -t "$IMAGE_NAME" \
    --platform linux/amd64 \
    .

# Push to GCR
echo ""
echo "📤 Pushing image to Google Container Registry..."
docker push "$IMAGE_NAME"

# Deploy to Cloud Run
echo ""
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image "$IMAGE_NAME" \
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
  --max-instances 10 \
  --min-instances 0 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300

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
