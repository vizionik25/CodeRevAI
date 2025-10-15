# Quick Start: Deploy to Google Cloud Run

This is a quick reference guide. For detailed instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## Prerequisites

- Google Cloud account with billing enabled
- Google Cloud SDK installed (`gcloud` command)
- Your API keys ready (Gemini, Clerk, Stripe)

## Deploy in 3 Steps

### Step 1: Set Up Google Cloud Project

```bash
# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### Step 2: Configure Secrets

```bash
# Run the setup script
./setup-secrets.sh
```

This will prompt you for:
- Gemini API Key
- Clerk Publishable Key
- Clerk Secret Key
- Stripe Publishable Key
- Stripe Secret Key
- Stripe Webhook Secret (optional initially)

### Step 3: Deploy

```bash
# Deploy to Cloud Run
./deploy.sh
```

That's it! Your app will be deployed and you'll get a URL like:
`https://coderevai-xxxxxxxxx-uc.a.run.app`

## Post-Deployment Steps

### 1. Update Clerk Settings
- Go to https://dashboard.clerk.com/
- Add your Cloud Run URL to authorized origins
- Add redirect URLs

### 2. Update Stripe Webhook
- Go to https://dashboard.stripe.com/webhooks
- Add endpoint: `https://your-cloud-run-url/api/webhooks/stripe`
- Copy the webhook secret
- Update secret:
  ```bash
  echo -n "whsec_xxx" | gcloud secrets versions add STRIPE_WEBHOOK_SECRET --data-file=-
  ```
- Redeploy: `./deploy.sh`

### 3. Test Your Application
- Visit your Cloud Run URL
- Sign in with Clerk
- Try the code review features
- Test Stripe checkout

## Useful Commands

```bash
# View logs
gcloud run services logs tail coderevai --region us-central1

# View service details
gcloud run services describe coderevai --region us-central1

# Update a secret
echo -n "new_value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Redeploy
./deploy.sh
```

## Automated Deployments (Optional)

Set up CI/CD to auto-deploy on git push:

1. Go to https://console.cloud.google.com/cloud-build/triggers
2. Connect your GitHub repository
3. Create trigger on `main` branch
4. Use `cloudbuild.yaml` configuration

Now every push to `main` automatically deploys! 🚀

## Project Structure

```
.
├── Dockerfile              # Multi-stage Docker build
├── .dockerignore          # Files excluded from Docker build
├── .gcloudignore          # Files excluded from gcloud deploy
├── cloudbuild.yaml        # CI/CD configuration
├── next.config.js         # Next.js config (standalone output)
├── deploy.sh              # Quick deployment script
├── setup-secrets.sh       # Secrets configuration script
├── DEPLOYMENT_GUIDE.md    # Detailed deployment guide
└── README.md              # Project documentation
```

## Costs

Cloud Run pricing (pay only for what you use):
- Free tier: 2 million requests/month
- Typical cost for small app: $5-20/month
- Scales to zero when not in use (min-instances=0)

## Troubleshooting

### Build fails
```bash
# Check logs
gcloud builds log $(gcloud builds list --limit=1 --format='value(id)')
```

### Service fails to start
```bash
# Check service logs
gcloud run services logs read coderevai --region us-central1 --limit 50
```

### Secrets not working
```bash
# Verify secret exists
gcloud secrets describe GEMINI_API_KEY

# Check permissions
gcloud secrets get-iam-policy GEMINI_API_KEY
```

## Support

- 📖 Full Guide: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- 💳 Stripe Setup: [STRIPE_SETUP.md](./STRIPE_SETUP.md)
- 🐛 Issues: Check Cloud Run logs
- 💬 Help: https://cloud.google.com/run/docs

---

**Ready to deploy?** Run `./setup-secrets.sh` then `./deploy.sh`! 🚀
