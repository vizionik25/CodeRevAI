/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker/Cloud Run deployment
  output: 'standalone',
  
  // Optimize for production
  reactStrictMode: true,
  
  // Compress responses
  compress: true,
  
  // Image optimization (if using next/image)
  images: {
    domains: [],
    unoptimized: false,
  },
  
  // Environment variables that should be available on the client
  // Note: NEXT_PUBLIC_* variables are automatically exposed to the browser
  // Only list variables here if you need to ensure they're bundled at build time
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PRICE_ID_PRO: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO,
  },
};

module.exports = nextConfig;
