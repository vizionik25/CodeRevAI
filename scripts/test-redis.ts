// Load environment variables FIRST before any imports
import { config } from 'dotenv';
config({ path: '.env.local' });

// Now import after env vars are loaded
import { redis, checkRateLimitRedis } from '../app/utils/redis';

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
