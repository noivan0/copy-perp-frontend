/* v3 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallet } from '@/lib/use-solana-wallet';
import { API_URL, DEFAULT_COPY_RATIO, DEFAULT_MAX_POSITION_USDC } from '@/lib/config';

function safeNum(v: unknown, fb = 0): number { const n = Number(v); return isFinite(n) ? n : fb; }


interface Trader {
  address: string;
  alias?: string;
  roi_30d: number;
  roi_7d: number;
  roi_1d: number;
  win_rate: number;
  profit_factor: number;
  score: number;
  pnl_30d: number;
  is_recommended?: boolean;
  active: number | boolean;
}

// Recommended: use API is_recommended field instead of hardcoded addresses

function RecommendedBadge({ alias }: { alias?: string }) {
  if (!alias) return null;
  if (alias.startsWith('TOP1')) return (
    <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded font-medium">🏆 #1</span>
  );
  if (alias.startsWith('TOP2')) return (
    <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded font-medium">⭐ TOP2</span>
  );
  if (alias.startsWith('TIERA') || alias.startsWith('TIER1')) return (
    <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded font-medium">✅ TIER1</span>
  );
  if (alias.startsWith('TIER2')) return (
    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded font-medium">🔵 TIER2</span>
  );
  return null;
}

function FollowButton({
  trader,
  isLoggedIn,
  walletAddress,
  walletLoading,
  walletTimedOut,
  onLoginNeeded,
}: {
  trader: Trader;
  isLoggedIn: boolean;
  walletAddress?: string;
  walletLoading: boolean;
  walletTimedOut: boolean;
  onLoginNeeded: () => void;
}) {
  const [following, setFollowing] = useState(false);
  const [done, setDone] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const handleClick = async () => {
    if (!isLoggedIn) {
      onLoginNeeded();
      return;
    }
    if (walletLoading) {
      setErrMsg('Wallet loading… please wait');
      setTimeout(() => setErrMsg(''), 3000);
      return;
    }
    if (walletTimedOut || !walletAddress) {
      setErrMsg('Wallet creating… please refresh the page');
      setTimeout(() => setErrMsg(''), 5000);
      return;
    }
    setFollowing(true);
    setErrMsg('');
    try {
      const res = await fetch(`${API_URL}/followers/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower_address: walletAddress,
          traders: [trader.address],
          copy_ratio: DEFAULT_COPY_RATIO,
          max_position_usdc: DEFAULT_MAX_POSITION_USDC,
          strategy: 'safe',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
        // Portfolio 자동 갱신 트리거
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('followSuccess'));
        }
        // localStorage 캐시 업데이트 (DB 리셋 대비)
        if (typeof window !== 'undefined' && walletAddress) {
          try {
            const key = `cp_following_${walletAddress}`;
            const cached: string[] = JSON.parse(localStorage.getItem(key) || '[]');
            if (!cached.includes(trader.address)) cached.push(trader.address);
            localStorage.setItem(key, JSON.stringify(cached));
          } catch { /* ignore */ }
          setTimeout(() => window.dispatchEvent(new CustomEvent('portfolio:refresh')), 300);
        }
      } else {
        const detail = typeof data.detail === 'string'
          ? data.detail
          : data.detail?.error || data.error
            || (data.errors?.length ? data.errors[0] : undefined)
            || 'Follow failed — please try again';
        setErrMsg(detail);
        setTimeout(() => setErrMsg(''), 4000);
      }
    } catch {
      setErrMsg('Network error');
      setTimeout(() => setErrMsg(''), 4000);
    } finally {
      setFollowing(false);
    }
  };

  if (done) return (
    <span className="text-green-400 text-sm font-medium">✅ Following</span>
  );

  // 로그인 안 된 상태
  if (!isLoggedIn) return (
    <button
      onClick={onLoginNeeded}
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
    >
      Follow
    </button>
  );

  // wallet 로딩 중
  if (walletLoading) return (
    <button disabled className="bg-gray-700 text-gray-400 px-3 py-2.5 rounded-lg text-sm min-h-[44px] flex items-center gap-1.5">
      <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
      Wallet…
    </button>
  );

  // wallet 타임아웃 — 재연결 유도
  if (walletTimedOut) return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => window.location.reload()}
        className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2.5 rounded-lg text-xs font-medium transition-colors min-h-[44px]"
      >
        Refresh Page
      </button>
      <span className="text-yellow-400 text-xs text-center">Wallet not ready</span>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleClick}
        disabled={following}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center gap-1.5"
      >
        {following ? (
          <>
            <span className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full inline-block" />
            Following...
          </>
        ) : 'Follow →'}
      </button>
      {errMsg && (
        <span className="text-red-400 text-xs text-center w-24 leading-tight">{errMsg}</span>
      )}
    </div>
  );
}

