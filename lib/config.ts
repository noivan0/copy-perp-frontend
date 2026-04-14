/**
 * 환경변수 중앙 관리
 * - NEXT_PUBLIC_* 는 빌드 시 번들에 포함됨 (클라이언트 안전)
 * - fallback은 개발 환경 편의용
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://copy-perp.onrender.com';

export const PRIVY_APP_ID =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? 'cmmvoxcix058e0ckv7uhp9ip0';

// 백엔드 Render 환경: NETWORK=mainnet — 프론트도 mainnet fallback으로 통일
export const NETWORK =
  process.env.NEXT_PUBLIC_NETWORK ?? 'mainnet';

export const IS_DEV =
  process.env.NODE_ENV === 'development';

// Copy trade defaults — synced with backend STRATEGY_PRESETS["safe"]
export const DEFAULT_COPY_RATIO = 0.10;        // 10% (mainnet default preset)
export const DEFAULT_MAX_POSITION_USDC = 300;  // $300 per position (mainnet default)
