import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },

  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:4000';

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`, 
      },
    ];
  },
};

export default nextConfig;