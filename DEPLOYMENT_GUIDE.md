# Google Cloud Run Deployment Guide

Complete guide to deploying [CodeRevAI] to Google Cloud Run with CI/CD.

## Prerequisites

1. **Google Cloud Account**
   - Sign up at https://cloud.google.com/
   - Enable billing for your project

2. **Google Cloud SDK (gcloud CLI)**
   - Install: https://cloud.google.com/sdk/docs/install
   - Verify installation: `gcloud --version`

3. **Docker** (for local testing)
   - Install: https://docs.docker.com/get-docker/

## Step 1: Set Up Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create coderevai-prod --name="CodeRevAI Production"

# Set the project as default
gcloud config set project coderevai-prod

# Get your project ID
gcloud config get-value project
```

## Step 2: Enable Required APIs

```bash
# Enable Cloud Run API
gcloud services enable run.googleapis.com

# Enable Container Registry API
gcloud services enable containerregistry.googleapis.com

# Enable Cloud Build API (for CI/CD)
gcloud services enable cloudbuild.googleapis.com

# Enable Secret Manager API (for environment variables)
gcloud services enable secretmanager.googleapis.com
```

## Step 3: Set Up Environment Variables with Secret Manager

Instead of hardcoding secrets, use Google Cloud Secret Manager:

```bash
# Create secrets for your environment variables
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "YOUR_CLERK_PUBLISHABLE_KEY" | gcloud secrets create CLERK_PUBLISHABLE_KEY --data-file=-
echo -n "YOUR_CLERK_SECRET_KEY" | gcloud secrets create CLERK_SECRET_KEY --data-file=-
echo -n "YOUR_STRIPE_PUBLISHABLE_KEY" | gcloud secrets create STRIPE_PUBLISHABLE_KEY --data-file=-
echo -n "YOUR_STRIPE_SECRET_KEY" | gcloud secrets create STRIPE_SECRET_KEY --data-file=-
echo -n "YOUR_STRIPE_WEBHOOK_SECRET" | gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=-

# Grant Cloud Run access to secrets
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Repeat for all secrets
for SECRET in CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY STRIPE_PUBLISHABLE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

## Step 4: Configure Stripe Webhook for Production

After deployment, you'll need to update your Stripe webhook:

1. Deploy your app first (see Step 5)
2. Get your Cloud Run URL (e.g., `https://coderevai-xyz.run.app`)
3. Go to https://dashboard.stripe.com/webhooks
4. Add endpoint: `https://your-cloud-run-url/api/webhooks/stripe`
5. Update the webhook secret in Secret Manager:
   ```bash
   echo -n "NEW_WEBHOOK_SECRET" | gcloud secrets versions add STRIPE_WEBHOOK_SECRET --data-file=-
   ```

## Step 5: Deploy to Cloud Run (Manual)

### Option A: Deploy Directly (Simple)

```bash
# Build and deploy in one command
gcloud run deploy coderevai \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1 \
  --update-secrets \
NEXT_PUBLIC_GEMINI_API_KEY=GEMINI_API_KEY:latest,\
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=CLERK_PUBLISHABLE_KEY:latest,\
CLERK_SECRET_KEY=CLERK_SECRET_KEY:latest,\
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY:latest,\
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,\
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest \
  --max-instances 10 \
  --min-instances 0 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300
```

### Option B: Build Docker Image First (More Control)

```bash
# Set your project ID
PROJECT_ID=$(gcloud config get-value project)

# Build the Docker image
docker build -t gcr.io/$PROJECT_ID/coderevai:latest .

# Push to Container Registry
docker push gcr.io/$PROJECT_ID/coderevai:latest

# Deploy to Cloud Run
gcloud run deploy coderevai \
  --image gcr.io/$PROJECT_ID/coderevai:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1 \
  --update-secrets \
NEXT_PUBLIC_GEMINI_API_KEY=GEMINI_API_KEY:latest,\
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=CLERK_PUBLISHABLE_KEY:latest,\
CLERK_SECRET_KEY=CLERK_SECRET_KEY:latest,\
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY:latest,\
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,\
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest
```

## Step 6: Set Up CI/CD with Cloud Build

### Configure Cloud Build Trigger

```bash
# Grant Cloud Build permissions
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

# Grant Cloud Run Admin role to Cloud Build
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Service Account User role
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Grant Secret Manager Secret Accessor role
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Connect to GitHub (Automated Deployments)

1. Go to https://console.cloud.google.com/cloud-build/triggers
2. Click "Connect Repository"
3. Select "GitHub" and authorize
4. Select your repository
5. Create a trigger:
   - **Name**: `deploy-to-production`
   - **Event**: Push to branch
   - **Branch**: `^main$` (or your production branch)
   - **Configuration**: Cloud Build configuration file
   - **Location**: `cloudbuild.yaml`

Now every push to `main` will automatically deploy!

## Step 7: Update Clerk Settings

After deployment, update your Clerk dashboard:

1. Go to https://dashboard.clerk.com/
2. Navigate to your application
3. Update **Authorized Origins**:
   - Add your Cloud Run URL (e.g., `https://coderevai-xyz.run.app`)
