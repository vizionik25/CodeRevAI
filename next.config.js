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

  webpack: (config, { isServer }) => {
    // Exclude server-only modules from client-side bundle
    if (!isServer) {
      config.resolve.alias['@google-cloud/logging'] = false;
    }

    return config;
  },
};

module.exports = nextConfig;
