import type { NextConfig } from "next";

// 실제 프로덕트 기준 보안 헤더
const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ['bs58', 'base-x'],
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  env: {
    BUILD_TIME: new Date().toISOString(),
  },
  images: {
    // Pacifica DEX 관련 이미지 도메인 허용 (필요 시 추가)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pacifica.fi',
      },
      {
        protocol: 'https',
        hostname: '**.pacifica.fi',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
