
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking database connection...');
    try {
        const count = await prisma.apiKey.count();
        console.log(`✅ Success! ApiKey table exists. Count: ${count}`);
    } catch (e) {
        console.error('❌ Error querying ApiKey table:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
