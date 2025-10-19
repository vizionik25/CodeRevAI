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
