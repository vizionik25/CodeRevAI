#!/usr/bin/env node

// Load environment variables BEFORE any imports
require('dotenv').config({ path: '.env.local' });

// Verify env vars are loaded
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error('❌ Environment variables not loaded correctly');
  console.error('UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL || 'MISSING');
  console.error('UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? 'SET' : 'MISSING');
  process.exit(1);
}

const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function checkRateLimitRedis(identifier, limit = 10, windowMs = 60000) {
  const key = `rate-limit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, { score: now, member: `${now}` });
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    const count = results[2];

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const resetTime = now + windowMs;

    return { allowed, remaining, resetTime };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    return { allowed: true, remaining: limit, resetTime: now + windowMs };
  }
}

async function testRedis() {
  console.log('🧪 Testing Redis connection...\n');
  
  console.log('Environment check:');
  console.log('- UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? '✓ Set' : '✗ Missing');
  console.log('- UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✓ Set' : '✗ Missing');
  console.log('');
  
  try {
    // Test 1: Basic set/get
    console.log('Test 1: Basic set/get');
    await redis.set('test-key', 'Hello Redis!');
    const value = await redis.get('test-key');
    console.log('✓ Redis set/get works:', value);
    console.log('');
    
    // Test 2: Rate limiting
    console.log('Test 2: Rate limiting (limit: 5 requests)');
    for (let i = 1; i <= 7; i++) {
      const result = await checkRateLimitRedis('test-user', 5, 60000);
      console.log(`Request ${i}: ${result.allowed ? '✓ Allowed' : '✗ Blocked'} - Remaining: ${result.remaining}`);
    }
    console.log('');
    
    // Test 3: Cleanup
    console.log('Test 3: Cleanup');
    await redis.del('test-key');
    await redis.del('rate-limit:test-user');
    console.log('✓ Cleanup successful');
    console.log('');
    
    console.log('🎉 All Redis tests passed!');
  } catch (error) {
    console.error('✗ Redis test failed:', error);
    process.exit(1);
  }
}

testRedis();
