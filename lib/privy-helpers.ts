/**
 * Privy 헬퍼 함수
 * - Solana 임베디드 지갑 주소 추출
 * - 메시지 서명 (Builder Code approve용)
 * - 레퍼럴 코드 연동
 */

import type { User } from '@privy-io/react-auth';

/**
 * Privy user에서 Solana 지갑 주소 추출
 * 임베디드 지갑 우선, 없으면 외부 연결 지갑
 */
export function getSolanaAddress(user: User | null): string | undefined {
  if (!user) return undefined;
  
  const accounts = (user.linkedAccounts ?? []) as Array<{
    type: string;
    chainType?: string;
    walletClientType?: string;
    address?: string;
  }>;

  // 1순위: Privy 임베디드 Solana 지갑
  const embedded = accounts.find(
    a => a.type === 'wallet' && a.chainType === 'solana' && a.walletClientType === 'privy'
  );
  if (embedded?.address) return embedded.address;

  // 2순위: 외부 연결 Solana 지갑 (Phantom 등)
  const external = accounts.find(
    a => a.type === 'wallet' && a.chainType === 'solana'
  );
  if (external?.address) return external.address;

  // 3순위: chainType 없이 wallet 타입 (일부 Privy 버전 호환)
  const anyWallet = accounts.find(
    a => a.type === 'wallet' && a.address && !a.chainType?.startsWith('eip155')
  );
  return anyWallet?.address;
}

/**
 * Privy user에서 이메일 추출
 */
export function getUserEmail(user: User | null): string | undefined {
  if (!user) return undefined;
  return user.email?.address;
}

/**
 * Privy user ID (did:privy:xxx 형식)
 */
export function getPrivyUserId(user: User | null): string | undefined {
  return user?.id;
}

/**
 * 온보딩 payload 생성
 * LoginModal → /followers/onboard 호출 시 사용
 */
export interface OnboardPayload {
  follower_address: string;
  copy_ratio: number;
  max_position_usdc: number;
  referrer_address?: string;
  privy_user_id?: string;
}

export function buildOnboardPayload(
  user: User,
  options: {
    copyRatio?: number;
    maxPositionUsdc?: number;
    referrerAddress?: string;
    traderAddress?: string;
  } = {}
): OnboardPayload | null {
  const address = getSolanaAddress(user);
  if (!address) return null;
  
  return {
    follower_address: address,
    copy_ratio: options.copyRatio ?? 0.1,
    max_position_usdc: options.maxPositionUsdc ?? 50,
    referrer_address: options.referrerAddress,
    privy_user_id: getPrivyUserId(user),
  };
}

/**
 * Solana 주소 형식 검증
 */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * 주소 축약 표시
 */
export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}
