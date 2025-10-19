# External Services Setup Guide

This guide walks you through provisioning and integrating Redis (for distributed rate limiting) and Prisma with PostgreSQL (for database operations) into CodeRevAI.

---

## Table of Contents

1. [Redis Setup with Upstash](#1-redis-setup-with-upstash)
2. [PostgreSQL Database Setup](#2-postgresql-database-setup)
3. [Prisma Integration](#3-prisma-integration)
4. [Update Application Code](#4-update-application-code)
5. [Environment Variables](#5-environment-variables)
6. [Testing & Validation](#6-testing--validation)
7. [Deployment Considerations](#7-deployment-considerations)

---

## 1. Redis Setup with Upstash

Upstash provides serverless Redis that's perfect for Cloud Run deployments.

### Step 1.1: Create Upstash Account

1. Go to [https://upstash.com/](https://upstash.com/)
2. Sign up with GitHub or email
3. Verify your email if required

### Step 1.2: Create Redis Database

1. Click **"Create Database"** in the Upstash console
2. Configure your database:
   - **Name:** `coderevai-redis` (or your preferred name)
   - **Type:** Select **Global** (multi-region) or **Regional** (single region)
   - **Region:** Choose closest to your Cloud Run region (`us-south1` → select US East or US West)
   - **TLS:** Enabled (recommended for security)
   - **Eviction:** Select **noeviction** (prevent data loss when memory full)

3. Click **"Create"**

### Step 1.3: Get Connection Details

After creation, you'll see:
- **UPSTASH_REDIS_REST_URL:** `https://your-region.upstash.io`
- **UPSTASH_REDIS_REST_TOKEN:** `Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

Copy both values - you'll need them for environment variables.

### Step 1.4: Install Redis Client

```bash
npm install @upstash/redis
```

### Step 1.5: Create Redis Utility File

Create `app/utils/redis.ts`:

```typescript
import { Redis } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Redis configuration missing. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Distributed rate limiting using Redis
 * Works across multiple instances/containers
 */
export async function checkRateLimitRedis(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000 // 1 minute
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const key = `rate-limit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis sorted set to track requests within time window
    const pipeline = redis.pipeline();
    
    // Remove old entries outside the time window
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Add current request
    pipeline.zadd(key, { score: now, member: `${now}` });
    
    // Count requests in current window
    pipeline.zcard(key);
    
    // Set expiry on the key
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    const count = results[2] as number;

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const resetTime = now + windowMs;

    return { allowed, remaining, resetTime };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    // Fallback: allow the request if Redis fails
    return { allowed: true, remaining: limit, resetTime: now + windowMs };
  }
}
```

---

## 2. PostgreSQL Database Setup

You have several options for PostgreSQL hosting:

### Option A: Railway (Recommended - Easy & Free Tier)

1. Go to [https://railway.app/](https://railway.app/)
2. Sign up with GitHub
3. Click **"New Project"** → **"Provision PostgreSQL"**
4. Database will be created automatically
5. Click on the PostgreSQL service → **"Variables"** tab
6. Copy the **DATABASE_URL** (format: `postgresql://user:password@host:port/database`)

### Option B: Neon (Serverless PostgreSQL)

1. Go to [https://neon.tech/](https://neon.tech/)
2. Sign up with GitHub
3. Click **"Create Project"**
   - Name: `coderevai`
   - Region: Choose closest to Cloud Run (`us-south1` → US East or US West)
4. After creation, go to **"Dashboard"**
5. Copy the **Connection String** from the dashboard

### Option C: Google Cloud SQL (Production-Grade)

1. In Google Cloud Console: [https://console.cloud.google.com/sql](https://console.cloud.google.com/sql)
2. Click **"Create Instance"** → **"Choose PostgreSQL"**
3. Configure:
   - **Instance ID:** `coderevai-db`
   - **Password:** Set a strong password
   - **Database version:** PostgreSQL 15
   - **Region:** `us-south1` (same as Cloud Run)
   - **Zonal availability:** Single zone (or High availability for production)
   - **Machine type:** Lightweight (db-f1-micro for testing, scale up later)
   - **Storage:** 10 GB SSD (auto-increase enabled)
4. Click **"Create Instance"** (takes 5-10 minutes)
5. After creation:
   - Go to **"Connections"** tab
   - Note the **Public IP address**
   - Go to **"Users"** tab → Create a user (e.g., `coderevai_user`)
   - Go to **"Databases"** tab → Create database `coderevai`
6. Connection string format:
   ```
   postgresql://username:password@PUBLIC_IP:5432/coderevai
   ```

For Cloud Run connection, you'll also need to:
- Enable **Cloud SQL Admin API**
- Add Cloud SQL connection name to Cloud Run service
- Use Unix socket connection in production

---

## 3. Prisma Integration

### Step 3.1: Install Prisma

```bash
npm install prisma @prisma/client
npm install -D prisma
```

### Step 3.2: Initialize Prisma

```bash
npx prisma init
```

This creates:
- `prisma/schema.prisma` - Database schema
- `.env` - Environment variables (add DATABASE_URL)

### Step 3.3: Configure Prisma Schema

Edit `prisma/schema.prisma`:

```prisma
// This is your Prisma schema file

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User subscription model
model UserSubscription {
  id                String   @id @default(cuid())
  userId            String   @unique // Clerk user ID
  stripeCustomerId  String   @unique
  stripeSubscriptionId String? @unique
  stripePriceId     String?
  plan              String   // 'free' or 'pro'
  status            String   // 'active', 'canceled', 'past_due', 'incomplete', etc.
  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  cancelAtPeriodEnd Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId])
  @@index([stripeCustomerId])
}

// Review history model
model ReviewHistory {
  id              String   @id @default(cuid())
  userId          String   // Clerk user ID
  type            String   // 'code', 'repository', 'file'
  language        String?
  reviewModes     String[] // Array of review mode strings
  timestamp       DateTime @default(now())
  codeSnippet     String?  @db.Text // First 500 chars of code
  feedback        String   @db.Text // AI feedback
  repoUrl         String?
  fileName        String?
  
  @@index([userId, timestamp])
  @@index([userId])
}

// Feedback model (for review quality tracking)
model ReviewFeedback {
  id          String   @id @default(cuid())
  userId      String   // Clerk user ID
  reviewId    String?  // Optional link to ReviewHistory
  rating      Int      // 1-5 or thumbs up (1) / thumbs down (0)
  comment     String?  @db.Text
  reviewType  String   // 'code', 'repository'
  timestamp   DateTime @default(now())
  
  @@index([userId])
  @@index([reviewId])
}

// API usage tracking (optional - for analytics)
model ApiUsage {
  id          String   @id @default(cuid())
  userId      String
  endpoint    String   // '/api/review-code', '/api/review-repo', etc.
  timestamp   DateTime @default(now())
  duration    Int?     // Response time in ms
  statusCode  Int?     // HTTP status code
  tokensUsed  Int?     // AI tokens consumed (if tracked)
  
  @@index([userId, timestamp])
  @@index([endpoint, timestamp])
}
```

### Step 3.4: Create Migration

```bash
npx prisma migrate dev --name init
```

This will:
1. Create the database tables
2. Generate Prisma Client
3. Apply the migration

### Step 3.5: Create Prisma Client Singleton

Create `app/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

---

## 4. Update Application Code

### Step 4.1: Update Rate Limiting in API Routes

Replace the in-memory rate limiting with Redis:

**File: `app/api/review-code/route.ts`**

```typescript
// Change import at top
import { checkRateLimitRedis } from '@/app/utils/redis';

// Replace checkRateLimit call (around line 62)
// OLD: const rateLimit = checkRateLimit(`review-code:${userId}`, 20, 60000);
// NEW:
const rateLimit = await checkRateLimitRedis(`review-code:${userId}`, 20, 60000);
```

**Repeat for:**
- `app/api/review-repo/route.ts` (line ~73, use `review-repo:${userId}`, limit 5)
- `app/api/generate-diff/route.ts` (add rate limiting if not present, limit 15)

### Step 4.2: Update Stripe Webhooks for Database Storage

**File: `app/api/webhooks/stripe/route.ts`**

Add at the top:

```typescript
import { prisma } from '@/app/lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';
```

Replace the TODO sections in each case:

```typescript
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;

  if (userId && plan && session.customer && session.subscription) {
    // Store subscription in database
    await prisma.userSubscription.upsert({
      where: { userId },
      update: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        stripePriceId: session.metadata?.priceId || null,
        plan: plan,
        status: 'active',
        updatedAt: new Date(),
      },
      create: {
        userId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        stripePriceId: session.metadata?.priceId || null,
        plan: plan,
        status: 'active',
      },
    });

    // Update Clerk user metadata
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { plan: plan },
    });

    console.log(`Subscription created for user ${userId}`);
  }
  break;
}

case 'customer.subscription.updated': {
  const subscription = event.data.object as Stripe.Subscription;
  
  // Find user by Stripe customer ID
  const userSub = await prisma.userSubscription.findUnique({
    where: { stripeCustomerId: subscription.customer as string },
  });

  if (userSub) {
    await prisma.userSubscription.update({
      where: { id: userSub.id },
      data: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      },
    });

    // Update plan if status changed
    const newPlan = subscription.status === 'active' ? 'pro' : 'free';
    await clerkClient.users.updateUserMetadata(userSub.userId, {
      publicMetadata: { plan: newPlan },
    });

    console.log(`Subscription updated for customer ${subscription.customer}`);
  }
  break;
}

case 'customer.subscription.deleted': {
  const subscription = event.data.object as Stripe.Subscription;
  
  const userSub = await prisma.userSubscription.findUnique({
    where: { stripeCustomerId: subscription.customer as string },
  });

  if (userSub) {
    await prisma.userSubscription.update({
      where: { id: userSub.id },
      data: {
        status: 'canceled',
        plan: 'free',
        updatedAt: new Date(),
      },
    });

    await clerkClient.users.updateUserMetadata(userSub.userId, {
      publicMetadata: { plan: 'free' },
    });

    console.log(`Subscription canceled for customer ${subscription.customer}`);
  }
  break;
}
```

### Step 4.3: Create History Service with Database

**File: `app/services/historyService.ts`**

Replace entire file with:

```typescript
import { prisma } from '@/app/lib/prisma';
import { HistoryItem } from '@/app/types';

/**
 * Get review history for a user from database
 */
export async function getHistory(userId: string): Promise<HistoryItem[]> {
  try {
    const history = await prisma.reviewHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50, // Limit to last 50 reviews
    });

    return history.map(item => ({
      id: item.id,
      type: item.type as 'code' | 'repository' | 'file',
      language: item.language || 'text',
      reviewModes: item.reviewModes,
      timestamp: item.timestamp.getTime(),
      codeSnippet: item.codeSnippet || '',
      feedback: item.feedback,
      repoUrl: item.repoUrl,
      fileName: item.fileName,
    }));
  } catch (error) {
    console.error('Error fetching history from database:', error);
    return [];
  }
}

/**
 * Add a new review to history
 */
export async function addHistoryItem(userId: string, item: Omit<HistoryItem, 'id'>): Promise<void> {
  try {
    await prisma.reviewHistory.create({
      data: {
        userId,
        type: item.type,
        language: item.language,
        reviewModes: item.reviewModes,
        codeSnippet: item.codeSnippet?.substring(0, 500), // Store first 500 chars
        feedback: item.feedback,
        repoUrl: item.repoUrl,
        fileName: item.fileName,
        timestamp: new Date(item.timestamp),
      },
    });
  } catch (error) {
    console.error('Error saving history to database:', error);
  }
}

/**
 * Clear all history for a user
 */
export async function clearHistory(userId: string): Promise<void> {
  try {
    await prisma.reviewHistory.deleteMany({
      where: { userId },
    });
  } catch (error) {
    console.error('Error clearing history from database:', error);
  }
}
```

### Step 4.4: Create API Routes for History

**File: `app/api/history/route.ts`** (new file)

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getHistory, addHistoryItem, clearHistory } from '@/app/services/historyService';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const history = await getHistory(userId);
    return NextResponse.json({ history });
  } catch (error: unknown) {
    console.error('Error fetching history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch history';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const historyItem = await req.json();
    await addHistoryItem(userId, historyItem);
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error adding history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to add history';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await clearHistory(userId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error clearing history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to clear history';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

### Step 4.5: Update Billing Page to Use Database

**File: `app/billing/page.tsx`**

Add at the top:

```typescript
import { prisma } from '@/app/lib/prisma';
```

Replace the subscription check logic (around line 12-20):

```typescript
export default async function BillingPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  // Fetch user subscription from database
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
  });

  const isPro = subscription?.status === 'active';
  const currentPlan = subscription?.plan || 'free';

  // Rest of the component...
```

### Step 4.6: Update Security Utils (Remove In-Memory Rate Limiting)

**File: `app/utils/security.ts`**

Remove the old `checkRateLimit` function and the cleanup interval (lines ~178-220).

Add a comment:

```typescript
/**
 * Rate limiting helper
 * NOTE: Moved to Redis-based rate limiting in app/utils/redis.ts
 * for distributed rate limiting across multiple instances.
 */
```

---

## 5. Environment Variables

Update your `.env.local` file:

```bash
# Existing variables...
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxx

# NEW: Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxΩ

# NEW: Database (PostgreSQL)
DATABASE_URL=postgresql://username:password@host:5432/database_name
```

For **Google Cloud Run**, you'll need to add these environment variables:

```bash
gcloud run services update coderevai \
  --region=us-south1 \
  --set-env-vars="UPSTASH_REDIS_REST_URL=https://your-region.upstash.io,UPSTASH_REDIS_REST_TOKEN=Axxx...,DATABASE_URL=postgresql://user:pass@host:5432/db"
```

Or add them in the Cloud Run console:
1. Go to your Cloud Run service
2. Click "Edit & Deploy New Revision"
3. Go to "Variables & Secrets" tab
4. Add each environment variable
5. Click "Deploy"

---

## 6. Testing & Validation

### Step 6.1: Test Redis Connection

Create a test file `scripts/test-redis.ts`:

```typescript
import { redis, checkRateLimitRedis } from '../app/utils/redis';

async function testRedis() {
  console.log('Testing Redis connection...');
  
  try {
    // Test basic set/get
    await redis.set('test-key', 'Hello Redis!');
    const value = await redis.get('test-key');
    console.log('✓ Redis set/get works:', value);
    
    // Test rate limiting
    const result = await checkRateLimitRedis('test-user', 5, 60000);
    console.log('✓ Rate limiting works:', result);
    
    await redis.del('test-key');
    console.log('✓ All Redis tests passed!');
  } catch (error) {
    console.error('✗ Redis test failed:', error);
  }
}

testRedis();
```

Run it:

```bash
npx tsx scripts/test-redis.ts
```

### Step 6.2: Test Database Connection

```bash
npx prisma db push
npx prisma studio
```

This opens Prisma Studio at `http://localhost:5555` where you can view/edit data.

### Step 6.3: Test Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Apply migrations
npx prisma migrate deploy
```

### Step 6.4: Run Local Development

```bash
npm run dev
```

Test the following:
- ✓ Code review works (tests rate limiting)
- ✓ History loads from database
- ✓ Stripe checkout creates subscription in DB
- ✓ Billing page shows correct subscription status

---

## 7. Deployment Considerations

### Step 7.1: Update Dockerfile (if needed)

Add Prisma generation to your build:

```dockerfile
# In your Dockerfile, after npm install
RUN npx prisma generate
```

### Step 7.2: Cloud Run + Cloud SQL Connection

If using Google Cloud SQL, configure the connection:

```bash
gcloud run services update coderevai \
  --region=us-south1 \
  --add-cloudsql-instances=PROJECT_ID:REGION:INSTANCE_NAME \
  --set-env-vars="DATABASE_URL=postgresql://user:pass@/dbname?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME"
```

### Step 7.3: Run Migrations in Production

Option A: Manual migration before deployment

```bash
# Set production DATABASE_URL temporarily
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy
```

Option B: Add migration to deployment script

In `scripts/deploy.sh`, before building:

```bash
echo "Running database migrations..."
npx prisma migrate deploy
```

### Step 7.4: Monitor & Scale

**Upstash Redis:**
- Monitor usage in Upstash dashboard
- Free tier: 10,000 commands/day
- Upgrade if needed

**Database:**
- Monitor connections and query performance
- Set up connection pooling if needed (use Prisma Accelerate or PgBouncer)
- Consider read replicas for high traffic

---

## 8. Troubleshooting

### Issue: "Can't reach database server"

**Solution:**
- Check DATABASE_URL format
- Verify database is running
- Check network connectivity
- For Cloud SQL: Ensure Cloud Run has proper IAM permissions

### Issue: "Redis connection failed"

**Solution:**
- Verify UPSTASH_REDIS_REST_URL and TOKEN
- Check Upstash dashboard for database status
- Test with curl:
  ```bash
  curl https://your-region.upstash.io/get/test-key \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```

### Issue: "Prisma Client not generated"

**Solution:**
```bash
npx prisma generate
```

### Issue: Migration conflicts

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or create a new migration
npx prisma migrate dev --name fix_conflict
```

---

## 9. Cost Estimates

### Redis (Upstash)
- **Free tier:** 10,000 commands/day, 256 MB storage
- **Pay-as-you-go:** $0.2 per 100K commands
- **Expected:** ~$5-20/month for moderate traffic

### PostgreSQL
- **Railway:** $5/month (500 hours free)
- **Neon:** Free tier + $19/month for production
- **Google Cloud SQL:** ~$7-50/month depending on instance size

**Total estimated cost:** $10-70/month depending on traffic and provider choices.

---

## Next Steps

1. ✅ Provision Redis (Upstash)
2. ✅ Provision PostgreSQL (Railway/Neon/Cloud SQL)
3. ✅ Install dependencies (`@upstash/redis`, `prisma`, `@prisma/client`)
4. ✅ Set up Prisma schema
5. ✅ Run migrations
6. ✅ Update application code
7. ✅ Test locally
8. ✅ Deploy to production
9. ✅ Monitor and optimize

Good luck! 🚀
