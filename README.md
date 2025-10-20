# [CodeRevAI] - Next.js App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)

A powerful AI-powered code review application built with Next.js, featuring user authentication via Clerk and AI analysis powered by Google Gemini.

---

## 📋 Sample Code Review Output

**Want to see what CodeRevAI can do?** We've included a comprehensive code review of this very codebase! The review demonstrates CodeRevAI's ability to perform deep architectural analysis, identify security vulnerabilities, suggest production-ready improvements, and provide actionable recommendations with specific file paths and line numbers. Click below to view the complete holistic review.

<details>
<summary><b>🔍 Click to preview the review highlights</b></summary>

<br>

> **Holistic Code Review: CodeRevAI**
> 
> ### Overall Architectural Strengths
> 
> The CodeRevAI application demonstrates a solid foundation with several commendable architectural decisions:
> 
> 1. **Clear Separation of Concerns:** Well-organized with distinct directories for API routes, UI components, data, services, and utilities
> 2. **Robust Authentication with Clerk:** Secure authentication layer protecting all sensitive API routes
> 3. **Comprehensive Input Validation:** Centralized validation and sanitization logic protecting against common vulnerabilities
> 4. **Stripe Webhook Security:** Proper signature verification for payment processing
> 5. **AI Prompt Engineering:** Structured prompts with clear instructions for consistent, actionable feedback
> 
> ### Security & Production Readiness
> 
> The review identifies critical improvements including:
> - Enhanced AI prompt injection protection
> - Sensitive file filtering for local uploads
> - Improved error handling consistency
> - Retry mechanisms for API resilience
> - Database integration recommendations
> 
> *...and much more detailed analysis with specific code examples and implementation suggestions.*

</details>

**[📄 View Full Review →](./REVIEW_SAMPLE.md)**

---

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
See [docs/STRIPE_INTEGRATION.md](./docs/STRIPE_INTEGRATION.md) for detailed setup instructions.

### 3. Run the development server:
```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Deployment

### Quick Deploy to Google Cloud Run

```bash
# 1. Set up secrets
./scripts/setup-secrets.sh

# 2. Deploy
./scripts/deploy.sh
```

For detailed deployment instructions, see:
- **Full Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment documentation
- **Quick Start:** [QUICKSTART.md](./QUICKSTART.md) - Deploy in 3 steps

### Other Platforms

This app can also be deployed to:
- Vercel
- Netlify
- AWS (ECS, Lambda)
- Azure Container Apps
- Any Node.js hosting service

Make sure to set the environment variables in your deployment platform's settings.

## Documentation

- 📖 [Deployment Guide](./DEPLOYMENT.md) - Complete Google Cloud Run deployment guide
- 🚀 [Quick Start](./QUICKSTART.md) - Deploy in 3 steps
- 💳 [Stripe Integration](./docs/STRIPE_INTEGRATION.md) - Payment integration guide

## Security

⚠️ **IMPORTANT:** Never commit sensitive files!

```bash
# Run security check before committing
./scripts/check-security.sh
```


## Tech Stack

- **Framework:** Next.js 15
- **Authentication:** Clerk
- **Payments:** Stripe
- **AI:** Google Gemini API
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Deployment:** Google Cloud Run (Docker)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Clerk](https://clerk.com/) - Authentication
- [Stripe](https://stripe.com/) - Payment processing
- [Google Gemini](https://ai.google.dev/) - AI-powered code analysis
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

**Made with ❤️ by [vizionik25](https://github.com/vizionik25)**
