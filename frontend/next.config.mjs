/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_INTERNAL_API_URL || 'http://localhost:5000/api/:path*'
      }
    ];
  }
};

export default nextConfig;
