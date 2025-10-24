# CodeRevAI - System Architecture

> **Last Updated:** October 20, 2025  
> **Version:** 2.0 (Post Phase 2 Improvements)

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Data Flow](#data-flow)
4. [Component Details](#component-details)
5. [Database Schema](#database-schema)
6. [API Routes](#api-routes)
7. [Security Architecture](#security-architecture)
8. [Error Handling](#error-handling)
9. [Observability](#observability)
10. [Deployment Architecture](#deployment-architecture)

---

## Overview

CodeRevAI is a production-grade SaaS application providing AI-powered code review services. The architecture emphasizes:

- **Security:** Input validation, rate limiting, authentication
- **Reliability:** Circuit breakers, error handling, fail-closed strategies
- **Observability:** Request tracing, structured logging, performance metrics
- **Scalability:** Stateless design, Redis caching, horizontal scaling
- **Maintainability:** Clean separation of concerns, typed APIs, centralized configuration

### Technology Decisions

| Area | Technology | Rationale |
|------|-----------|-----------|
| **Framework** | Next.js 15 | Full-stack React with SSR, API routes, App Router |
| **Language** | TypeScript | Type safety, better DX, fewer runtime errors |
| **AI Provider** | Google Gemini 2.5 | Cost-effective, fast, high-quality code analysis |
| **Auth** | Clerk | Managed auth, JWT, user metadata, easy integration |
| **Database** | PostgreSQL + Prisma | Reliable, ACID compliant, excellent ORM |
| **Cache** | Redis (Upstash) | Serverless, global, low latency |
| **Payments** | Stripe | Industry standard, comprehensive webhooks |
| **Hosting** | Google Cloud Run | Serverless containers, auto-scaling, cost-effective |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │  Landing    │  │  Dashboard   │  │  Billing/Auth       │   │
│  │  Page       │  │  (Review UI) │  │  Pages              │   │
│  └─────────────┘  └──────────────┘  └─────────────────────┘   │
│                                                                   │
│  Client Services: clientGeminiService, clientHistoryService      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ├─── Public Env Vars (NEXT_PUBLIC_*)
                             │
          ┌──────────────────▼──────────────────┐
          │       Next.js Middleware            │
          │  ┌─────────────────────────────┐   │
          │  │ - Request ID Generation     │   │
          │  │ - Authentication (Clerk)    │   │
          │  │ - Public Route Matching     │   │
          │  └─────────────────────────────┘   │
          └──────────────────┬──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │      Next.js API Routes             │
          │                                      │
          │  ┌────────┐  ┌────────┐  ┌───────┐│
          │  │review  │  │history │  │stripe ││
          │  │ -code  │  │        │  │webhook││
          │  │ -repo  │  │        │  │       ││
          │  │ -diff  │  │        │  │       ││
          │  └───┬────┘  └───┬────┘  └───┬───┘│
          └──────┼───────────┼──────────────┼───┘
                 │           │              │
    ┌────────────┼───────────┼──────────────┼────────────┐
    │            │           │              │            │
┌───▼────┐  ┌───▼────┐  ┌──▼─────┐  ┌────▼─────┐  ┌──▼──────┐
│ Gemini │  │ Prisma │  │ Redis  │  │  Stripe  │  │  Clerk  │
│   AI   │  │  ORM   │  │ Cache  │  │   API    │  │   API   │
└────────┘  └───┬────┘  └────────┘  └──────────┘  └─────────┘
                │
          ┌─────▼─────┐
          │PostgreSQL │
          │ Database  │
          └───────────┘
```

### Layer Responsibilities

#### 1. Client Layer (`app/`)
- **Purpose:** User interface and client-side logic
- **Components:**
  - React components for UI
  - Client services for API communication
  - State management with hooks
- **Key Files:**
  - `app/dashboard/page.tsx` - Main review interface
  - `app/components/` - Reusable UI components
  - `app/services/client*Service.ts` - API wrappers

#### 2. Middleware (`middleware.ts`)
- **Purpose:** Request preprocessing and authentication
- **Responsibilities:**
  - Generate unique request IDs
  - Check authentication with Clerk
  - Protect non-public routes
  - Add request/response headers

#### 3. API Layer (`app/api/*/route.ts`)
- **Purpose:** Business logic and external service integration
- **Pattern:** Consistent error handling, validation, logging
- **Responsibilities:**
  - Input validation
  - Rate limiting
  - Authentication checks
  - Service orchestration
  - Response formatting

#### 4. Service Layer (`app/services/`, `app/utils/`)
- **Purpose:** Reusable business logic
- **Components:**
  - `githubService.ts` - GitHub API integration
  - `apiClients.ts` - Singleton clients (Gemini, Stripe)
  - `redis.ts` - Rate limiting with circuit breaker
  - `security.ts` - Input validation utilities

#### 5. Data Layer (`app/lib/prisma.ts`, `prisma/schema.prisma`)
- **Purpose:** Database access and schema definition
- **Features:**
  - Singleton Prisma client
  - Type-safe queries
  - Migration management
  - Connection pooling

---

## Data Flow

### Code Review Request Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Submit Code
     ▼
┌──────────────┐
│  Dashboard   │
│  Component   │
└────┬─────────┘
     │ 2. reviewCode(code, language, prompt, modes)
     ▼
┌──────────────────┐
│clientGeminiService│
└────┬─────────────┘
     │ 3. POST /api/review-code
     ▼
┌─────────────────┐
│  Middleware     │
│ - Gen Request ID│
│ - Check Auth    │
└────┬────────────┘
     │ 4. Pass with headers
     ▼
┌───────────────────────────────┐
│  API Route: review-code       │
│                                │
│  5. Extract Request ID         │
│  6. Authenticate (userId)      │
│  7. Rate Limit Check (Redis)   │
│  8. Validate Input             │
│  9. Sanitize Input             │
│ 10. Build AI Prompt            │
│ 11. Call Gemini AI             │
│ 12. Log Metrics                │
│ 13. Return Response            │
└────┬──────────────────────────┘
     │ 14. { feedback, headers }
     ▼
┌──────────────────┐
│clientGeminiService│
│ - Parse Response  │
│ - Throw AppError  │
└────┬─────────────┘
     │ 15. Return feedback
     ▼
┌──────────────┐
│  Dashboard   │
│ - Display    │
│ - Save History│
└──────────────┘
```

### Stripe Webhook Flow

```
┌─────────┐
│ Stripe  │
│ Event   │
└────┬────┘
     │ 1. POST /api/webhooks/stripe
     │    (customer.subscription.created, etc.)
     ▼
┌────────────────────────┐
│  Webhook Handler       │
│                        │
│  2. Verify Signature   │
│  3. Parse Event        │
│  4. Switch on Type     │
└────┬───────────────────┘
     │
     ├─── subscription.created
     │    └─► Update Database
     │        └─► Update Clerk Metadata
     │
     ├─── invoice.payment_succeeded
     │    └─► Mark Subscription Active
     │        └─► Update User Plan
     │
     └─── invoice.payment_failed
          └─► Mark Past Due
              └─► Log Warning
```

---

## Component Details

### API Routes

#### `/api/review-code` (POST)
**Purpose:** Review a single code file

**Request:**
```typescript
{
  code: string,
  language: string,
  customPrompt?: string,
  reviewModes: string[]
}
```

**Response:**
```typescript
{
  feedback: string  // Markdown-formatted review
}
```

**Headers:**
- `X-Request-ID` - Unique request identifier
- `X-RateLimit-Limit` - Max requests per window
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Window reset time

**Flow:**
1. Authenticate user
2. Rate limit check (20/min, fail-closed)
3. Validate inputs (size, language, modes)
4. Sanitize code and prompt
5. Build AI prompt from templates
6. Call Gemini AI (timed)
7. Log usage metrics
8. Return feedback

---

#### `/api/review-repo` (POST)
**Purpose:** Review multiple files from a repository

**Request:**
```typescript
{
  files: Array<{ path: string, content: string }>,
  repoUrl: string,
  customPrompt?: string,
  reviewModes: string[]
}
```

**Limits:**
- Max total size: 200KB
- Max files: No explicit limit
- Rate limit: 5/min (fail-closed)

**Flow:**
1. Authenticate user
2. Rate limit check (5/min, fail-closed)
3. Validate repository URL
4. Check aggregate file size
5. Sanitize all inputs
6. Build combined prompt
7. Call Gemini AI
8. Return aggregated feedback

---

#### `/api/generate-diff` (POST)
**Purpose:** Generate refactored code based on review feedback

**Request:**
```typescript
{
  originalCode: string,
  language: string,
  feedback: string
}
```

**Response:**
```typescript
{
  modifiedCode: string
}
```

**Rate Limit:** 15/min (fail-closed)

---

#### `/api/history` (GET/POST/DELETE)
**Purpose:** Manage review history

**GET** - Retrieve user's review history
```typescript
Response: { history: HistoryItem[] }
```

**POST** - Save review to history
```typescript
Request: HistoryItem
Response: { success: boolean }
```

**DELETE** - Clear all user history
```typescript
Response: { success: boolean }
```

**Storage:**
- Database: PostgreSQL via Prisma
- Schema: `ReviewHistory` model
- Index: `userId` + `timestamp`

---

#### `/api/subscription` (GET)
**Purpose:** Get user subscription status

**Response:**
```typescript
{
  subscription: {
    plan: 'free' | 'pro',
    status: string,
    currentPeriodEnd?: Date
  }
}
```

---

#### `/api/webhooks/stripe` (POST)
**Purpose:** Handle Stripe subscription events

**Events Handled:**
1. `checkout.session.completed` - New subscription created
2. `customer.subscription.created` - Subscription activated
3. `customer.subscription.updated` - Plan changed
4. `customer.subscription.deleted` - Cancelled
5. `invoice.payment_succeeded` - Payment processed
6. `invoice.payment_failed` - Payment issue

**Security:**
- Signature verification with `STRIPE_WEBHOOK_SECRET`
- Raw body parsing required
- Idempotent operations

**Actions:**
- Update `UserSubscription` in database
- Sync `publicMetadata.plan` in Clerk
- Log all events for audit

---

### Services

#### Gemini AI Service (`app/utils/apiClients.ts`)
**Pattern:** Singleton client

```typescript
export function getGeminiAI(): GoogleGenAI {
  if (!geminiAI) {
    geminiAI = new GoogleGenAI({ 
      apiKey: serverEnv.GEMINI_API_KEY 
    });
  }
  return geminiAI;
}
```

**Usage:**
```typescript
const ai = getGeminiAI();
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: prompt
});
```

**Model Selection:** `gemini-2.5-flash`
- Fast responses (~1-2s)
- Cost-effective
- Good code understanding
- 2M token context window

---

#### Redis Service (`app/utils/redis.ts`)
**Features:**
- Rate limiting with sorted sets
- Circuit breaker pattern
- Fail-closed strategy for AI routes

**Circuit Breaker States:**
```
CLOSED → (5 failures) → OPEN → (60s) → HALF_OPEN → (success) → CLOSED
```

**Rate Limiting Algorithm:**
```typescript
1. Remove old entries outside time window
2. Add current timestamp to sorted set
3. Count entries in window
4. Compare against limit
5. Return { allowed, remaining, resetTime }
```

**Fail-Closed:**
- When Redis unavailable or circuit open
- AI routes deny requests (cost protection)
- Non-AI routes may fail open (UX balance)

---

#### GitHub Service (`app/services/githubService.ts`)
**Purpose:** Fetch repository contents

**Flow:**
1. Parse GitHub URL → `{owner, repo, branch}`
2. Fetch repository tree (recursive)
3. Filter by language extensions
4. Download file contents (parallel)
5. Aggregate with size tracking

**Limits:**
- Max aggregate size: 200KB
- Supports public repos only
- Rate limited by GitHub (60/hour unauthenticated)

---

### Client Services

#### clientGeminiService (`app/services/clientGeminiService.ts`)
**Purpose:** Client-side wrapper for review APIs

**Features:**
- Retry logic with exponential backoff
- Error deserialization to `AppError`
- Type-safe responses
- Request logging

**Pattern:**
```typescript
async function reviewCode(code, language, prompt, modes) {
  try {
    const response = await fetchWithRetry('/api/review-code', ...);
    if (!response.ok) {
      await handleApiError(response); // Throws AppError
    }
    return response.json();
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Convert to AppError
    throw new AppError('INTERNAL_ERROR', message, details, true);
  }
}
```

---

## Database Schema

### Prisma Models

#### UserSubscription
```prisma
model UserSubscription {
  id                   String   @id @default(cuid())
  userId               String   @unique
  stripeCustomerId     String?  @unique
  stripeSubscriptionId String?  @unique
  plan                 String   @default("free")
  status               String?
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean  @default(false)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@index([userId])
  @@index([stripeCustomerId])
}
```

#### ReviewHistory
```prisma
model ReviewHistory {
  id         String   @id @default(cuid())
  userId     String
  fileName   String
  language   String
  code       String   @db.Text
  feedback   String   @db.Text
  mode       String[]
  reviewType String   @default("file")
  timestamp  BigInt
  createdAt  DateTime @default(now())

  @@index([userId, timestamp])
}
```

#### ReviewFeedback
```prisma
model ReviewFeedback {
  id        String   @id @default(cuid())
  reviewId  String
  userId    String
  rating    Int      // 1-5
  comment   String?  @db.Text
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([reviewId])
}
```

#### ApiUsage
```prisma
model ApiUsage {
  id          String   @id @default(cuid())
  userId      String
  endpoint    String
  timestamp   DateTime @default(now())
  duration    Int      // milliseconds
  aiDuration  Int?     // milliseconds
  success     Boolean
  errorCode   String?

  @@index([userId, timestamp])
}
```

---

## Security Architecture

### Input Validation (`app/utils/security.ts`)

**Layers:**
1. **Size Limits:** Reject oversized inputs early
2. **Sanitization:** Remove null bytes, trim, limit length
3. **Validation:** Check format, allowed values
4. **AI Prompt Protection:** Escape markdown, prevent injection

**Functions:**
- `sanitizeInput(input)` - General sanitization
- `sanitizeForAIPrompt(input)` - AI-specific escaping
- `validateCodeInput(code)` - Code size validation
- `validateLanguage(lang)` - Whitelist check
- `validateReviewModes(modes)` - Valid mode check

---

### Rate Limiting Strategy

**Fail-Closed Approach:**
```typescript
// Cost-sensitive AI operations
await checkRateLimitRedis(key, limit, window, true); // failClosed=true
```

**Circuit Breaker Protection:**
- Prevents cascading failures
- Auto-recovery after timeout
- Logs state transitions

**Per-Route Limits:**
| Route | Limit | Window | Fail Strategy |
|-------|-------|--------|---------------|
| `/api/review-code` | 20 | 1 min | Closed |
| `/api/review-repo` | 5 | 1 min | Closed |
| `/api/generate-diff` | 15 | 1 min | Closed |
| `/api/history` | 60 | 1 min | Open |

---

### Authentication Flow

```
1. User requests protected route
   ↓
2. Middleware checks Clerk session
   ↓
3a. Valid → Add userId to context
3b. Invalid → Redirect to sign-in
   ↓
4. API route extracts userId from auth()
   ↓
5. Proceed with request
```

**Public Routes:**
- `/` (landing page)
- `/sign-in/*`
- `/sign-up/*`

**Protected Routes:**
- `/dashboard`
- `/billing`
- All `/api/*` except `/api/webhooks/stripe`

---

## Error Handling

### Error Type Hierarchy

```typescript
Error
 └── AppError (custom)
      ├── UNAUTHORIZED
      ├── RATE_LIMIT_EXCEEDED
      ├── INVALID_INPUT
      ├── FILE_TOO_LARGE
      ├── REPO_TOO_LARGE
      ├── AI_SERVICE_ERROR
      ├── GITHUB_API_ERROR
      ├── DATABASE_ERROR
      ├── PAYMENT_ERROR
      ├── VALIDATION_ERROR
      ├── NOT_FOUND
      ├── INTERNAL_ERROR
      └── SERVICE_UNAVAILABLE
```

### Error Response Format

**API Error Response:**
```typescript
{
  code: ErrorCode,
  message: string,
  details?: string,
  retryable?: boolean
}
```

**HTTP Status Mapping:**
| Error Code | HTTP Status | Retryable |
|------------|-------------|-----------|
| `UNAUTHORIZED` | 401 | No |
| `RATE_LIMIT_EXCEEDED` | 429 | Yes |
| `INVALID_INPUT` | 400 | No |
| `SERVICE_UNAVAILABLE` | 503 | Yes |
| `INTERNAL_ERROR` | 500 | Maybe |

### Client-Side Error Handling

**Dashboard Error Context Mapping:**
```typescript
switch (error.code) {
  case 'RATE_LIMIT_EXCEEDED': 
    context = 'rate-limit';
    message = 'Too many requests. Please wait.';
    break;
  case 'UNAUTHORIZED':
    context = 'auth';
    message = 'Please sign in to continue.';
    break;
  // ... more mappings
}
```

---

## Observability

### Request Tracing

**Request ID Format:** `req_{timestamp}_{random}`

**Propagation:**
1. Generated in middleware
2. Added to request headers
3. Included in all log messages
4. Returned in response headers
5. Used for correlation in external systems

**Example:**
```
[INFO] [req_1760932269_abc123] Code review started
[INFO] [req_1760932269_abc123] AI duration: 1243ms
[INFO] [req_1760932269_abc123] Total: 1389ms
```

---

### Logging Strategy

**Logger Levels:**
- `logger.error()` - Always logged (errors)
- `logger.warn()` - Dev only (warnings)
- `logger.info()` - Dev only (informational)
- `logger.debug()` - Dev only (verbose)
- `logger.always()` - Always logged (critical)

**Structured Logging:**
```typescript
logger.info('AI request completed', {
  model: 'gemini-2.5-flash',
  aiDuration: '1243ms',
  feedbackLength: 2456,
  userId: 'user_123'
}, requestId);
```

**Metrics Collected:**
- Request start/end timestamps
- AI call duration
- Total request duration
- Input/output sizes
- Error rates by code
- Circuit breaker state

---

### Performance Metrics

**Tracked Metrics:**
1. **AI Duration** - Time spent in Gemini API call
2. **Total Duration** - Complete request processing time
3. **Feedback Length** - Size of AI response
4. **Rate Limit Stats** - Allowed, remaining, reset time

**Example Log:**
```json
{
  "level": "info",
  "requestId": "req_1760932269_abc123",
  "message": "Request completed successfully",
  "metadata": {
    "totalDuration": "1389ms",
    "aiDuration": "1243ms",
    "endpoint": "/api/review-code",
    "userId": "user_xyz"
  }
}
```

---

## Deployment Architecture

### Google Cloud Run

**Container Specs:**
- **Base Image:** `node:20-alpine`
- **Build:** Multi-stage (deps → builder → runner)
- **Runtime User:** `nextjs:1001` (non-root)
- **Port:** 3000

**Deployment Process:**
```bash
1. scripts/setup-secrets.sh
   └─► Upload secrets to Secret Manager

2. scripts/deploy.sh
   ├─► Fetch public env vars from secrets
   ├─► Build Docker image with Cloud Build
   ├─► Push to Google Container Registry
   └─► Deploy to Cloud Run
       ├─► Mount runtime secrets
       ├─► Set environment variables
       ├─► Configure auto-scaling
       └─► Update traffic routing
```

**Secrets Management:**
- **Build-time:** Public env vars as `ARG` in Dockerfile
- **Runtime:** Server secrets mounted from Secret Manager
- **Access:** IAM service account with `secretAccessor` role

**Auto-Scaling:**
- **Min Instances:** 0 (cost optimization)
- **Max Instances:** 10 (configurable)
- **Concurrency:** 80 requests per instance
- **Scale Down:** After 5 minutes idle

---

### Environment Configuration

**Build-Time Variables:** (Inline at build)
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO
```

**Runtime Secrets:** (Mounted on startup)
```bash
GEMINI_API_KEY
CLERK_SECRET_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
DATABASE_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

**Configuration Files:**
- `.env.local` - Local development
- `.env` - Prisma CLI
- `app/config/env.ts` - Type-safe access
- `cloudbuild.yaml` - Build substitutions

---

## Best Practices & Patterns

### 1. Error Handling
✅ **DO:**
- Use `AppError` with specific codes
- Include `retryable` flag
- Log with request ID
- Return structured responses

❌ **DON'T:**
- Throw generic `Error` instances
- Expose internal error details to client
- Forget to log errors
- Return inconsistent error formats

### 2. Input Validation
✅ **DO:**
- Validate all inputs before processing
- Sanitize user-provided content
- Enforce size limits early
- Use type-safe validation

❌ **DON'T:**
- Trust client-side validation alone
- Skip sanitization for "safe" inputs
- Allow unlimited input sizes
- Bypass validation for admin users

### 3. Rate Limiting
✅ **DO:**
- Use fail-closed for cost-sensitive operations
- Implement circuit breakers
- Return clear rate limit headers
- Log limit violations

❌ **DON'T:**
- Use in-memory rate limiting (won't scale)
- Fail open for AI routes
- Hide rate limit information from client
- Ignore circuit breaker states

### 4. Observability
✅ **DO:**
- Generate request IDs
- Log with structured metadata
- Track performance metrics
- Include context in logs

❌ **DON'T:**
- Log sensitive data (passwords, keys, PII)
- Use `console.log` directly
- Skip request ID propagation
- Forget to log errors

---

## Future Enhancements

### Planned Improvements
1. **Caching Layer** - Cache AI responses for identical inputs
2. **Webhooks** - Notify users of review completion
3. **Team Features** - Shared reviews, collaborative feedback
4. **Advanced Analytics** - Usage dashboards, cost tracking
5. **Custom Models** - Fine-tuned models for specific languages
6. **Batch Processing** - Queue large repository reviews
7. **API Rate Tiers** - Different limits per subscription plan

---

**Document Version:** 2.0  
**Last Review:** October 20, 2025  
**Next Review:** January 2026