export function Leaderboard() {
  const { authenticated, login } = usePrivy();
  const { address: walletAddress, loading: walletLoading, timedOut: walletTimedOut } = useSolanaWallet();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTraders = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/traders?limit=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTraders((data.data || []).filter((t: Trader) => Boolean(t.active)));
    } catch (e) {
      console.error('Failed to fetch traders:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTraders();
    const timer = setInterval(fetchTraders, 30000);
    return () => clearInterval(timer);
  }, [fetchTraders]);

  const handleLoginNeeded = () => {
    if (login) login();
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );

  if (traders.length === 0) return (
    <div className="text-center py-12 text-gray-500">
      <div className="text-4xl mb-3">📊</div>
      <p>Loading traders...</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
            <th className="text-left py-3 px-4 w-10">#</th>
            <th className="text-left py-3 px-4">Trader</th>
            <th className="text-right py-3 px-4">30d ROI</th>
            <th className="text-right py-3 px-4 hidden md:table-cell">7d ROI</th>
            <th className="text-right py-3 px-4 hidden lg:table-cell">Win Rate</th>
            <th className="text-right py-3 px-4 hidden lg:table-cell">PF</th>
            <th className="text-right py-3 px-4 hidden xl:table-cell">Score</th>
            <th className="text-right py-3 px-4">30d PnL</th>
            <th className="text-center py-3 px-4">Follow</th>
          </tr>
        </thead>
        <tbody>
          {traders.map((trader, idx) => {
            const isRecommended = trader.is_recommended === true;
            const roi30 = safeNum(trader.roi_30d);
            const roi7  = safeNum(trader.roi_7d);
            const wr    = safeNum(trader.win_rate);
            const pf    = safeNum(trader.profit_factor);
            const score = safeNum(trader.score);
            const pnl30 = safeNum(trader.pnl_30d);

            return (
              <tr
                key={trader.address}
                className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${isRecommended ? 'bg-indigo-950/20' : ''}`}
              >
                <td className="py-3 px-4 text-gray-500 text-sm font-mono">
                  {idx < 3 ? ['🥇','🥈','🥉'][idx] : `${idx+1}`}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">
                      {trader.address.slice(0,2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm text-white">
                          {trader.address.slice(0,8)}...{trader.address.slice(-4)}
                        </span>
                        <RecommendedBadge alias={trader.alias} />
                      </div>
                      {trader.alias && (
                        <div className="text-xs text-gray-500">{trader.alias}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className={`py-3 px-4 text-right font-mono text-sm font-medium ${roi30 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {roi30 >= 0 ? '+' : ''}{roi30.toFixed(1)}%
                </td>
                <td className={`py-3 px-4 text-right font-mono text-sm hidden md:table-cell ${roi7 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {roi7 >= 0 ? '+' : ''}{roi7.toFixed(1)}%
                </td>
                <td className="py-3 px-4 text-right text-sm text-gray-300 hidden lg:table-cell">
                  {wr.toFixed(0)}%
                </td>
                <td className="py-3 px-4 text-right text-sm text-gray-300 hidden lg:table-cell">
                  {pf > 0 ? `${pf.toFixed(1)}x` : '—'}
                </td>
                <td className="py-3 px-4 text-right text-sm text-indigo-300 hidden xl:table-cell font-mono">
                  {score.toFixed(0)}
                </td>
                <td className={`py-3 px-4 text-right font-mono text-sm ${pnl30 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pnl30 >= 0 ? '+' : ''}${pnl30.toLocaleString(undefined, {maximumFractionDigits: 0})}
                </td>
                <td className="py-3 px-4 text-center">
                  <FollowButton
                    trader={trader}
                    isLoggedIn={authenticated}
                    walletAddress={walletAddress}
                    walletLoading={walletLoading}
                    walletTimedOut={walletTimedOut}
                    onLoginNeeded={handleLoginNeeded}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
