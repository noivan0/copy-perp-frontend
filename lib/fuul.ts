/**
 * Fuul SDK integration (frontend) — SSR-safe, graceful degradation
 */

const FUUL_API_KEY = process.env.NEXT_PUBLIC_FUUL_API_KEY ?? '';
const IS_MOCK = !FUUL_API_KEY || FUUL_API_KEY === 'mock';

export async function fuulPageview(): Promise<void> {
  if (IS_MOCK || typeof window === 'undefined') return;
  try {
    const mod = await import('@fuul/sdk');
    if (!(window as Window & { __fuulInit?: boolean }).__fuulInit) {
      mod.Fuul.init({ apiKey: FUUL_API_KEY });
      (window as Window & { __fuulInit?: boolean }).__fuulInit = true;
    }
    await mod.Fuul.sendPageview();
  } catch {}
}

export async function fuulConnectWallet(address: string): Promise<void> {
  if (IS_MOCK || typeof window === 'undefined') return;
  try {
    const mod = await import('@fuul/sdk');
    // sendEvent for wallet connect tracking
    await mod.Fuul.sendEvent('connect_wallet', { address });
  } catch {}
}

export function getReferralLink(address: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}?ref=${address.slice(0, 8)}`;
}

export function extractRefCode(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('ref');
}
