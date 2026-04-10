/**
 * Privy 헬퍼 함수
 * - Solana 임베디드/외부 지갑 주소 추출
 * - Privy user ID fallback (지갑 없어도 식별자 확보)
 */

import type { User } from '@privy-io/react-auth';

/**
 * Privy user에서 Solana 지갑 주소 추출
 * 없으면 Privy user ID (did:privy:xxx) fallback
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

  // 3순위: chainType 없는 wallet (일부 Privy 버전 호환)
  const anyWallet = accounts.find(
    a => a.type === 'wallet' && a.address && !a.chainType?.startsWith('eip155')
  );
  if (anyWallet?.address) return anyWallet.address;

  // 4순위: Privy user ID (did:privy:xxx) — 지갑 없는 Google/Email 유저 fallback
  // 백엔드에서 유효한 식별자로 사용 가능
  return user.id ?? undefined;
}

/**
 * 사용자가 실제 Solana 지갑을 갖고 있는지 (user.id fallback 제외)
 */
export function hasSolanaWallet(user: User | null): boolean {
  if (!user) return false;
  const accounts = (user.linkedAccounts ?? []) as Array<{ type: string; chainType?: string; address?: string }>;
  return accounts.some(a => a.type === 'wallet' && a.chainType === 'solana' && a.address);
}

/**
 * Privy user에서 이메일 추출
 */
export function getUserEmail(user: User | null): string | undefined {
  if (!user) return undefined;
  return (user as any).email?.address;
}

/**
 * Privy user ID (did:privy:xxx 형식)
 */
export function getPrivyUserId(user: User | null): string | undefined {
  return user?.id;
}

/**
 * 주소 축약 표시
 */
export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  if (address.startsWith('did:privy:')) {
    return `${address.slice(0, 14)}...`;
  }
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

/**
 * Solana 주소 형식 검증
 */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}
