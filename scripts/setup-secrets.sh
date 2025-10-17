#!/bin/bash

# Google Cloud Secret Manager Setup Script
# This script automatically reads your .env.local file and uploads secrets to Google Cloud

set -e  # Exit on error

# Change to project root directory
cd "$(dirname "$0")/.."

echo "🔐 Setting up Google Cloud Secret Manager for CodeRevAI..."
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

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    echo "   Please create .env.local with your API keys first."
    exit 1
fi

# Enable Secret Manager API
echo "🔧 Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID" 2>/dev/null || true
echo ""

# Load environment variables from .env.local
echo "📄 Loading environment variables from .env.local..."
set -a
source .env.local
set +a
echo ""

# Function to create or update secret
create_or_update_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    
    if [ -z "$SECRET_VALUE" ]; then
        echo "⚠️  Warning: $SECRET_NAME is empty, skipping..."
        return
    fi
    
    # Check if secret exists
    if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
        echo "🔄 Updating existing secret: $SECRET_NAME"
        echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" --data-file=- --project="$PROJECT_ID"
    else
        echo "➕ Creating new secret: $SECRET_NAME"
        echo -n "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" --data-file=- --replication-policy="automatic" --project="$PROJECT_ID"
    fi
}

echo "🔑 Creating/Updating secrets from .env.local..."
echo ""

# Server-side secrets (NOT exposed to client)
echo "📝 Server-side secrets:"
create_or_update_secret "GEMINI_API_KEY" "$GEMINI_API_KEY"
create_or_update_secret "CLERK_SECRET_KEY" "$CLERK_SECRET_KEY"
create_or_update_secret "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
create_or_update_secret "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
echo ""

# Public secrets (exposed to client, needed for build)
echo "📝 Public secrets (for build time):"
create_or_update_secret "CLERK_PUBLISHABLE_KEY" "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
create_or_update_secret "STRIPE_PUBLISHABLE_KEY" "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
create_or_update_secret "STRIPE_PRICE_ID_PRO" "$NEXT_PUBLIC_STRIPE_PRICE_ID_PRO"
echo ""

echo "✅ All secrets configured successfully!"
echo ""
echo "📋 List all secrets:"
echo "   gcloud secrets list --project=$PROJECT_ID"
echo ""
echo "🔍 View a secret value (example):"
echo "   gcloud secrets versions access latest --secret=GEMINI_API_KEY --project=$PROJECT_ID"
echo ""
echo "🚀 Next step: Run ./deploy.sh to deploy to Cloud Run"
echo ""
