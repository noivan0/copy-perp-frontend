import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['bs58', 'base-x'],
};

export default nextConfig;
