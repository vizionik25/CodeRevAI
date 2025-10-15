#!/bin/bash

# Docker build script that loads .env.local and passes public vars as build args
# Usage: ./docker-build.sh

set -e

echo "🐳 Building Docker image for CodeRevAI..."

# Load environment variables from .env.local
if [ -f .env.local ]; then
    echo "📦 Loading environment variables from .env.local..."
    export $(grep -v '^#' .env.local | grep -E 'NEXT_PUBLIC_' | xargs)
else
    echo "⚠️  Warning: .env.local not found. Using default values."
fi

# Build Docker image with build arguments
docker build \
    --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}" \
    --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}" \
    --build-arg NEXT_PUBLIC_STRIPE_PRICE_ID_PRO="${NEXT_PUBLIC_STRIPE_PRICE_ID_PRO}" \
    -t coderevai:latest \
    .

echo "✅ Docker image built successfully!"
echo "🚀 To run locally: docker run -p 3000:3000 --env-file .env.local coderevai:latest"
