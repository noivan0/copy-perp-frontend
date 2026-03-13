'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { getSolanaAddress, truncateAddress } from '@/lib/privy-helpers';
import { getReferralLink, extractRefCode, fuulPageview, fuulConnectWallet } from '@/lib/fuul';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

/**
 * 레퍼럴 배너 컴포넌트
 * - URL ref 파라미터 감지 → 백엔드 기록
 * - 로그인된 유저의 레퍼럴 링크 표시 + 복사
 * - Fuul 포인트 표시
 */
export function ReferralBanner() {
  const { user, authenticated } = usePrivy();
  const [copied, setCopied] = useState(false);
  const [points, setPoints] = useState<number | null>(null);
  const [refCode] = useState(() => typeof window !== 'undefined' ? extractRefCode() : null);

  const address = getSolanaAddress(user ?? null);
  const referralLink = address ? getReferralLink(address) : null;

  // 페이지뷰 이벤트
  useEffect(() => { fuulPageview(); }, []);

  // ref 코드 감지 → 백엔드 저장
  useEffect(() => {
    if (!refCode || !address) return;
    fetch(`${API_URL}/fuul/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrer: refCode, referee: address }),
    }).catch(() => {});
  }, [refCode, address]);

  // 지갑 연결 이벤트
  useEffect(() => {
    if (!authenticated || !address) return;
    fuulConnectWallet(address).catch(() => {});
  }, [authenticated, address]);

  // Fuul 포인트 조회
  useEffect(() => {
    if (!address) return;
    fetch(`${API_URL}/referral/${address}`)
      .then(r => r.json())
      .then(d => setPoints(d.points ?? 0))
      .catch(() => {});
  }, [address]);

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!authenticated) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-700/50 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-2xl">🎁</div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white">내 레퍼럴 링크</div>
          <div className="text-xs text-indigo-300 font-mono truncate">
            {referralLink ?? '지갑 연결 필요'}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 flex-shrink-0">
        {points !== null && (
          <div className="text-right">
            <div className="text-xs text-gray-400">Fuul 포인트</div>
            <div className="text-sm font-bold text-yellow-400">{points.toFixed(1)} pts</div>
          </div>
        )}
        <button
          onClick={copyLink}
          disabled={!referralLink}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          {copied ? '✅ 복사됨' : '링크 복사'}
        </button>
      </div>
    </div>
  );
}

/**
 * ref 코드 알림 배너 (URL에 ?ref= 있을 때)
 */
export function RefCodeNotice() {
  const [refCode] = useState(() => typeof window !== 'undefined' ? extractRefCode() : null);
  const [visible, setVisible] = useState(true);

  if (!refCode || !visible) return null;

  return (
    <div className="bg-green-900/40 border border-green-700/50 rounded-xl p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span>🤝</span>
        <span className="text-sm text-green-300">
          레퍼럴 코드 <span className="font-mono font-bold">{refCode}</span>로 초대받았습니다
        </span>
      </div>
      <button onClick={() => setVisible(false)} className="text-gray-500 hover:text-white text-sm">✕</button>
    </div>
  );
}
