# Deployment Guide for CodeRevAI

This guide outlines the steps to deploy CodeRevAI to Vercel's free tier, including setting up the necessary database and caching services.

## Prerequisites

1.  **GitHub Account**: Ensure your code is pushed to a GitHub repository.
2.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com).
3.  **Clerk Account**: For authentication.
4.  **Stripe Account**: For payments (optional for initial deployment).
5.  **Google AI Studio Account**: For the Gemini API key.

## 1. Database Setup (PostgreSQL)

CodeRevAI uses PostgreSQL. You can use **Vercel Postgres** (recommended for ease of use) or any other Postgres provider like **Neon** or **Supabase**.

### Option A: Vercel Postgres (Easiest)
1.  Go to your Vercel Dashboard.
2.  Navigate to the "Storage" tab.
3.  Click "Create Database" and select "Postgres".
4.  Follow the prompts to create the database.
5.  Once created, go to the `.env.local` tab in the database settings and copy the `POSTGRES_PRISMA_URL` or `DATABASE_URL`.
6.  **Important**: You will need to add `?pgbouncer=true` to the end of the connection string if you are using a connection pooler, but for standard Vercel Postgres with Prisma, the default URL usually works. Ensure your `prisma/schema.prisma` is set up correctly (it is currently set to use `DATABASE_URL`).

### Option B: Neon / Supabase
1.  Create a project on [Neon](https://neon.tech) or [Supabase](https://supabase.com).
2.  Get the connection string (Transaction Pooler URL recommended for serverless).

## 2. Redis Setup (Upstash)

CodeRevAI uses Redis for rate limiting and caching.

1.  Go to [Upstash](https://upstash.com) and create an account.
2.  Create a new Redis database.
3.  In the database details, find the **REST API** section.
4.  Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

## 3. Environment Variables

Prepare the following environment variables. You will need to add these to your Vercel Project Settings.

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Your PostgreSQL connection string. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | From Clerk Dashboard. |
| `CLERK_SECRET_KEY` | From Clerk Dashboard. |
| `UPSTASH_REDIS_REST_URL` | From Upstash. |
| `UPSTASH_REDIS_REST_TOKEN` | From Upstash. |
| `GEMINI_API_KEY` | From Google AI Studio. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | From Stripe (optional). |
| `STRIPE_SECRET_KEY` | From Stripe (optional). |
| `STRIPE_WEBHOOK_SECRET` | From Stripe (optional). |

## 4. Deploying to Vercel

1.  **Import Project**:
    *   Go to your Vercel Dashboard and click "Add New..." -> "Project".
    *   Import your `CodeRevAI` repository from GitHub.

2.  **Configure Project**:
    *   **Framework Preset**: Next.js (should be auto-detected).
    *   **Root Directory**: `./` (default).
    *   **Build Command**: `next build` (default). *Note: We added a check-env script to the build process in package.json*.
    *   **Install Command**: `npm install` (default).

3.  **Environment Variables**:
    *   Expand the "Environment Variables" section.
    *   Add all the variables listed in Section 3.

4.  **Deploy**:
    *   Click "Deploy".
    *   Vercel will clone your repo, install dependencies, run `prisma generate` (via the `postinstall` script we added), and build your app.

## 5. Database Migration

After the initial deployment (or during the build if you prefer, but manual is safer for the first time), you need to push your database schema.

**Option A: Run from Local Machine (Recommended for first time)**
1.  Ensure your local `.env` file has the *production* `DATABASE_URL`.
2.  Run:
    ```bash
    npx prisma migrate deploy
    ```

**Option B: Run via Vercel Console**
1.  In your Vercel Project Dashboard, go to the "Settings" -> "Functions" tab (optional, usually not needed for this).
2.  Better yet, you can override the build command to include migration, but it's risky.
3.  Instead, you can use the Vercel CLI or just run the migration locally pointing to the prod DB.

## 6. Scripts

We have added the following scripts to `package.json` to assist with deployment:

*   `postinstall`: Automatically runs `prisma generate` after dependencies are installed. This ensures the Prisma Client is available during the build.
*   `db:deploy`: Runs `prisma migrate deploy` to apply pending migrations to the database.
*   `check-env`: Checks if required environment variables are present. This runs automatically before `next build`.

## Troubleshooting

*   **Build Fails on Prisma**: Ensure `DATABASE_URL` is set in the environment variables.
*   **Missing Env Vars**: The build will fail if required variables are missing due to the `check-env` script. Check the build logs for details.
*   **500 Errors**: Check Vercel Runtime Logs. often due to missing database connection or Redis credentials.
