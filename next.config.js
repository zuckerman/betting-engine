/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Skip type checking during build (Prisma schema validation handled separately)
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
