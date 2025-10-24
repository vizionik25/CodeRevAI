# Deployment Guide - Google Cloud Run# Google Cloud Run Deployment Guide



Complete guide to deploying CodeRevAI to Google Cloud Run with automated CI/CD.## Prerequisites ✅



---Before deploying, ensure you have:



## Quick Start 🚀1. **Google Cloud CLI installed and authenticated**

   ```bash

**For the impatient:**   gcloud --version

   gcloud auth login

```bash   ```

# 1. Setup secrets

./scripts/setup-secrets.sh2. **Project configured**

   ```bash

# 2. Deploy   gcloud config set project YOUR_PROJECT_ID

./scripts/deploy.sh   ```

```

3. **Required APIs enabled**

Your app will be live in ~5-10 minutes at `https://coderevai-xxxxx.run.app`   ```bash

   gcloud services enable run.googleapis.com

---   gcloud services enable cloudbuild.googleapis.com

   gcloud services enable secretmanager.googleapis.com

## Table of Contents   gcloud services enable containerregistry.googleapis.com

   ```

1. [Prerequisites](#prerequisites)

2. [Initial Setup](#initial-setup)4. **`.env.local` file with all your API keys**

3. [Secret Management](#secret-management)   - `GEMINI_API_KEY`

4. [Deployment Options](#deployment-options)   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

5. [Post-Deployment Configuration](#post-deployment-configuration)   - `CLERK_SECRET_KEY`

6. [CI/CD Setup](#cicd-setup-optional)   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

7. [Monitoring & Maintenance](#monitoring--maintenance)   - `STRIPE_SECRET_KEY`

8. [Troubleshooting](#troubleshooting)   - `STRIPE_WEBHOOK_SECRET`

9. [Cost Optimization](#cost-optimization)   - `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO`



------



## Prerequisites## Deployment Steps 🚀



### Required Tools### Step 1: Configure Secrets in Secret Manager



1. **Google Cloud CLI** (gcloud)Run the setup script to upload all your secrets:

   ```bash

   # Install from https://cloud.google.com/sdk/docs/install
   gcloud --version
   gcloud auth login

   ```

This will:

2. **Docker** (for local builds only)- Create secrets in Google Cloud Secret Manager

   ```bash- Update existing secrets if they already exist

   # Install from https://docs.docker.com/get-docker/- Verify all required secrets are configured

   docker --version

   ```**Verify secrets were created:**

```bash

### Required Accountsgcloud secrets list

```

- [x] Google Cloud account with billing enabled

- [x] Clerk account (authentication)---

- [x] Stripe account (payments)

- [x] Gemini API key (AI features)### Step 2: Deploy to Cloud Run



### Required Environment Variables**Option A: Deploy using the deploy script (Recommended)**



Create a `.env.local` file with your API keys, then run:

```bash
./scripts/deploy.sh
```

# AI Service

GEMINI_API_KEY=your_gemini_api_keyThis script will:

- Build your Docker image using Cloud Build

# Authentication (Clerk)- Deploy to Cloud Run with all environment variables

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...- Output your live URL

CLERK_SECRET_KEY=sk_test_...

**Option B: Manual deployment with gcloud**

# Payments (Stripe)

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...```bash

STRIPE_SECRET_KEY=sk_test_...gcloud run deploy coderevai \

STRIPE_WEBHOOK_SECRET=whsec_...  --source . \

NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_...  --region us-central1 \

```  --platform managed \

  --allow-unauthenticated \

---  --update-secrets \

    GEMINI_API_KEY=GEMINI_API_KEY:latest,\

## Initial Setup    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=CLERK_PUBLISHABLE_KEY:latest,\

    CLERK_SECRET_KEY=CLERK_SECRET_KEY:latest,\

### Step 1: Configure Google Cloud Project    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY:latest,\

    NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=STRIPE_PRICE_ID_PRO:latest,\

```bash    STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,\

# Login to Google Cloud    STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest

gcloud auth login```



# Create or select a project---

gcloud projects create coderevai-prod --name="CodeRevAI Production"

# OR use existing project### Step 3: Post-Deployment Configuration

gcloud config set project YOUR_PROJECT_ID

After deployment, you'll receive a URL like: `https://coderevai-xxxxx-uc.a.run.app`

# Verify project is set

gcloud config get-value project#### Update Clerk Settings

```1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)

2. Navigate to **API Keys** → **Domains**

### Step 2: Enable Required APIs3. Add your Cloud Run URL to **Allowed Origins**



```bash#### Update Stripe Webhook

# Enable all required APIs at once1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)

gcloud services enable \2. Navigate to **Developers** → **Webhooks**

  run.googleapis.com \3. Add webhook endpoint: `https://your-app-url.run.app/api/webhooks/stripe`

  cloudbuild.googleapis.com \4. Select events:

  secretmanager.googleapis.com \   - `checkout.session.completed`

  containerregistry.googleapis.com   - `customer.subscription.created`

   - `customer.subscription.updated`

# Verify APIs are enabled   - `customer.subscription.deleted`

gcloud services list --enabled   - `invoice.payment_succeeded`

```   - `invoice.payment_failed`

5. Copy the webhook signing secret

---6. Update the secret in Secret Manager:

   ```bash

## Secret Management   echo -n "whsec_your_new_webhook_secret" | \

     gcloud secrets versions add STRIPE_WEBHOOK_SECRET --data-file=-

### Option A: Using setup-secrets.sh Script (Recommended)   ```



```bash---

# Upload all secrets from .env.local automatically

./scripts/setup-secrets.sh## Testing Your Deployment 🧪

```

1. **Health Check**

This script will:   ```bash

- ✅ Read your `.env.local` file   curl https://your-app-url.run.app

- ✅ Create/update all secrets in Secret Manager   ```

- ✅ Verify successful upload

2. **View Logs**

### Option B: Manual Secret Creation   ```bash

   gcloud run services logs read coderevai --region us-central1 --limit 50

```bash   ```

# Create secrets one by one

echo -n "YOUR_API_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=-3. **Monitor in Real-time**

echo -n "pk_test_..." | gcloud secrets create CLERK_PUBLISHABLE_KEY --data-file=-   ```bash

echo -n "sk_test_..." | gcloud secrets create CLERK_SECRET_KEY --data-file=-   gcloud run services logs tail coderevai --region us-central1

echo -n "pk_test_..." | gcloud secrets create STRIPE_PUBLISHABLE_KEY --data-file=-   ```

echo -n "sk_test_..." | gcloud secrets create STRIPE_SECRET_KEY --data-file=-

echo -n "whsec_..." | gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=----

echo -n "price_..." | gcloud secrets create STRIPE_PRICE_ID_PRO --data-file=-

```## Troubleshooting 🔧



### Grant Access to Cloud Run### Build Fails with "Missing publishableKey"

- **Solution**: Ensure secrets are created in Secret Manager and referenced correctly in `cloudbuild.yaml`

```bash

# Get project number### API Key Not Working

PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')- **Solution**: Check that secrets are properly mounted:

  ```bash

# Grant access to all secrets  gcloud secrets versions access latest --secret=GEMINI_API_KEY

for SECRET in GEMINI_API_KEY CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY \  ```

              STRIPE_PUBLISHABLE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET \

              STRIPE_PRICE_ID_PRO; do### Rate Limiting Issues

  gcloud secrets add-iam-policy-binding $SECRET \- **Solution**: Increase memory/CPU:

    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \  ```bash

    --role="roles/secretmanager.secretAccessor"  gcloud run services update coderevai --memory 1Gi --cpu 2 --region us-central1

done  ```

```

### Cold Start Latency

### Verify Secrets- **Solution**: Set minimum instances:

  ```bash

```bash  gcloud run services update coderevai --min-instances 1 --region us-central1

# List all secrets  ```

gcloud secrets list

---

# Check a specific secret value (for debugging)

gcloud secrets versions access latest --secret=GEMINI_API_KEY## Updating Your Deployment 🔄

```

To deploy updates:

---

```bash

## Deployment Options# Pull latest changes

git pull origin main

### Option 1: Using deploy.sh Script (Recommended)

# Rebuild and redeploy

```bash
./scripts/deploy.sh
```

```

Or use Cloud Build triggers for automatic deployment on git push.

**What it does:**

1. Builds Docker image using Cloud Build---

2. Pushes to Google Container Registry

3. Deploys to Cloud Run with all secrets mounted## Cost Optimization 💰

4. Outputs your live URL

- **Free Tier**: Cloud Run includes 2 million requests/month free

### Option 2: Using deploy-local-build.sh (For Secret Access Issues)- **Set max instances**: Prevents runaway costs

  ```bash

If Cloud Build has trouble accessing secrets:  gcloud run services update coderevai --max-instances 10 --region us-central1

  ```

```bash- **Monitor usage**: Check Cloud Console → Billing

./scripts/deploy-local-build.sh

```---



**What it does:**## Security Checklist 🔐

1. Builds Docker image **locally** with environment variables from `.env.local`

2. Pushes to Google Container Registry- [x] All API keys in Secret Manager (not in code)

3. Deploys to Cloud Run- [x] Server-side only Gemini API key (not `NEXT_PUBLIC_`)

- [x] Clerk authentication on all API routes

### Option 3: Manual Deployment- [x] Rate limiting enabled

- [x] Input validation active

```bash- [x] Sensitive files filtered

PROJECT_ID=$(gcloud config get-value project)- [x] HTTPS enforced (automatic on Cloud Run)

- [ ] Set up Cloud Armor for DDoS protection (optional)

# Deploy directly from source (Cloud Build handles the build)- [ ] Enable Cloud CDN (optional)

gcloud run deploy coderevai \

  --source . \---

  --region us-central1 \

  --platform managed \## Useful Commands 📝

  --allow-unauthenticated \

  --set-env-vars NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1 \```bash

  --update-secrets \# View service details

    GEMINI_API_KEY=GEMINI_API_KEY:latest,\gcloud run services describe coderevai --region us-central1

    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=CLERK_PUBLISHABLE_KEY:latest,\

    CLERK_SECRET_KEY=CLERK_SECRET_KEY:latest,\# Update environment variable

    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY:latest,\gcloud run services update coderevai \

    NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=STRIPE_PRICE_ID_PRO:latest,\  --set-env-vars NEW_VAR=value \

    STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,\  --region us-central1

    STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest \

  --max-instances 10 \# Scale to zero when idle

  --min-instances 0 \gcloud run services update coderevai --min-instances 0 --region us-central1

  --memory 512Mi \

  --cpu 1 \# Delete service

  --timeout 300gcloud run services delete coderevai --region us-central1

```

# View all Cloud Run services

---gcloud run services list

```

## Post-Deployment Configuration

---

After successful deployment, you'll receive a URL like: `https://coderevai-xxxxx-uc.a.run.app`

## CI/CD Setup (Optional) 🔄

### 1. Update Clerk Settings

For automatic deployments on git push:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)

2. Navigate to **API Keys** → **Domains**1. **Connect GitHub repo to Cloud Build**

3. Add your Cloud Run URL to **Allowed Origins**   ```bash

4. Update **Authorized Redirect URLs**:   gcloud builds triggers create github \

   - `https://your-cloud-run-url/sign-in`     --repo-name=CodeRevAI \

   - `https://your-cloud-run-url/sign-up`     --repo-owner=vizionik25 \

     --branch-pattern="^main$" \

### 2. Update Stripe Webhook     --build-config=cloudbuild.yaml

   ```

See **[STRIPE.md](./STRIPE.md)** for complete Stripe webhook setup.

2. **Push changes will now automatically deploy**

Quick steps:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → **Developers** → **Webhooks**---

2. Add webhook endpoint: `https://your-app-url.run.app/api/webhooks/stripe`

3. Select required events (checkout.session.completed, customer.subscription.*, invoice.payment.*)## Support & Resources 📚

4. Copy webhook signing secret

5. Update secret in Secret Manager:- [Cloud Run Documentation](https://cloud.google.com/run/docs)

   ```bash- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)

   echo -n "whsec_new_secret" | gcloud secrets versions add STRIPE_WEBHOOK_SECRET --data-file=-- [Cloud Build Configuration](https://cloud.google.com/build/docs/configuring-builds/create-basic-configuration)

   ./scripts/deploy.sh  # Redeploy to pick up new secret- [Secret Manager Guide](https://cloud.google.com/secret-manager/docs)

   ```

---

### 3. Test Your Deployment

**Ready to deploy?** ✨

```bash

# Get service URL
SERVICE_URL=$(gcloud run services describe coderevai --region us-central1 --format='value(status.url)')
echo "Your app: $SERVICE_URL"

```

# Test homepage

curl $SERVICE_URLYour app will be live in ~5-10 minutes!


# Check HTTP status
curl -I $SERVICE_URL
```

---

## CI/CD Setup (Optional)

### Automatic Deployments on Git Push

#### 1. Grant Cloud Build Permissions

```bash
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

# Grant Cloud Run Admin role
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Service Account User role
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Grant Secret Manager access
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### 2. Create Build Trigger

**Via Console (Easiest):**
1. Go to https://console.cloud.google.com/cloud-build/triggers
2. Click "Connect Repository" → Select GitHub
3. Authorize and select your repository
4. Create trigger:
   - **Name**: `deploy-to-production`
   - **Event**: Push to branch
   - **Branch**: `^main$`
   - **Configuration**: Cloud Build configuration file (`cloudbuild.yaml`)

**Via CLI:**
```bash
gcloud builds triggers create github \
  --repo-name=CodeRevAI \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

Now every push to `main` will automatically deploy! 🎉

---

## Monitoring & Maintenance

### View Logs

```bash
# View recent logs
gcloud run services logs read coderevai --region us-central1 --limit 50

# Stream logs in real-time
gcloud run services logs tail coderevai --region us-central1

# Filter by severity
gcloud run services logs read coderevai --region us-central1 --log-filter="severity>=ERROR"
```

### View Service Details

```bash
# Get all service information
gcloud run services describe coderevai --region us-central1

# Get just the URL
gcloud run services describe coderevai --region us-central1 --format='value(status.url)'

# List all revisions
gcloud run revisions list --service coderevai --region us-central1
```

### Update Configuration

```bash
# Update environment variable
gcloud run services update coderevai \
  --set-env-vars NEW_VAR=value \
  --region us-central1

# Update secret
gcloud run services update coderevai \
  --update-secrets SECRET_NAME=SECRET_ID:latest \
  --region us-central1

# Update resources
gcloud run services update coderevai \
  --memory 1Gi \
  --cpu 2 \
  --region us-central1
```

### Rollback to Previous Version

```bash
# List revisions
gcloud run revisions list --service coderevai --region us-central1

# Rollback to specific revision
gcloud run services update-traffic coderevai \
  --to-revisions REVISION_NAME=100 \
  --region us-central1
```

---

## Troubleshooting

### Build Fails with "Missing publishableKey"

**Problem:** Clerk can't find publishable key during build

**Solution:**
- Ensure `CLERK_PUBLISHABLE_KEY` secret exists in Secret Manager
- Verify Cloud Build service account has access to secrets
- Use `deploy-local-build.sh` as workaround

### "Permission Denied" on Secret Access

**Problem:** Cloud Run can't access secrets

**Solution:**
```bash
# Grant access to Cloud Run service account
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Container Fails to Start

**Solution:**
```bash
# Check logs for errors
gcloud run services logs read coderevai --region us-central1 --limit 50

# Common issues:
# - Port mismatch (should be 3000 or use PORT env var)
# - Missing environment variables
# - Build errors
```

### Cold Start Latency

**Problem:** First request takes too long

**Solution:**
```bash
# Set minimum instances (keeps 1 instance always warm)
gcloud run services update coderevai \
  --min-instances 1 \
  --region us-central1

# Note: This will increase costs slightly
```

### Rate Limiting Not Working

**Problem:** Users bypassing rate limits

**Solution:**
- Implement distributed rate limiting with Redis (see Phase 5 of IMPLEMENTATION_PLAN.md)
- Current in-memory rate limiting doesn't work across multiple instances

### Deployment Timeout

**Solution:**
```bash
# Increase Cloud Build timeout
gcloud run deploy coderevai \
  --source . \
  --timeout 600 \
  --region us-central1
```

---

## Cost Optimization

### Understanding Cloud Run Pricing

Cloud Run charges for:
- **CPU and memory** (only during request processing)
- **Number of requests**
- **Network egress**

**Free Tier:** 2 million requests/month free

### Optimization Tips

#### 1. Scale to Zero (Default)
```bash
# Ensure min-instances is 0 (no cost when idle)
gcloud run services update coderevai \
  --min-instances 0 \
  --region us-central1
```

#### 2. Set Maximum Instances
```bash
# Prevent runaway costs
gcloud run services update coderevai \
  --max-instances 10 \
  --region us-central1
```

#### 3. Right-Size Resources
```bash
# Start with minimum, increase if needed
gcloud run services update coderevai \
  --memory 512Mi \
  --cpu 1 \
  --region us-central1
```

#### 4. Monitor Usage
- Go to Google Cloud Console → Billing
- Set up budget alerts
- Review Cloud Run metrics

### Estimated Costs

For a typical deployment:
- **Low traffic** (< 100k requests/month): ~$0-5/month
- **Medium traffic** (500k requests/month): ~$10-25/month
- **High traffic** (2M requests/month): ~$50-100/month

*Actual costs depend on request duration and memory usage*

---

## Security Checklist

### Before Production

- [x] All API keys stored in Secret Manager (not in code)
- [x] Gemini API key is server-side only (not `NEXT_PUBLIC_`)
- [x] Clerk authentication enabled on all API routes
- [x] Stripe webhook signature verification enabled
- [x] Rate limiting implemented (in-memory, upgrade to Redis for production)
- [x] Input validation active on all endpoints
- [x] Sensitive files filtered from AI submissions
- [x] HTTPS enforced (automatic on Cloud Run)

### Optional Enhancements

- [ ] Set up Cloud Armor for DDoS protection
- [ ] Enable Cloud CDN for global distribution
- [ ] Configure VPC connector for private resources
- [ ] Set up Binary Authorization for container security
- [ ] Implement distributed rate limiting with Redis
- [ ] Add database for audit logging

---

## Custom Domain Setup (Optional)

```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
  --service coderevai \
  --domain your-domain.com \
  --region us-central1

# Update your DNS records as instructed
# Usually add a CNAME or A record pointing to Google's servers
```

---

## Useful Commands Cheat Sheet

```bash
# Deploy
./scripts/deploy.sh

# View logs
gcloud run services logs tail coderevai --region us-central1

# Get service URL
gcloud run services describe coderevai --region us-central1 --format='value(status.url)'

# Update environment variable
gcloud run services update coderevai --set-env-vars KEY=VALUE --region us-central1

# Update secret
echo -n "new_value" | gcloud secrets versions add SECRET_NAME --data-file=-

# List all services
gcloud run services list

# Delete service
gcloud run services delete coderevai --region us-central1

# View all revisions
gcloud run revisions list --service coderevai --region us-central1
```

---

## Resources & Support

### Documentation
- [Cloud Run Docs](https://cloud.google.com/run/docs)
- [Cloud Build Docs](https://cloud.google.com/build/docs)
- [Secret Manager Docs](https://cloud.google.com/secret-manager/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Stripe Integration](./STRIPE.md)

### Community
- [Stack Overflow - google-cloud-run](https://stackoverflow.com/questions/tagged/google-cloud-run)
- [Google Cloud Community](https://cloud.google.com/community)
- [Google Cloud Support](https://cloud.google.com/support)

### Tools
- [Pricing Calculator](https://cloud.google.com/products/calculator)
- [Cloud Console](https://console.cloud.google.com/)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

---

## Next Steps After Deployment

1. ✅ **Test your app** - Visit your Cloud Run URL
2. 📊 **Set up monitoring** - Configure alerts in Cloud Console
3. 🔔 **Enable uptime checks** - Monitor availability
4. 📧 **Configure notifications** - Get alerted on issues
5. 🌐 **Add custom domain** - Use your own domain name
6. 🔒 **Review security** - Run `./scripts/check-security.sh`
7. 📈 **Optimize performance** - Use Cloud Trace
8. 💾 **Add database** - Implement Supabase/PostgreSQL (see Phase 4 of IMPLEMENTATION_PLAN.md)

---

**Ready to deploy?** ✨

```bash
./scripts/setup-secrets.sh
./scripts/deploy.sh
```

Your AI-powered code review platform will be live in minutes!
