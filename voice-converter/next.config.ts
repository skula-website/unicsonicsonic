import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    unoptimized: true, // Compatibility med forskellige hosting setups
  },
  
  // Deaktiver development indicators
  devIndicators: false,
  
  // Experimental features for body size limit
  experimental: {
    // Increase body size limit for Server Actions and API routes
    serverActions: {
      bodySizeLimit: '100mb', // Allow large audio files (default is 1mb)
    },
  },
  
  // Turbopack configuration (Next.js 16+)
  turbopack: {
    // Empty config to acknowledge we're using Turbopack
    // The venv directory will be ignored via .gitignore
  },
};

export default nextConfig;
