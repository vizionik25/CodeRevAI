import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Upstash Redis with pipeline support
const mockPipeline = {
  zremrangebyscore: vi.fn().mockReturnThis(),
  zadd: vi.fn().mockReturnThis(),
  zcard: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn(),
};

const mockRedis = {
  pipeline: vi.fn(() => mockPipeline),
};

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => mockRedis),
}));

// Mock environment
vi.mock('../config/env', () => ({
  serverEnv: {
    UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'test_token',
  },
}));

// Import after mocking
import { checkRateLimitRedis, getCircuitBreakerStatus } from '@/app/utils/redis';

describe('Redis Rate Limiting - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRateLimitRedis', () => {
    it('should allow request when under rate limit', async () => {
      // Mock Redis pipeline execution - count is 1 (first request)
      mockPipeline.exec.mockResolvedValue([
        null, // zremrangebyscore result
        null, // zadd result  
        1,    // zcard result (count)
        null  // expire result
      ]);

      const result = await checkRateLimitRedis('test-key', 10, 60000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // 10 - 1 = 9
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should deny request when over rate limit', async () => {
      // Mock Redis pipeline execution - count is 11 (over limit of 10)
      mockPipeline.exec.mockResolvedValue([
        null, // zremrangebyscore result
        null, // zadd result  
        11,   // zcard result (count exceeds limit)
        null  // expire result
      ]);

      const result = await checkRateLimitRedis('test-key', 10, 60000);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle exactly at limit correctly', async () => {
      // Mock count exactly at limit (10 out of 10)
      mockPipeline.exec.mockResolvedValue([null, null, 10, null]);

      const result = await checkRateLimitRedis('test-key', 10, 60000);

      expect(result.allowed).toBe(true); // At limit should be allowed (count <= limit)
      expect(result.remaining).toBe(0); // 10 - 10 = 0
    });

    it('should provide reset timestamp', async () => {
      mockPipeline.exec.mockResolvedValue([null, null, 1, null]);

      const beforeTime = Date.now();
      const result = await checkRateLimitRedis('test-key', 10, 60000);
      const afterTime = Date.now();

      expect(result.resetTime).toBeGreaterThanOrEqual(beforeTime + 60000);
      expect(result.resetTime).toBeLessThanOrEqual(afterTime + 60000);
    });

    it('should build correct Redis pipeline operations', async () => {
      mockPipeline.exec.mockResolvedValue([null, null, 1, null]);

      await checkRateLimitRedis('user-123', 10, 60000);

      // Check that pipeline operations were called
      expect(mockPipeline.zremrangebyscore).toHaveBeenCalled();
      expect(mockPipeline.zadd).toHaveBeenCalled();
      expect(mockPipeline.zcard).toHaveBeenCalled();
      expect(mockPipeline.expire).toHaveBeenCalled();
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis errors with fail-open strategy (default)', async () => {
      // Mock Redis error
      mockPipeline.exec.mockRejectedValue(new Error('Redis connection failed'));

      const result = await checkRateLimitRedis('test-key', 10, 60000); // fail-open default

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10); // Default to full limit
    });

    it('should handle Redis errors with fail-closed strategy', async () => {
      // Mock Redis error
      mockPipeline.exec.mockRejectedValue(new Error('Redis connection failed'));

      const result = await checkRateLimitRedis('test-key', 10, 60000, true); // fail-closed

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('Circuit Breaker Monitoring', () => {
    it('should return circuit breaker status', () => {
      const status = getCircuitBreakerStatus();
      
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('failures');
      expect(status).toHaveProperty('lastFailureTime');
      expect(status).toHaveProperty('isOpen');
      expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(status.state);
    });
  });
});