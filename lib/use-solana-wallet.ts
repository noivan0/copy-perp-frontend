/**
 * Privy Solana 지갑 주소 추출 훅
 * - Google 로그인 후 embedded wallet 생성까지 최대 8초 폴링
 */
'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useRef, useState } from 'react';

function extractSolana(user: ReturnType<typeof usePrivy>['user']): string | undefined {
  if (!user) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = user.linkedAccounts as any[];
  const embedded = accounts?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => a.type === 'wallet' && a.chainType === 'solana' && a.walletClientType === 'privy'
  );
  if (embedded?.address) return embedded.address;
  // fallback: any solana wallet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any_sol = accounts?.find((a: any) => a.type === 'wallet' && a.chainType === 'solana');
  return any_sol?.address;
}

/**
 * 반환값:
 *  address  - 지갑 주소 (없으면 undefined)
 *  loading  - 로딩 중 (폴링 중)
 *  timedOut - 8초 내 지갑 생성 실패
 */
export function useSolanaWallet() {
  const { user, authenticated } = usePrivy();
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!authenticated) {
      setAddress(undefined);
      setLoading(false);
      setTimedOut(false);
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const addr = extractSolana(user);
    if (addr) {
      setAddress(addr);
      setLoading(false);
      setTimedOut(false);
      return;
    }

    // 주소 없음 → 폴링 시작
    setLoading(true);
    setTimedOut(false);
    startRef.current = Date.now();

    pollRef.current = setInterval(() => {
      const a = extractSolana(user);
      if (a) {
        setAddress(a);
        setLoading(false);
        clearInterval(pollRef.current!);
        return;
      }
      if (Date.now() - startRef.current > 8000) {
        setLoading(false);
        setTimedOut(true);
        clearInterval(pollRef.current!);
      }
    }, 500);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [authenticated, user]);

  return { address, loading, timedOut };
}
