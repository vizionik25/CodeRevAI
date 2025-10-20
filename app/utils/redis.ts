import { Redis } from '@upstash/redis';
import { serverEnv } from '../config/env';
import { logger } from './logger';

// Lazy initialization to avoid build-time errors
let redisInstance: Redis | null = null;

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  state: 'CLOSED'
};

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  FAILURE_THRESHOLD: 5,        // Open circuit after 5 consecutive failures
  RESET_TIMEOUT: 60000,        // Try to close after 60 seconds
  HALF_OPEN_ATTEMPTS: 1,       // Allow 1 request in half-open state
};

export function getRedis(): Redis {
  // Skip initialization during build time
  if (typeof window === 'undefined' && !serverEnv.UPSTASH_REDIS_REST_URL) {
    // Return a dummy instance during build - it will never be called
    return {} as Redis;
  }
  
  if (!redisInstance) {
    if (!serverEnv.UPSTASH_REDIS_REST_URL || !serverEnv.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Redis configuration missing. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
    }
    
    redisInstance = new Redis({
      url: serverEnv.UPSTASH_REDIS_REST_URL,
      token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redisInstance;
}

/**
 * Check circuit breaker state and update if needed
 */
function checkCircuitBreaker(): boolean {
  const now = Date.now();
  
  // If circuit is open, check if we should try half-open
  if (circuitBreaker.state === 'OPEN') {
    if (now - circuitBreaker.lastFailureTime >= CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT) {
      logger.info('Circuit breaker transitioning to HALF_OPEN state');
      circuitBreaker.state = 'HALF_OPEN';
      return true; // Allow request in half-open state
    }
    return false; // Circuit is open, reject request
  }
  
  return true; // Circuit is closed or half-open, allow request
}

/**
 * Record circuit breaker failure
 */
function recordFailure() {
  circuitBreaker.failures++;
  circuitBreaker.lastFailureTime = Date.now();
  
  if (circuitBreaker.failures >= CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD) {
    if (circuitBreaker.state !== 'OPEN') {
      logger.error('Circuit breaker OPENED due to consecutive failures', {
        failures: circuitBreaker.failures,
        threshold: CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD
      });
      circuitBreaker.state = 'OPEN';
    }
  }
}

/**
 * Record circuit breaker success
 */
function recordSuccess() {
  if (circuitBreaker.state === 'HALF_OPEN') {
    logger.info('Circuit breaker CLOSED after successful request');
    circuitBreaker.state = 'CLOSED';
    circuitBreaker.failures = 0;
  } else if (circuitBreaker.state === 'CLOSED' && circuitBreaker.failures > 0) {
    // Reset failure count on success
    circuitBreaker.failures = 0;
  }
}

/**
 * Distributed rate limiting using Redis with circuit breaker
 * Works across multiple instances/containers
 * 
 * @param identifier - Unique identifier for rate limiting (e.g., `userId:endpoint`)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @param failClosed - If true, denies requests when Redis is unavailable (default: false for backwards compatibility)
 */
export async function checkRateLimitRedis(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000, // 1 minute
  failClosed: boolean = false
): Promise<{ allowed: boolean; remaining: number; resetTime: number; circuitOpen?: boolean }> {
  const key = `rate-limit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Check circuit breaker state
  if (!checkCircuitBreaker()) {
    logger.warn('Rate limit check blocked by circuit breaker', { identifier });
    
    if (failClosed) {
      // Fail closed: deny the request
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: now + windowMs,
        circuitOpen: true
      };
    } else {
      // Fail open: allow the request (backwards compatible)
      return { 
        allowed: true, 
        remaining: limit, 
        resetTime: now + windowMs,
        circuitOpen: true
      };
    }
  }

  try {
    // Use Redis sorted set to track requests within time window
    const redisClient = getRedis();
    const pipeline = redisClient.pipeline();
    
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

    // Record success for circuit breaker
    recordSuccess();

    return { allowed, remaining, resetTime };
  } catch (error) {
    logger.error('Redis rate limit error:', error);
    
    // Record failure for circuit breaker
    recordFailure();
    
    if (failClosed) {
      // Fail closed: deny the request to prevent abuse during Redis outage
      logger.warn('Rate limit failing closed due to Redis error', { identifier });
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: now + windowMs 
      };
    } else {
      // Fail open: allow the request (backwards compatible behavior)
      logger.warn('Rate limit failing open due to Redis error', { identifier });
      return { 
        allowed: true, 
        remaining: limit, 
        resetTime: now + windowMs 
      };
    }
  }
}

/**
 * Get current circuit breaker status for monitoring
 */
export function getCircuitBreakerStatus() {
  return {
    state: circuitBreaker.state,
    failures: circuitBreaker.failures,
    lastFailureTime: circuitBreaker.lastFailureTime,
    isOpen: circuitBreaker.state === 'OPEN'
  };
}
