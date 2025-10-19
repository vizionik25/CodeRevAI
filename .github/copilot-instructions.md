# CodeRevAI - AI Agent Instructions

## Architecture Overview

CodeRevAI is a Next.js 15 SaaS application that provides AI-powered code reviews using Google Gemini. The architecture follows a clear separation between client and server:

- **Frontend**: React components in `app/components/` handle UI state and user interactions
- **API Layer**: Next.js API routes in `app/api/` enforce authentication, rate limiting, and input validation before calling AI services
- **Services**: Isolated service modules (`app/services/`) for Gemini AI, GitHub integration, and data persistence
- **Data Flow**: Client → API Route → Security Validation → Rate Limit Check → Service Layer → External API

### Critical Security Pattern

**All AI API keys MUST remain server-side only.** The `GEMINI_API_KEY` is NEVER prefixed with `NEXT_PUBLIC_`. Client-side code in `app/services/geminiService.ts` proxies requests through API routes (`/api/review-code`, `/api/review-repo`, `/api/generate-diff`) which handle authentication and security.

## Key Integration Points

### Authentication Flow (Clerk)
- Middleware in `middleware.ts` protects all routes except `/`, `/sign-in`, `/sign-up`
- API routes use `auth()` from `@clerk/nextjs/server` to get `userId`
- User metadata stores subscription plan: `publicMetadata.plan` = `'free'` or `'pro'`
- Always check authentication first in API routes before any processing

### Rate Limiting (Redis/Upstash)
- Use `checkRateLimitRedis()` from `app/utils/redis.ts` for distributed rate limiting
- Pattern: `await checkRateLimitRedis(\`endpoint:${userId}\`, limit, windowMs)`
- Limits vary by endpoint: `review-code` (20/min), `review-repo` (5/min), `generate-diff` (15/min)
- **Never** use in-memory rate limiting - it doesn't work across multiple Cloud Run instances

### Database Pattern (Prisma + PostgreSQL)
- Singleton client in `app/lib/prisma.ts` prevents connection pool exhaustion
- Four models: `UserSubscription`, `ReviewHistory`, `ReviewFeedback`, `ApiUsage`
- History operations go through API routes (`/api/history`) not direct Prisma calls from client
- Always use `@@index` on frequently queried fields (userId, timestamp)

### Stripe Webhooks
- Webhook handler in `app/api/webhooks/stripe/route.ts` MUST verify signature with `STRIPE_WEBHOOK_SECRET`
- On `checkout.session.completed`: Create `UserSubscription` record AND update Clerk metadata
- On `customer.subscription.updated`: Update subscription status AND sync to Clerk
- Always keep database and Clerk metadata in sync for subscription status

## Development Workflows

### Running Locally
```bash
npm install
npm run dev  # Runs on http://localhost:3000
```

### Database Migrations
```bash
npx prisma generate     # Generate Prisma Client after schema changes
npx prisma migrate dev  # Create and apply new migration
npx prisma studio       # Open visual database browser on :5555
```

### Deployment to Google Cloud Run
```bash
./scripts/setup-secrets.sh  # First time: Upload secrets to Secret Manager
./scripts/deploy.sh         # Build with Cloud Build + deploy to Cloud Run
```

**Critical**: Public env vars (`NEXT_PUBLIC_*`) must be provided as build args in `cloudbuild.yaml` because Next.js inlines them at build time. Server-side secrets are mounted at runtime via `--update-secrets`.

## Project-Specific Conventions

### Input Validation Pattern
Always validate user input through `app/utils/security.ts`:
1. `sanitizeInput()` - General text sanitization, removes null bytes, limits length
2. `sanitizeForAIPrompt()` - Escapes markdown to prevent AI prompt injection
3. `validateCodeInput()` - Enforces code size limits (100KB max)
4. Use validation BEFORE rate limiting to reject invalid requests early

