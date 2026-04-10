import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['bs58', 'base-x'],
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  env: {
    BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
