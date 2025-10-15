# Google Cloud Run Deployment Guide

## Prerequisites ✅

Before deploying, ensure you have:

1. **Google Cloud CLI installed and authenticated**
   ```bash
   gcloud --version
   gcloud auth login
   ```

2. **Project configured**
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Required APIs enabled**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

4. **`.env.local` file with all your API keys**
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO`

---

## Deployment Steps 🚀

### Step 1: Configure Secrets in Secret Manager

Run the setup script to upload all your secrets:

```bash
./setup-secrets.sh
```

This will:
- Create secrets in Google Cloud Secret Manager
- Update existing secrets if they already exist
- Verify all required secrets are configured

**Verify secrets were created:**
```bash
gcloud secrets list
```

---

### Step 2: Deploy to Cloud Run

**Option A: Deploy using the deploy script (Recommended)**

```bash
./deploy.sh
```

This script will:
- Build your Docker image using Cloud Build
- Deploy to Cloud Run with all environment variables
- Output your live URL

**Option B: Manual deployment with gcloud**

```bash
gcloud run deploy coderevai \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --update-secrets \
    GEMINI_API_KEY=GEMINI_API_KEY:latest,\
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=CLERK_PUBLISHABLE_KEY:latest,\
    CLERK_SECRET_KEY=CLERK_SECRET_KEY:latest,\
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY:latest,\
    NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=STRIPE_PRICE_ID_PRO:latest,\
    STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,\
    STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest
```

---

### Step 3: Post-Deployment Configuration

After deployment, you'll receive a URL like: `https://coderevai-xxxxx-uc.a.run.app`

#### Update Clerk Settings
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Navigate to **API Keys** → **Domains**
3. Add your Cloud Run URL to **Allowed Origins**

#### Update Stripe Webhook
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **Webhooks**
3. Add webhook endpoint: `https://your-app-url.run.app/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret
6. Update the secret in Secret Manager:
   ```bash
   echo -n "whsec_your_new_webhook_secret" | \
     gcloud secrets versions add STRIPE_WEBHOOK_SECRET --data-file=-
   ```

---

## Testing Your Deployment 🧪

1. **Health Check**
   ```bash
   curl https://your-app-url.run.app
   ```

2. **View Logs**
   ```bash
   gcloud run services logs read coderevai --region us-central1 --limit 50
   ```

3. **Monitor in Real-time**
   ```bash
   gcloud run services logs tail coderevai --region us-central1
   ```

---

## Troubleshooting 🔧

### Build Fails with "Missing publishableKey"
- **Solution**: Ensure secrets are created in Secret Manager and referenced correctly in `cloudbuild.yaml`

### API Key Not Working
- **Solution**: Check that secrets are properly mounted:
  ```bash
  gcloud secrets versions access latest --secret=GEMINI_API_KEY
  ```

### Rate Limiting Issues
- **Solution**: Increase memory/CPU:
  ```bash
  gcloud run services update coderevai --memory 1Gi --cpu 2 --region us-central1
  ```

### Cold Start Latency
- **Solution**: Set minimum instances:
  ```bash
  gcloud run services update coderevai --min-instances 1 --region us-central1
  ```

---

## Updating Your Deployment 🔄

To deploy updates:

```bash
# Pull latest changes
git pull origin main

# Rebuild and redeploy
./deploy.sh
```

Or use Cloud Build triggers for automatic deployment on git push.

---

## Cost Optimization 💰

- **Free Tier**: Cloud Run includes 2 million requests/month free
- **Set max instances**: Prevents runaway costs
  ```bash
  gcloud run services update coderevai --max-instances 10 --region us-central1
  ```
- **Monitor usage**: Check Cloud Console → Billing

---

## Security Checklist 🔐

- [x] All API keys in Secret Manager (not in code)
- [x] Server-side only Gemini API key (not `NEXT_PUBLIC_`)
- [x] Clerk authentication on all API routes
- [x] Rate limiting enabled
- [x] Input validation active
- [x] Sensitive files filtered
- [x] HTTPS enforced (automatic on Cloud Run)
- [ ] Set up Cloud Armor for DDoS protection (optional)
- [ ] Enable Cloud CDN (optional)

---

## Useful Commands 📝

```bash
# View service details
gcloud run services describe coderevai --region us-central1

# Update environment variable
gcloud run services update coderevai \
  --set-env-vars NEW_VAR=value \
  --region us-central1

# Scale to zero when idle
gcloud run services update coderevai --min-instances 0 --region us-central1

# Delete service
gcloud run services delete coderevai --region us-central1

# View all Cloud Run services
gcloud run services list
```

---

## CI/CD Setup (Optional) 🔄

For automatic deployments on git push:

1. **Connect GitHub repo to Cloud Build**
   ```bash
   gcloud builds triggers create github \
     --repo-name=CodeRevAI \
     --repo-owner=vizionik25 \
     --branch-pattern="^main$" \
     --build-config=cloudbuild.yaml
   ```

2. **Push changes will now automatically deploy**

---

## Support & Resources 📚

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Cloud Build Configuration](https://cloud.google.com/build/docs/configuring-builds/create-basic-configuration)
- [Secret Manager Guide](https://cloud.google.com/secret-manager/docs)

---

**Ready to deploy?** ✨

```bash
./setup-secrets.sh
./deploy.sh
```

Your app will be live in ~5-10 minutes!
