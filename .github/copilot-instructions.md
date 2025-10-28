# CodeRevAI - AI Agent Instructions

## Architecture Overview

CodeRevAI is a Next.js 15 SaaS application that provides AI-powered code reviews using Google Gemini. The architecture follows a clear separation between client and server:

- **Frontend**: React components in `app/components/` handle UI state and user interactions
- **API Layer**: Next.js API routes in `app/api/` enforce authentication, rate limiting, and input validation before calling AI services
- **Services**: Isolated service modules (`app/services/`) for Gemini AI, GitHub integration, and data persistence
- **Data Flow**: Client → API Route → Security Validation → Rate Limit Check → Service Layer → External API

```instructions
# CodeRevAI — agent instructions (concise)

Overview
- Next.js 15 app that proxies AI calls (Google Gemini) through server API routes. Key dirs: `app/components/`, `app/api/`, `app/services/`, `app/utils/`, and `prisma/`.

Security & secrets
- AI keys are server-only (ENV: `GEMINI_API_KEY`). Do not add `NEXT_PUBLIC_` prefixes. See `app/services/clientGeminiService.ts` (client calls `/api/*` routes).
- Middleware in `middleware.ts` adds `X-Request-ID` and enforces Clerk auth for non-public routes. Keep webhooks (`/api/webhooks/stripe`) and `/api/health` public.

API patterns (copy these precisely)
- Auth: API routes call `auth()` from `@clerk/nextjs/server` and fail early if no `userId` (see `app/api/review-code/route.ts`).
- Rate limiting: use `checkRateLimitRedis()` in `app/utils/redis.ts`. Example: `await checkRateLimitRedis(`review-code:${userId}`, 20, 60000, true)`.
- Input validation: use `app/utils/security.ts` functions — `sanitizeInput()`, `sanitizeForAIPrompt()`, `validateCodeInput()`, `validateCustomPrompt()`, `validateLanguage()`.
- Prompt construction: prompts live in `app/data/prompts.ts`. Use the project's build pattern (see `buildPrompt` in `app/api/review-code/route.ts`) and wrap code in triple backticks with a language tag.

Database & infra
- Prisma singleton: `app/lib/prisma.ts` exports a single `prisma` client to avoid pool exhaustion. Migrations via `npx prisma migrate dev`.
- Redis for distributed rate-limits (Upstash in production). Tests/scripts: `scripts/test-redis.js`.

Client service conventions
- Client-side service wrappers (e.g., `app/services/clientGeminiService.ts`) must call local API routes and handle AppError / retry logic. Server-side services (in `app/services/`) perform the actual Gemini calls.

Files & examples to reference
- Auth + request-id: `middleware.ts`
- Input rules: `app/utils/security.ts`
- Review API: `app/api/review-code/route.ts` (shows auth → rate-limit → validation → prompt → Gemini call → logging)
- Gemini client wrapper (frontend): `app/services/clientGeminiService.ts`
- Prisma pattern: `app/lib/prisma.ts`
- Prompt templates: `app/data/prompts.ts`

Dev & run
- Local: `npm install` then `npm run dev` (Next dev server). Prisma CLI reads `.env`; Next reads `.env.local`. Keep both in sync for DATABASE_URL and Redis.
- Migrations: `npx prisma generate` then `npx prisma migrate dev --name <name>`.
- Deploy: `./scripts/setup-secrets.sh` then `./scripts/deploy.sh` (Cloud Run). Public NEXT_PUBLIC_* vars must be provided as build args in `cloudbuild.yaml`.

What to avoid
- Never place secrets in client code. Avoid in-memory rate limiting; use Redis helper. Don’t bypass Clerk `auth()` in API routes.

If anything is unclear, point me to the area you want expanded (prompts, rate-limits, webhooks, or deployment) and I will iterate.
```
npx prisma migrate dev  # Create and apply new migration
