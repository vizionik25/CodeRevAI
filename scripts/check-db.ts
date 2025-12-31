
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking database connection...');
    try {
        const count = await prisma.apiKey.count();
        console.log(`✅ Success! ApiKey table exists. Count: ${count}`);
        if (count > 0) {
            const keys = await prisma.apiKey.findMany({ take: 5 });
            console.log('Sample keys:', keys.map(k => ({ id: k.id, name: k.name })));
        } else {
            console.log('Table is empty.');
        }
    } catch (e) {
        console.error('❌ Error querying ApiKey table:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