### AI Prompt Engineering
- Prompts are centralized in `app/data/prompts.ts` by review mode
- Always use `buildPrompt()` to combine mode instructions + code + custom prompt
- Wrap code in triple backticks with language identifier: `` ```typescript ``
- Replace `{language}` placeholder in prompt templates

### Error Handling Pattern
```typescript
try {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Rate limit check
  const rateLimit = await checkRateLimitRedis(`endpoint:${userId}`, limit, windowMs);
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  
  // Input validation
  const validation = validateInput(input);
  if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });
  
  // Process request
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
}
```

### File Size Limits (from `app/data/constants.ts`)
- Local file: 1MB max
- Repository total: 200KB max (multiple files aggregate)
- Single code input: 500KB max
- Show warning at 100KB but allow review

## Common Tasks

### Adding a New Review Mode
1. Add prompt template to `app/data/prompts.ts` with format instructions
2. Add mode definition to `REVIEW_MODE_GROUPS` in `app/data/constants.ts`
3. Test with various code samples - ensure markdown code blocks use correct language

### Adding a New API Endpoint
1. Create route in `app/api/[endpoint]/route.ts`
2. Add Clerk `auth()` check first
3. Add rate limiting with `checkRateLimitRedis()`
4. Add input validation from `app/utils/security.ts`
5. Update type definitions in `app/types/index.ts` if needed

### Modifying Database Schema
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Update types if needed (Prisma auto-generates TypeScript types)
4. Test with `npx prisma studio`

### Debugging Cloud Run Issues
```bash
# View recent logs
gcloud run services logs read coderevai --region us-south1 --limit 50

# Stream logs in real-time
gcloud run services logs tail coderevai --region us-south1

# Check secret access
gcloud secrets versions access latest --secret=GEMINI_API_KEY
```

## Things to Know

### Docker Multi-Stage Build
`Dockerfile` uses 3 stages: deps → builder → runner
- Public env vars passed as `ARG` to builder stage
- `next.config.js` sets `output: 'standalone'` for optimized production bundle
- Final image runs as non-root user (nextjs:1001) for security

### GitHub Repository Reviews
- Uses GitHub REST API (no authentication required for public repos)
- Fetches tree via `/repos/{owner}/{repo}/git/trees/{sha}?recursive=1`
- Downloads file contents in parallel with `Promise.all()`
- Filters by file extensions from `LANGUAGES` in `app/data/constants.ts`

### Client-Side State Management
- No Redux/Zustand - uses React `useState` and `useEffect`
- Review history stored in PostgreSQL, accessed via `/api/history` endpoint
- Loading states use `LoadingState` component with consistent spinner

### Testing Infrastructure
- Redis connection test: `node scripts/test-redis.js` (uses CommonJS to properly load env vars)
- No automated test suite (Jest/Vitest) - manual testing workflow
- Security check script: `./scripts/check-security.sh` validates no secrets in code

### Environment Variable Loading
**Critical**: Both `.env` and `.env.local` exist in the project:
- `.env` - Used by Prisma CLI commands (`prisma generate`, `prisma db push`, `prisma studio`)
- `.env.local` - Used by Next.js dev server and loaded by Next.js automatically
- **Keep both files in sync** for DATABASE_URL and Redis credentials
- When testing standalone scripts, use CommonJS + `require('dotenv').config({ path: '.env.local' })` BEFORE any imports
- TypeScript/ES modules hoist imports, so dotenv config must be in a separate entry point

## Troubleshooting Patterns

**"Can't reach database server"**: Prisma reads `.env` not `.env.local` - ensure both files have same `DATABASE_URL`  
**"Redis configuration missing"**: Check for syntax errors in `.env.local` (extra quotes, missing values)  
**Env vars not loading in scripts**: Use CommonJS with dotenv loaded before imports, or use `node -r dotenv/config script.js`  
**Build fails on Cloud Run**: Public env vars missing from Secret Manager or not in `cloudbuild.yaml` substitutions  
**Stripe webhook 400 error**: Signature verification failed - webhook secret mismatch, ensure using raw body
