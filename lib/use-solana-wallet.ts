/**
 * Privy Solana 지갑 주소 추출 훅 v2
 * - Google 로그인 후 embedded wallet 생성까지 최대 30초 폴링
 * - timedOut 시 fallback 없이 "지갑 없음" 상태 유지 → 유저에게 안내
 */
'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useRef, useState, useCallback } from 'react';

function extractSolana(user: ReturnType<typeof usePrivy>['user']): string | undefined {
  if (!user) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = user.linkedAccounts as any[];
  if (!accounts) return undefined;
  // 1순위: Privy embedded solana wallet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const embedded = accounts.find((a: any) =>
    a.type === 'wallet' && a.chainType === 'solana' && a.walletClientType === 'privy'
  );
  if (embedded?.address) return embedded.address;
  // 2순위: 외부 연결 Solana 지갑 (Phantom 등)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ext = accounts.find((a: any) => a.type === 'wallet' && a.chainType === 'solana');
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

  // user 객체 변경 시 즉시 재추출
  useEffect(() => {
    const addr = extractSolana(user);
    if (addr) {
      setAddress(addr);
      setLoading(false);
      setTimedOut(false);
      stopPolling();
    }
  }, [user, stopPolling]);

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
      return;
    }

    // 지갑 없음 → 폴링 시작 (최대 30초, Privy 임베디드 지갑 생성 대기)
    setLoading(true);
    setTimedOut(false);
    startRef.current = Date.now();

    pollRef.current = setInterval(() => {
      const a = extractSolana(user);
      if (a) {
        setAddress(a);
        setLoading(false);
        setTimedOut(false);
        stopPolling();
        return;
      }
      const elapsed = Date.now() - startRef.current;
      if (elapsed > 30000) {
        // 30초 후 timedOut — fallback 없이 undefined 유지
        // → Follow 버튼에서 "Wallet not ready" 안내 + 재시도 버튼 표시
        setLoading(false);
        setTimedOut(true);
        stopPolling();
      }
    }, 500); // 500ms 간격으로 체크

    return stopPolling;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  return { address, loading, timedOut };
}
