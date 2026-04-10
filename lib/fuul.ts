/**
 * Fuul SDK 연동 (프론트엔드)
 * @fuul/sdk 최신 API 기반 (init, sendPageview, identifyUser, generateTrackingLink 등)
 * 
 * API 키 없으면 Mock 모드 자동 전환
 */

const FUUL_API_KEY = process.env.NEXT_PUBLIC_FUUL_API_KEY ?? '';
const IS_MOCK = !FUUL_API_KEY || FUUL_API_KEY === 'mock' || FUUL_API_KEY.startsWith('placeholder');

let _initialized = false;

async function getFuul() {
  if (typeof window === 'undefined') return null;
  const mod = await import('@fuul/sdk');
  if (!_initialized) {
    mod.Fuul.init({ apiKey: FUUL_API_KEY });
    _initialized = true;
  }
  return mod.Fuul;
}

/**
 * 페이지뷰 이벤트
 */
export async function fuulPageview(): Promise<void> {
  if (IS_MOCK) { console.log('[Fuul Mock] pageview'); return; }
  try {
    const fuul = await getFuul();
    await fuul?.sendPageview();
  } catch (e) {
    console.warn('[Fuul] pageview error:', e);
  }
}

/**
 * 지갑 연결 이벤트 (identifyUser)
 */
export async function fuulConnectWallet(address: string): Promise<void> {
  if (IS_MOCK) { console.log('[Fuul Mock] identifyUser:', address.slice(0, 8)); return; }
  try {
    const fuul = await getFuul();
    // Fuul SDK: identifyUser({ identifier, identifierType })
    await fuul?.identifyUser({ identifier: address, identifierType: 'solana_address' as never });
    console.log('[Fuul] identifyUser:', address.slice(0, 8));
  } catch (e) {
    console.warn('[Fuul] identifyUser error:', e);
  }
}

/**
 * 팔로우 이벤트 → 백엔드 경유 (Fuul SDK는 서버 사이드 이벤트)
 */
export async function fuulTrackFollow(
  followerAddress: string,
  traderAddress: string,
): Promise<void> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://copy-perp.onrender.com';
  if (IS_MOCK) {
    console.log('[Fuul Mock] follow:', followerAddress.slice(0, 8), '->', traderAddress.slice(0, 8));
    return;
  }
  try {
    await fetch(`${API_URL}/fuul/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrer: traderAddress, referee: followerAddress }),
    });
  } catch (e) {
    console.warn('[Fuul] track follow error:', e);
  }
}

/**
 * 레퍼럴 트래킹 링크 생성 (Fuul SDK generateTrackingLink)
 */
export async function getFuulTrackingLink(address: string): Promise<string | null> {
  if (IS_MOCK) return getReferralLink(address);
  try {
    const fuul = await getFuul();
    if (!fuul) return getReferralLink(address);
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://copy-perp.vercel.app';
    // generateTrackingLink(landingUrl, identifier, affiliateCode?, opts?)
    const link = await (fuul.generateTrackingLink as unknown as (url: string, id: string) => Promise<string>)(base, address);
    return typeof link === 'string' ? link : getReferralLink(address);
  } catch {
    return getReferralLink(address);
  }
}

/**
 * 레퍼럴 링크 생성 (fallback)
 */
export function getReferralLink(address: string): string {
  const base = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://copy-perp.vercel.app';
  return `${base}/?ref=${address.slice(0, 8)}`;
}

/**
 * URL에서 ref 코드 추출
 */
export function extractRefCode(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('ref');
}
