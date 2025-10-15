/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker/Cloud Run deployment
  output: 'standalone',
  
  // Optimize for production
  reactStrictMode: true,
  
  // Compress responses
  compress: true,
  
  // Performance optimizations
  swcMinify: true,
  
  // Image optimization (if using next/image)
  images: {
    domains: [],
    unoptimized: false,
  },
  
  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
};

module.exports = nextConfig;
