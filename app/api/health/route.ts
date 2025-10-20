import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getRedis, getCircuitBreakerStatus } from '@/app/utils/redis';
import { logger } from '@/app/utils/logger';
import { historyQueue } from '@/app/utils/historyQueue';

/**
 * Health check endpoint
 * 
 * Checks connectivity and status of critical dependencies:
 * - Database (PostgreSQL via Prisma)
 * - Cache (Redis via Upstash)
 * - Circuit breaker state
 * 
 * Returns:
 * - 200: All systems operational
 * - 503: One or more systems degraded/unavailable
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'health-check';
  const startTime = Date.now();

  const circuitBreakerStatus = getCircuitBreakerStatus();

  const health = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    uptime: process.uptime(),
    checks: {
      database: {
        status: 'unknown' as 'up' | 'down' | 'unknown',
        latency: 0,
        error: undefined as string | undefined
      },
      redis: {
        status: 'unknown' as 'up' | 'down' | 'unknown',
        latency: 0,
        circuitBreaker: circuitBreakerStatus.state,
        error: undefined as string | undefined
      },
      historyQueue: historyQueue.getStats()
    }
  };

  // Check Database Connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database.status = 'up';
    health.checks.database.latency = Date.now() - dbStart;
    logger.debug('Database health check passed', {
      latency: `${health.checks.database.latency}ms`
    }, requestId);
  } catch (error) {
    health.checks.database.status = 'down';
    health.checks.database.error = error instanceof Error ? error.message : 'Unknown error';
    health.status = 'unhealthy';
    logger.error('Database health check failed', error, requestId);
  }

  // Check Redis Connectivity
  try {
    const redisStart = Date.now();
    const testKey = `health:${Date.now()}`;
    const redis = getRedis();
    
    // Set and get a test key
    await redis.set(testKey, 'ok', { ex: 5 });
    const result = await redis.get(testKey);
    
    if (result === 'ok') {
      health.checks.redis.status = 'up';
      health.checks.redis.latency = Date.now() - redisStart;
      logger.debug('Redis health check passed', {
        latency: `${health.checks.redis.latency}ms`,
        circuitBreaker: health.checks.redis.circuitBreaker
      }, requestId);
    } else {
      throw new Error('Redis get/set mismatch');
    }
  } catch (error) {
    health.checks.redis.status = 'down';
    health.checks.redis.error = error instanceof Error ? error.message : 'Unknown error';
    
    // If circuit breaker is open, this is expected
    if (circuitBreakerStatus.state === 'OPEN') {
      health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded';
      logger.warn('Redis health check failed (circuit breaker open)', {
        error: health.checks.redis.error
      }, requestId);
    } else {
      health.status = 'unhealthy';
      logger.error('Redis health check failed', error, requestId);
    }
  }

  // Overall status determination
  const allUp = health.checks.database.status === 'up' && health.checks.redis.status === 'up';
  const anyDown = health.checks.database.status === 'down' || health.checks.redis.status === 'down';
  
  if (allUp) {
    health.status = 'healthy';
  } else if (anyDown && health.checks.database.status === 'down') {
    // Database down is critical
    health.status = 'unhealthy';
  } else {
    // Redis down but database up = degraded (app can still function)
    health.status = 'degraded';
  }

  const totalLatency = Date.now() - startTime;
  logger.info('Health check completed', {
    status: health.status,
    totalLatency: `${totalLatency}ms`,
    dbStatus: health.checks.database.status,
    redisStatus: health.checks.redis.status
  }, requestId);

  const statusCode = health.status === 'healthy' ? 200 : 503;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'X-Request-ID': requestId,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
