import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Next.js to use the PORT env var that Render injects
  serverExternalPackages: [],
};

export default nextConfig;
