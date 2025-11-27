/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // PHP files accessed directly from XAMPP via lib/api.ts
};

module.exports = nextConfig;