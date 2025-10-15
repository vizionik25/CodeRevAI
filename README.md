<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# [CodeRevAI] - Next.js App

A powerful AI-powered code review application built with Next.js, featuring user authentication via Clerk and AI analysis powered by Google Gemini.

## Features

- 🤖 AI-powered code review using Google Gemini
- 🔐 User authentication with Clerk
- � Stripe payment integration for subscriptions
- �📁 Support for GitHub repositories and local files
- 🎨 Modern UI with Tailwind CSS
- 📊 Code diff viewer
- 📝 Review history tracking
- 🌙 Dark mode UI
- ☁️ Cloud Run ready for production deployment

## Run Locally

**Prerequisites:** Node.js 18+ and npm

### 1. Install dependencies:
```bash
npm install
```

### 2. Set up environment variables:

Create or update `.env.local` with the following:

```bash
# Gemini API Key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Clerk Authentication Keys
# Get these from https://dashboard.clerk.com/
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# Stripe Payment Keys (Optional - for payment processing)
# Get these from https://dashboard.stripe.com/
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
```

#### Getting API Keys:

**Clerk Authentication:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application or select an existing one
3. Go to "API Keys" in the sidebar
4. Copy the "Publishable key" and "Secret key"
5. Paste them into your `.env.local` file

**Stripe Payments (Optional):**
See [STRIPE_SETUP.md](./STRIPE_SETUP.md) for detailed setup instructions.

### 3. Run the development server:
```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Deployment

### Quick Deploy to Google Cloud Run

```bash
# 1. Set up secrets
./setup-secrets.sh

# 2. Deploy
./deploy.sh
```

For detailed deployment instructions, see:
- **Quick Start:** [QUICKSTART.md](./QUICKSTART.md) - Deploy in 3 steps
- **Full Guide:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Complete deployment documentation

### Other Platforms

This app can also be deployed to:
- Vercel
- Netlify
- AWS (ECS, Lambda)
- Azure Container Apps
- Any Node.js hosting service

Make sure to set the environment variables in your deployment platform's settings.

## Documentation

- 📖 [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Complete Google Cloud Run deployment guide
- 🚀 [Quick Start](./QUICKSTART.md) - Deploy in 3 steps
- 💳 [Stripe Setup](./STRIPE_SETUP.md) - Payment integration guide
- 🔐 [Security](./SECURITY.md) - Security best practices and guidelines

## Security

⚠️ **IMPORTANT:** Never commit sensitive files!

```bash
# Run security check before committing
./check-security.sh
```

### Protected Files (gitignored)
- ✅ `.env.local` - All API keys and secrets
- ✅ `*.key`, `*.pem` - Private keys and certificates
- ✅ Service account credentials

### Safe to Commit
- ✅ `.env.example` - Template without real secrets

See [SECURITY.md](./SECURITY.md) for complete guidelines.

## Tech Stack

- **Framework:** Next.js 15
- **Authentication:** Clerk
- **Payments:** Stripe
- **AI:** Google Gemini API
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Deployment:** Google Cloud Run (Docker)
