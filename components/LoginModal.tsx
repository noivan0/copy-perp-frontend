'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (address: string) => void;
  /** 로그인 후 자동으로 traderAddress 팔로우 */
  followAfterLogin?: string;
}

export function LoginModal({ isOpen, onClose, onSuccess, followAfterLogin }: LoginModalProps) {
  const { ready, authenticated, login, user } = usePrivy();
  const [onboarding, setOnboarding] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solanaWallet = (user?.linkedAccounts as any[])?.find(
    (a: any) => a.type === 'wallet' && a.chainType === 'solana'
  );
  const address: string | undefined = solanaWallet?.address;

  // 로그인 완료 후 onboard 자동 호출
  useEffect(() => {
    if (!authenticated || !address || onboarding || done) return;

    const doOnboard = async () => {
      setOnboarding(true);
      setError('');
      try {
        const body: Record<string, unknown> = {
          follower_address: address,
          copy_ratio: 0.1,
          max_position_usdc: 50.0,
        };
        if (followAfterLogin) {
          body.trader_address = followAfterLogin;
        }
        const res = await fetch(`${API_URL}/followers/onboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.ok) {
          setDone(true);
          onSuccess?.(address);
        } else {
          setError(data.detail || '온보딩 오류');
        }
      } catch (e) {
        setError('서버 연결 오류');
        console.error(e);
      } finally {
        setOnboarding(false);
      }
    };
    doOnboard();
  }, [authenticated, address]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
        {/* 닫기 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-xl"
        >
          ✕
        </button>

        {done ? (
          /* ─ 완료 상태 ─ */
          <div className="text-center py-4">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-white mb-2">온보딩 완료!</h2>
            <p className="text-gray-400 text-sm mb-2">
              지갑 <span className="font-mono text-indigo-400">{address?.slice(0,8)}...</span>
            </p>
            {followAfterLogin && (
              <p className="text-green-400 text-sm mb-4">
                ✅ 트레이더 팔로우 완료 — 자동 복사 시작됩니다
              </p>
            )}
            <button
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              시작하기
            </button>
          </div>
        ) : !authenticated ? (
          /* ─ 로그인 전 ─ */
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">
                CP
              </div>
              <h2 className="text-xl font-bold text-white">Copy Perp 시작하기</h2>
              <p className="text-gray-400 text-sm mt-1">
                소셜 로그인으로 Solana 지갑이 자동 생성됩니다
              </p>
            </div>

            <div className="space-y-3">
              {/* Google 로그인 */}
              <button
                onClick={login}
                disabled={!ready}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google로 시작
              </button>

              {/* 지갑 연결 */}
              <button
                onClick={login}
                disabled={!ready}
                className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                <span className="text-lg">👻</span>
                지갑 연결 (Phantom / Solflare)
              </button>
            </div>

            <p className="text-center text-gray-600 text-xs mt-4">
              로그인 시 Solana 지갑이 자동 생성됩니다 · Non-custodial
            </p>
          </div>
        ) : (
          /* ─ 로그인 완료, 온보딩 중 ─ */
          <div className="text-center py-4">
            <div className="animate-spin w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">
              {onboarding ? '온보딩 중...' : '지갑 연결 중...'}
            </h2>
            <p className="text-gray-400 text-sm">
              {address ? `${address.slice(0,8)}...${address.slice(-4)}` : '지갑 주소 확인 중'}
            </p>
            {error && (
              <p className="text-red-400 text-sm mt-3">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