4. Update **Authorized Redirect URLs**:
   - Add `https://your-cloud-run-url/sign-in`
   - Add `https://your-cloud-run-url/sign-up`

## Step 8: Configure Custom Domain (Optional)

```bash
# Map a custom domain to your Cloud Run service
gcloud run domain-mappings create \
  --service coderevai \
  --domain your-domain.com \
  --region us-central1

# Follow the instructions to update your DNS records
```

## Testing the Deployment

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe coderevai --region us-central1 --format='value(status.url)')

echo "Your app is running at: $SERVICE_URL"

# Test the endpoint
curl $SERVICE_URL
```

## Monitoring and Logs

```bash
# View logs
gcloud run services logs read coderevai --region us-central1

# View logs in real-time
gcloud run services logs tail coderevai --region us-central1

# Open Cloud Console
gcloud run services describe coderevai --region us-central1
```

## Updating the Application

### Manual Update
```bash
# Simply redeploy
gcloud run deploy coderevai --source . --region us-central1
```

### Automatic Update (with Cloud Build trigger)
```bash
# Just push to your main branch
git add .
git commit -m "Update application"
git push origin main
```

## Cost Optimization

Cloud Run pricing is based on:
- CPU and memory usage (only while processing requests)
- Number of requests
- Network egress

### Tips to Reduce Costs:

1. **Set min-instances to 0** (already configured)
   - Service scales to zero when not in use
   
2. **Use appropriate memory/CPU**
   - Start with 512Mi memory and 1 CPU
   - Monitor and adjust based on usage

3. **Enable request timeout**
   - Already set to 300 seconds
   
4. **Set max instances**
   - Prevents runaway costs
   - Currently set to 10

### Monitor Costs
```bash
# View billing
gcloud billing accounts list
```

## Troubleshooting

### Container fails to start
```bash
# Check logs
gcloud run services logs read coderevai --region us-central1 --limit 50

# Common issues:
# - Missing environment variables
# - Port not set correctly (should be 3000 or use PORT env var)
# - Build failed
```

### Secrets not accessible
```bash
# Verify secret exists
gcloud secrets describe GEMINI_API_KEY

# Check IAM permissions
gcloud secrets get-iam-policy GEMINI_API_KEY
```

### Deployment timeout
```bash
# Increase Cloud Build timeout in cloudbuild.yaml
# Or use --timeout flag:
gcloud run deploy coderevai --timeout 600
```

## Rollback

```bash
# List revisions
gcloud run revisions list --service coderevai --region us-central1

# Rollback to previous revision
gcloud run services update-traffic coderevai \
  --to-revisions REVISION_NAME=100 \
  --region us-central1
```

## Security Best Practices

1. ✅ Use Secret Manager for all sensitive data
2. ✅ Run as non-root user (configured in Dockerfile)
3. ✅ Use multi-stage Docker builds
4. ✅ Enable HTTPS (automatic on Cloud Run)
5. ✅ Implement authentication (Clerk)
6. ✅ Verify webhook signatures (Stripe)
7. 🔒 Consider enabling Cloud Armor for DDoS protection
8. 🔒 Set up VPC connector if accessing private resources
9. 🔒 Enable Binary Authorization for container security

## Next Steps

1. ✅ Deploy to production
2. 📊 Set up monitoring and alerts in Cloud Console
3. 🔔 Configure uptime checks
4. 📧 Set up notification channels
5. 🌐 Add custom domain
6. 🔒 Enable Cloud CDN for better performance
7. 📈 Set up Cloud Trace for performance monitoring
8. 💾 Consider Cloud SQL if you add a database

## Useful Commands Cheat Sheet

```bash
# View service details
gcloud run services describe coderevai --region us-central1

# Update environment variables
gcloud run services update coderevai \
  --set-env-vars KEY=VALUE \
  --region us-central1

# Update secrets
gcloud run services update coderevai \
  --update-secrets SECRET_NAME=SECRET_ID:latest \
  --region us-central1

# Delete service
gcloud run services delete coderevai --region us-central1

# List all services
gcloud run services list

# View service URL
gcloud run services describe coderevai \
  --region us-central1 \
  --format='value(status.url)'
```

## Resources

- Cloud Run Documentation: https://cloud.google.com/run/docs
- Cloud Build Documentation: https://cloud.google.com/build/docs
- Secret Manager: https://cloud.google.com/secret-manager/docs
- Next.js on Cloud Run: https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service
- Pricing Calculator: https://cloud.google.com/products/calculator

---

**Need Help?**
- Cloud Run Community: https://stackoverflow.com/questions/tagged/google-cloud-run
- Google Cloud Support: https://cloud.google.com/support
