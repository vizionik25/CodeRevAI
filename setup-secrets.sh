#!/bin/bash

# Script to set up Google Cloud secrets for CodeRevAI
# Make this file executable: chmod +x setup-secrets.sh

set -e  # Exit on error

echo "🔐 Setting up Google Cloud Secrets for CodeRevAI..."
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

# Enable Secret Manager API
echo "🔧 Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com

echo ""
echo "Please provide your secret values (input will be hidden):"
echo ""

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if gcloud secrets describe $secret_name &>/dev/null; then
        echo "  ↻ Updating existing secret: $secret_name"
        echo -n "$secret_value" | gcloud secrets versions add $secret_name --data-file=-
    else
        echo "  ✓ Creating new secret: $secret_name"
        echo -n "$secret_value" | gcloud secrets create $secret_name --data-file=-
    fi
}

# Get secrets from user
echo "🔑 Gemini API Key:"
read -s GEMINI_API_KEY
create_or_update_secret "GEMINI_API_KEY" "$GEMINI_API_KEY"

echo ""
echo "🔑 Clerk Publishable Key:"
read -s CLERK_PUBLISHABLE_KEY
create_or_update_secret "CLERK_PUBLISHABLE_KEY" "$CLERK_PUBLISHABLE_KEY"

echo ""
echo "🔑 Clerk Secret Key:"
read -s CLERK_SECRET_KEY
create_or_update_secret "CLERK_SECRET_KEY" "$CLERK_SECRET_KEY"

echo ""
echo "🔑 Stripe Publishable Key:"
read -s STRIPE_PUBLISHABLE_KEY
create_or_update_secret "STRIPE_PUBLISHABLE_KEY" "$STRIPE_PUBLISHABLE_KEY"

echo ""
echo "🔑 Stripe Secret Key:"
read -s STRIPE_SECRET_KEY
create_or_update_secret "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"

echo ""
echo "🔑 Stripe Webhook Secret (leave empty if not set up yet):"
read -s STRIPE_WEBHOOK_SECRET
if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
    create_or_update_secret "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
else
    echo "  ⚠️  Skipping Stripe Webhook Secret (you can add it later)"
fi

echo ""
echo "🔐 Granting Cloud Run access to secrets..."

# Get project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Grant access to all secrets
for SECRET in GEMINI_API_KEY CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY STRIPE_PUBLISHABLE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET; do
    if gcloud secrets describe $SECRET &>/dev/null; then
        gcloud secrets add-iam-policy-binding $SECRET \
            --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
            --role="roles/secretmanager.secretAccessor" \
            --quiet 2>/dev/null || true
        echo "  ✓ Granted access to: $SECRET"
    fi
done

echo ""
echo "✅ Secrets setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Run './deploy.sh' to deploy your application"
echo "   2. After deployment, update Stripe webhook secret if needed:"
echo "      echo -n 'your_webhook_secret' | gcloud secrets versions add STRIPE_WEBHOOK_SECRET --data-file=-"
echo ""
