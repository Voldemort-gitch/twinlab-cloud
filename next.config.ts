import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Allow client components to have dynamic behavior
  },
};

export default nextConfig;
