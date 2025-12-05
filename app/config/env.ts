/**
 * Centralized environment variable configuration
 * Provides type-safe access to environment variables with validation
 */

// Client-side public environment variables
export const publicEnv = {
  CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  STRIPE_PRICE_ID_PRO: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO!,
} as const;

// Server-side only environment variables
export const serverEnv = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
  DATABASE_URL: process.env.DATABASE_URL!,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL!,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN!,
  STRIPE_PRICE_ID_PRO: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO!,
} as const;

/**
 * Validates that required environment variables are set
 * Call this during application initialization
 * In production mode, exits process if critical variables are missing
 */
export function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Validate public env vars (available in both client and server)
  const missingPublic: string[] = [];

  if (!publicEnv.CLERK_PUBLISHABLE_KEY) missingPublic.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  if (!publicEnv.STRIPE_PUBLISHABLE_KEY) missingPublic.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  if (!publicEnv.STRIPE_PRICE_ID_PRO) missingPublic.push('NEXT_PUBLIC_STRIPE_PRICE_ID_PRO');

  if (missingPublic.length > 0 && typeof window !== 'undefined') {
    const message = `Missing public environment variables: ${missingPublic.join(', ')}`;
    if (isProduction) {
      console.error('[FATAL]', message);
      // Cannot exit on client side, but log critical error
      throw new Error(message);
    } else {
      console.warn(message);
    }
  }

  // Validate server-side env vars (only on server)
  if (typeof window === 'undefined') {
    const missingServer: string[] = [];

    if (!serverEnv.GEMINI_API_KEY) missingServer.push('GEMINI_API_KEY');
    if (!serverEnv.CLERK_SECRET_KEY) missingServer.push('CLERK_SECRET_KEY');
    if (!serverEnv.STRIPE_SECRET_KEY) missingServer.push('STRIPE_SECRET_KEY');
    if (!serverEnv.STRIPE_WEBHOOK_SECRET) missingServer.push('STRIPE_WEBHOOK_SECRET');
    if (!serverEnv.DATABASE_URL) missingServer.push('DATABASE_URL');
    if (!serverEnv.UPSTASH_REDIS_REST_URL) missingServer.push('UPSTASH_REDIS_REST_URL');
    if (!serverEnv.UPSTASH_REDIS_REST_TOKEN) missingServer.push('UPSTASH_REDIS_REST_TOKEN');

    if (missingServer.length > 0) {
      const message = `Missing critical server environment variables: ${missingServer.join(', ')}`;
      console.error('[FATAL]', message);

      if (isProduction) {
        console.error('Application cannot start without required environment variables.');
        console.error('Please configure all required secrets in your deployment environment.');
        process.exit(1);
      }
    }
  }
}
