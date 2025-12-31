import { apiKeyService } from '../app/services/apiKeyService';
import { prisma } from '../app/lib/prisma';

async function main() {
    console.log('🐞 Debugging apiKeyService...');

    try {
        console.log('Checking Prisma connection...');
        await prisma.$connect();
        console.log('✅ Prisma connected');

        const testUserId = 'test_user_debug';
        console.log(`Listing keys for ${testUserId}...`);

        const keys = await apiKeyService.listApiKeys(testUserId);
        console.log('✅ listApiKeys returned:', keys);

    } catch (e) {
        console.error('❌ Debug failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
