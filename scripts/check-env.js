const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Fallback to .env

// Load environment variables from .env.local if present
// Note: In production (Vercel), these are set in the environment, not a file.
// This script checks process.env.

const requiredVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    // Optional but recommended for full functionality
    // 'STRIPE_SECRET_KEY',
    // 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    // 'STRIPE_WEBHOOK_SECRET',
    // 'GEMINI_API_KEY' // Assuming this is the name used in the app
];

const missingVars = [];

console.log('Checking environment variables...');

requiredVars.forEach(varName => {
    if (!process.env[varName]) {
        // Check if it's optional
        if (varName.startsWith('STRIPE') || varName.startsWith('GEMINI')) {
            console.warn(`Warning: Optional variable ${varName} is missing.`);
        } else {
            missingVars.push(varName);
        }
    }
});

if (missingVars.length > 0) {
    console.error('Error: The following required environment variables are missing:');
    missingVars.forEach(v => console.error(`- ${v}`));
    console.error('\nPlease set these variables in your Vercel project settings or .env.local file.');
    process.exit(1);
}

console.log('Environment variable check passed.');
