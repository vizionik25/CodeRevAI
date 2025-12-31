
import { logger } from '../app/utils/logger';

console.log('Testing logger...');

try {
    logger.info('Test info message', { foo: 'bar' });
    logger.error('Test error message', new Error('Test error'));
    console.log('✅ Logger worked without throwing.');
} catch (e) {
    console.error('❌ Logger failed:', e);
    process.exit(1);
}
