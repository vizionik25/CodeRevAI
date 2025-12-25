# CodeRevAI 🤖

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Deployed on Cloud Run](https://img.shields.io/badge/Deployed-Cloud%20Run-blue)](https://cloud.google.com/run)

**Production-ready AI-powered code review platform** with enterprise-grade error handling, observability, and security features. Built with Next.js 15, Google Gemini AI, and deployed on Vercel with options to deploy to Google Cloud Run.

🌐 **Live Demo:** [https://coderevai.vizionikmedia.com](https://coderevai.vizionikmedia.com)

---

⭐️ Try it or self-host

- Prefer to run locally or fork? This repo is designed to be easy to self-host — follow the step-by-step in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) (or `DEPLOYMENT.md`) to get a running instance. If you find this project useful, please consider starring the repo to help it reach more developers:

[![GitHub stars](https://img.shields.io/github/stars/vizionik25/CodeRevAI?style=social)](https://github.com/vizionik25/CodeRevAI)


## ✨ Features

### Core Functionality
- 🤖 **AI-Powered Reviews** - Comprehensive code analysis using Google Gemini 2.5 Flash
- 📁 **Multiple Input Methods**
  - GitHub repository integration (public repos)
  - Local file upload with directory support
  - Direct code paste interface
- 🎯 **Specialized Review Modes**
  - Comprehensive Analysis
  - Security-Focused Review
  - Performance Optimization
  - Code Smells Detection
  - Best Practices Validation
  - Accessibility Compliance
  - Error Handling Review
  - Naming Conventions Check

### Production Features
- 🔐 **Enterprise Authentication** - Clerk integration with role-based access
- 💳 **Payment Processing** - Stripe subscriptions with webhook handling
- 📊 **Comprehensive Observability**
  - Request ID tracing across all operations
  - Performance timing metrics (AI calls, total duration)
  - Structured logging with metadata
  - Circuit breaker pattern for Redis
- 🛡️ **Security**
  - Input sanitization and validation
  - Rate limiting with fail-closed strategy
  - AI prompt injection protection
  - CORS and security headers
- 💾 **Database Integration** - PostgreSQL with Prisma ORM
- ⚡ **Caching & Performance** - Redis-backed rate limiting with circuit breaker
- 📝 **Review History** - Persistent storage with retrieval and re-review capabilities

### Developer Experience
- 🎨 **Modern UI** - Tailwind CSS with dark mode
- 📱 **Responsive Design** - Works on mobile, tablet, and desktop
- ♿ **Accessibility** - ARIA labels and keyboard navigation
- 🔄 **Real-time Feedback** - Loading states and progress indicators
- 📋 **Copy & Export** - Easy sharing of review results

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                        │
│  ┌────────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Dashboard    │  │   Billing   │  │  Auth (Clerk)   │  │
│  └────────────────┘  └─────────────┘  └─────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │   Middleware       │
                  │ - Request ID Gen   │
                  │ - Auth Protection  │
                  └─────────┬─────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    API Routes (Next.js)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  review  │  │  history │  │  stripe  │  │subscription │ │
│  │  -code   │  │          │  │ webhooks │  │             │ │
│  │  -repo   │  │          │  │          │  │             │ │
│  │  -diff   │  │          │  │          │  │             │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
└───────┼────────────┼─────────────┼────────────────┼────────┘
        │            │             │                │
   ┌────▼─────┐ ┌───▼────┐   ┌────▼─────┐    ┌────▼─────┐
   │  Gemini  │ │Prisma  │   │  Stripe  │    │  Redis   │
   │    AI    │ │   ORM  │   │   API    │    │  Cache   │
   └──────────┘ └───┬────┘   └──────────┘    └──────────┘
                    │
              ┌─────▼─────┐
              │PostgreSQL │
              │ Database  │
              └───────────┘
```

### Key Components

**Client Layer:**
- `app/dashboard/page.tsx` - Main review interface
- `app/services/client*Service.ts` - API client wrappers with AppError propagation
- `app/components/` - Reusable UI components

**API Layer:**
- `app/api/review-*/route.ts` - Code review endpoints
- `app/api/history/route.ts` - Review history CRUD
- `app/api/webhooks/stripe/route.ts` - Payment webhooks

**Service Layer:**
- `app/utils/apiClients.ts` - Singleton clients (Gemini, Stripe)
- `app/utils/redis.ts` - Rate limiting with circuit breaker
- `app/lib/prisma.ts` - Database client

**Infrastructure:**
- `middleware.ts` - Request ID generation, auth protection
- `app/config/env.ts` - Centralized environment configuration
- `app/types/errors.ts` - Standardized error handling

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ and npm
- **PostgreSQL** database (local or cloud)
- **Redis** instance (Upstash recommended)
- **API Keys** for:
  - Google Gemini AI
  - Clerk (authentication)
  - Stripe (optional, for payments)

### 1. Clone and Install

```bash
git clone https://github.com/vizionik25/CodeRevAI.git
cd CodeRevAI
npm install
```

### 2. Environment Setup

Create `.env.local`:

```bash
# === AI Service ===
GEMINI_API_KEY=your_gemini_api_key

# === Authentication (Clerk) ===
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# === Payment Processing (Stripe) ===
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_xxx

# === Database (PostgreSQL) ===
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# === Cache & Rate Limiting (Redis/Upstash) ===
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

Create `.env` (for Prisma CLI):

```bash
# Copy the same DATABASE_URL and Redis credentials
DATABASE_URL="postgresql://user:password@host:5432/dbname"
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📦 Environment Variables

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GEMINI_API_KEY` | Google AI API key | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key | [Clerk Dashboard](https://dashboard.clerk.com/) → API Keys |
| `CLERK_SECRET_KEY` | Clerk secret key | [Clerk Dashboard](https://dashboard.clerk.com/) → API Keys |
| `DATABASE_URL` | PostgreSQL connection string | Your PostgreSQL instance |
| `UPSTASH_REDIS_REST_URL` | Redis REST URL | [Upstash Console](https://console.upstash.com/) |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth token | [Upstash Console](https://console.upstash.com/) |

### Optional (Payment Features)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | [Stripe Dashboard](https://dashboard.stripe.com/) → Developers → API Keys |
| `STRIPE_SECRET_KEY` | Stripe secret key | [Stripe Dashboard](https://dashboard.stripe.com/) → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | [Stripe Dashboard](https://dashboard.stripe.com/) → Developers → Webhooks |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO` | Pro plan price ID | [Stripe Dashboard](https://dashboard.stripe.com/) → Products |

---

## 🐳 Deployment

### Google Cloud Run (Recommended)

**Prerequisites:**
- Google Cloud account with billing enabled
- gcloud CLI installed and configured

```bash
# 1. Upload secrets to Secret Manager
./scripts/setup-secrets.sh

# 2. Build and deploy
./scripts/deploy.sh
```

The app will be deployed to: `https://coderevai-{hash}.{region}.run.app`

### Other Platforms

The app is containerized and can deploy to:
- **Vercel** - Native Next.js support, add environment variables in dashboard
- **AWS ECS/Fargate** - Use the included Dockerfile
- **Azure Container Apps** - Deploy container with secrets
- **Railway/Render** - One-click deploy with environment setup

---

## 🧪 Testing

```bash
# Type checking
npx tsc --noEmit

# Build verification
npm run build

# Security check (ensures no secrets in code)
./scripts/check-security.sh

# Redis connection test
node scripts/test-redis.js
```

---

## 📖 Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System design and architecture diagrams
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Detailed deployment guide
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Development guidelines and setup
- **[IMPLEMENTATION_STATUS.md](./docs/IMPLEMENTATION_STATUS.md)** - Development progress tracker
- **[docs/STRIPE_INTEGRATION.md](./docs/STRIPE_INTEGRATION.md)** - Payment setup guide

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15.5 (App Router)
- **Language:** TypeScript 5.8
- **Styling:** Tailwind CSS v4
- **UI Components:** Custom React components
- **State Management:** React hooks

### Backend
- **Runtime:** Node.js 20 (Alpine)
- **API:** Next.js API Routes
- **Authentication:** Clerk
- **Database:** PostgreSQL + Prisma ORM
- **Cache:** Redis (Upstash)
- **AI:** Google Gemini 2.5 Flash
- **Payments:** Stripe

### DevOps & Infrastructure
- **Hosting:** Google Cloud Run
- **CI/CD:** Google Cloud Build
- **Secrets:** Google Secret Manager
- **Monitoring:** Structured logging with request tracing
- **Container:** Docker (multi-stage build)

---

## 🏗️ Project Structure

```
CodeRevAI/
├── app/
│   ├── api/                    # API routes
│   │   ├── review-code/        # Code review endpoint
│   │   ├── review-repo/        # Repository review endpoint
│   │   ├── generate-diff/      # Code generation endpoint
│   │   ├── history/            # Review history CRUD
│   │   ├── subscription/       # User subscription status
│   │   └── webhooks/stripe/    # Stripe webhook handler
│   ├── components/             # React components
│   ├── config/                 # Configuration
│   │   └── env.ts             # Centralized env variables
│   ├── data/                   # Constants and prompts
│   ├── lib/                    # Third-party lib configs
│   │   └── prisma.ts          # Prisma singleton
│   ├── services/               # Service layer
│   │   ├── clientGeminiService.ts
│   │   ├── clientHistoryService.ts
│   │   └── githubService.ts
│   ├── types/                  # TypeScript types
│   │   ├── errors.ts          # Error handling types
│   │   └── index.ts           # Shared types
│   └── utils/                  # Utility functions
│       ├── apiClients.ts      # AI & payment clients
│       ├── logger.ts          # Structured logging
│       ├── redis.ts           # Rate limiting + circuit breaker
│       └── security.ts        # Input validation
├── prisma/
│   └── schema.prisma          # Database schema
├── scripts/                    # Deployment scripts
├── middleware.ts               # Request middleware
└── next.config.js             # Next.js configuration
```

---

## 🔒 Security Features

### Input Validation
- Sanitization of all user inputs
- Code size limits (100KB per file, 200KB per repo)
- AI prompt injection protection
- URL and repository validation

### Rate Limiting
- **Fail-closed strategy** for cost-sensitive AI operations
- Circuit breaker pattern (5 failures → open, 60s recovery)
- Per-user limits:
  - Code reviews: 20/minute
  - Repository reviews: 5/minute
  - Code generation: 15/minute

### Authentication & Authorization
- Clerk-based JWT authentication
- Protected API routes via middleware
- Subscription-based feature access
- Webhook signature verification

### Error Handling
- Standardized `AppError` class with error codes
- No sensitive data in error responses
- Request ID tracing for debugging
- Graceful degradation

---

## 📊 Observability

### Request Tracing
Every request gets a unique ID (`req_{timestamp}_{random}`) propagated through:
- API route headers
- Logger output
- Error responses
- Performance metrics

### Metrics Logged
- **Performance:** AI duration, total request duration
- **AI Usage:** Model name, input/output sizes, user ID
- **Errors:** Stack traces, request context, retry attempts
- **Circuit Breaker:** State transitions, failure counts

### Example Log Output
```
[INFO] [req_1760932269_abc123] Code review request started { endpoint: '/api/review-code' }
[INFO] [req_1760932269_abc123] AI request completed { model: 'gemini-2.5-flash', aiDuration: '1243ms', feedbackLength: 2456, userId: 'user_xyz' }
[INFO] [req_1760932269_abc123] Request completed successfully { totalDuration: '1389ms', aiDuration: '1243ms' }
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Code style guidelines
- Commit message format
- Pull request process
- Testing requirements

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
   ```bash
   npm run build
   npx tsc --noEmit
   ./scripts/check-security.sh
   ```
5. **Commit with descriptive message**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
6. **Push and create PR**
   ```bash
   git push origin feature/amazing-feature
   ```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Google Gemini](https://ai.google.dev/) - AI model
- [Clerk](https://clerk.com/) - Authentication
- [Stripe](https://stripe.com/) - Payments
- [Prisma](https://www.prisma.io/) - Database ORM
- [Upstash](https://upstash.com/) - Serverless Redis
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

## 📬 Contact & Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/vizionik25/CodeRevAI/issues)
- **Author:** [vizionik25](https://github.com/vizionik25)

---

**Made with ❤️ and AI**
