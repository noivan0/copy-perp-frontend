/* v2 */
'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { getSolanaAddress } from '@/lib/privy-helpers';
import { useSolanaWallet } from '@/lib/use-solana-wallet';
import { getReferralLink, extractRefCode, fuulPageview, fuulConnectWallet } from '@/lib/fuul';
import { API_URL } from '@/lib/config';


export function ReferralBanner() {
  const { user, authenticated } = usePrivy();
  const { loading: walletLoading } = useSolanaWallet();
  const [copied, setCopied] = useState(false);
  const [points, setPoints] = useState<number | null>(null);
  const [refCode] = useState(() => typeof window !== 'undefined' ? extractRefCode() : null);

  const address = getSolanaAddress(user ?? null);
  // Fall back to privy user ID if no Solana wallet yet
  const refKey = address ?? (user?.id ? user.id.replace('did:privy:', '').slice(0, 8) : null);
  const referralLink = refKey ? getReferralLink(refKey) : null;

  useEffect(() => { fuulPageview(); }, []);

  useEffect(() => {
    if (!refCode || !address) return;
    fetch(`${API_URL}/fuul/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrer: refCode, referee: address }),
    }).catch(() => {});
  }, [refCode, address]);

  useEffect(() => {
    if (!authenticated || !address) return;
    fuulConnectWallet(address).catch(() => {});
  }, [authenticated, address]);

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
          <div className="text-sm font-medium text-white">Your Referral Link</div>
          <div className="text-xs text-indigo-300 font-mono truncate">
            {referralLink ?? 'Connect wallet to get link'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {points != null && typeof points === 'number' && (
          <div className="text-right">
            <div className="text-xs text-gray-400">Fuul Points</div>
            <div className="text-sm font-bold text-yellow-400">{points.toFixed(1)} pts</div>
          </div>
        )}
        <button
          onClick={copyLink}
          disabled={!referralLink || walletLoading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          {walletLoading ? 'Loading…' : copied ? '✅ Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}

export function RefCodeNotice() {
  const [refCode] = useState(() => typeof window !== 'undefined' ? extractRefCode() : null);
  const [visible, setVisible] = useState(true);

  if (!refCode || !visible) return null;

  return (
    <div className="bg-green-900/40 border border-green-700/50 rounded-xl p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span>🤝</span>
        <span className="text-sm text-green-300">
          You were invited with referral code <span className="font-mono font-bold">{refCode}</span>
        </span>
      </div>
      <button onClick={() => setVisible(false)} className="text-gray-500 hover:text-white text-sm" aria-label="Dismiss referral notice">✕</button>
    </div>
  );
}
