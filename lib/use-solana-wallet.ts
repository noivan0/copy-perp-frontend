/**
 * Privy Solana 지갑 주소 추출 훅
 * - Google 로그인 후 embedded wallet 생성까지 최대 10초 폴링
 * - timedOut 시 Privy user ID (did:privy:xxx)를 fallback으로 반환
 *   → 백엔드에서 did:privy: 형식을 유효 follower identifier로 허용
 */
'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useRef, useState, useCallback } from 'react';

function extractSolana(user: ReturnType<typeof usePrivy>['user']): string | undefined {
  if (!user) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = user.linkedAccounts as any[];
  // 1순위: Privy embedded solana wallet
  const embedded = accounts?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => a.type === 'wallet' && a.chainType === 'solana' && a.walletClientType === 'privy'
  );
  if (embedded?.address) return embedded.address;
  // 2순위: 외부 연결된 Solana 지갑 (Phantom 등)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ext = accounts?.find((a: any) => a.type === 'wallet' && a.chainType === 'solana');
  return ext?.address;
}

export function useSolanaWallet() {
  const { user, authenticated } = usePrivy();
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => {
    // user 객체 변경 시 지갑 재추출
    const addr = extractSolana(user);
    if (addr && addr !== address) {
      setAddress(addr);
      setLoading(false);
      setTimedOut(false);
      stopPolling();
    }
  }, [user, address, stopPolling]);

  useEffect(() => {
    if (!authenticated) {
      setAddress(undefined);
      setLoading(false);
      setTimedOut(false);
      stopPolling();
      return;
    }

    const addr = extractSolana(user);
    if (addr) {
      setAddress(addr);
      setLoading(false);
      setTimedOut(false);
      return;
    }

    // Solana 지갑 없음 → 폴링 시작 (최대 10초)
    setLoading(true);
    setTimedOut(false);
    startRef.current = Date.now();

    pollRef.current = setInterval(() => {
      const a = extractSolana(user);
      if (a) {
        setAddress(a);
        setLoading(false);
        stopPolling();
        return;
      }
      if (Date.now() - startRef.current > 10000) {
        // 10초 후 Privy user ID로 fallback (did:privy:xxx)
        // 백엔드에서 유효한 식별자로 허용됨
        const fallback = user?.id;
        setAddress(fallback ?? undefined);
        setLoading(false);
        setTimedOut(true);
        stopPolling();
      }
    }, 300);

    return stopPolling;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  return { address, loading, timedOut };
}
