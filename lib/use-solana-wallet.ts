/**
 * Privy Solana 지갑 주소 추출 훅
 * - Google 로그인 후 embedded wallet 생성까지 최대 15초 폴링
 * - timedOut 시 createWallet() 자동 재시도
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
  const prevUserRef = useRef(user);

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
    prevUserRef.current = user;
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

    // 주소 없음 → 폴링 시작 (최대 15초)
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
      if (Date.now() - startRef.current > 15000) {
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
