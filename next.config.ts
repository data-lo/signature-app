import type { NextConfig } from 'next';

console.log('[next.config.ts] BACKEND_API_URL:', process.env.BACKEND_API_URL);

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },

  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:3000';

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;