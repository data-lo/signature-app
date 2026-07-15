import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },

  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL;

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`, 
      },
    ];
  },
};

export default nextConfig;