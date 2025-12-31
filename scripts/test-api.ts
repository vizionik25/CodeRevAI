
import { POST as reviewCodePost } from '../app/api/review-code/route';
import { POST as reviewRepoPost } from '../app/api/review-repo/route';
import { apiKeyService } from '../app/services/apiKeyService';
import { prisma } from '../app/lib/prisma';
import { NextRequest } from 'next/server';

// Polyfill for Request if needed, but tsx should handle it or use global Request
// We'll use NextRequest to be safe if we can, otherwise standard Request

async function main() {
    console.log('🚀 Starting API Handler Verification...');

    // 1. Setup Auth
    const TEST_USER_ID = `user_test_${Date.now()}`;
    console.log(`✅ Using Test User ID: ${TEST_USER_ID}`);
    const { key, keyId } = await apiKeyService.createApiKey(TEST_USER_ID, 'Test Key');
    console.log(`✅ Generated Key: ${key.substring(0, 10)}...`);

    try {
        // 2. Test review-code handler
        console.log('\n🧪 Testing review-code handler...');

        const codeBody = {
            code: "function test() { console.log('test'); }",
            language: "javascript",
            reviewModes: ["clean-code"]
        };

        const codeReq = new NextRequest(new URL('http://localhost/api/review-code'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify(codeBody)
        });

        const codeRes = await reviewCodePost(codeReq);
        console.log(`Status: ${codeRes.status}`);

        if (codeRes.status === 200) {
            const data = await codeRes.json();
            console.log('✅ review-code success!');
            // console.log(data);
        } else {
            console.error('❌ review-code failed', await codeRes.text());
        }

        // 3. Test review-repo handler
        console.log('\n🧪 Testing review-repo handler...');

        const repoBody = {
            files: [{ path: "test.js", content: "console.log('repo')" }],
            repoUrl: "https://github.com/test/repo",
            reviewModes: ["security"]
        };

        const repoReq = new NextRequest(new URL('http://localhost/api/review-repo'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify(repoBody)
        });

        const repoRes = await reviewRepoPost(repoReq);
        console.log(`Status: ${repoRes.status}`);

        if (repoRes.status === 200) {
            const data = await repoRes.json();
            console.log('✅ review-repo success!');
        } else {
            console.error('❌ review-repo failed', await repoRes.text());
        }

    } catch (err) {
        console.error('❌ Verification Error:', err);
    } finally {
        // Cleanup
        await apiKeyService.revokeApiKey(keyId, TEST_USER_ID);
        await prisma.$disconnect();
        console.log('\n✅ Cleanup done.');
    }
}

main();
