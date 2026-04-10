/* v2 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { getSolanaAddress } from '@/lib/privy-helpers';

function safeNum(v: unknown, fb = 0): number { const n = Number(v); return isFinite(n) ? n : fb; }

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://copy-perp.onrender.com';

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

const TOP5_RECOMMENDED = new Set([
  'EcX5xSDT45Nvhi2gMTjTnhF3KT2w4sPF54esEZS3hwZu',
  '4UBH19qUbXEaqyz9fKrFHuvj8BPMoM87H71s1YPKyGYq',
  'A6VY4ZBUohgSLkwMuDwDvAnzgiXFB1eTDzaixyitPJep',
  'EYhhf8u9M6kN9tCRVgd2Jki9fJm3XzJRnTF9k5eBC1q1',
  'FuHMGqdrn77u944FSYvg9VTw3sD5RVeYS1ezLpGaFes7',
]);

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
  followerAddress,
  onFollowClick,
}: {
  trader: Trader;
  isLoggedIn: boolean;
  followerAddress?: string;
  onFollowClick: (addr: string) => void;
}) {
  const [following, setFollowing] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    if (!isLoggedIn || !followerAddress) {
      onFollowClick(trader.address);
      return;
    }
    setFollowing(true);
    try {
      const res = await fetch(`${API_URL}/followers/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower_address: followerAddress,
          traders: [trader.address],
          copy_ratio: 0.1,
          max_position_usdc: 50,
        }),
      });
      const data = await res.json();
      if (data.ok) setDone(true);
    } finally {
      setFollowing(false);
    }
  };

  if (done) return (
    <span className="text-green-400 text-sm font-medium">✅ Following</span>
  );

  return (
    <button
      onClick={handleClick}
      disabled={following}
      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
    >
      {following ? (
        <span className="flex items-center gap-1">
          <span className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full inline-block" />
          Following...
        </span>
      ) : 'Follow'}
    </button>
  );
}

export function Leaderboard() {
  const { authenticated, login, user } = usePrivy();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);

  const followerAddress: string | undefined = getSolanaAddress(user ?? null);

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

  const handleFollowClick = (addr: string) => {
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
    <>

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
              const isRecommended = TOP5_RECOMMENDED.has(trader.address);
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
                      followerAddress={followerAddress}
                      onFollowClick={handleFollowClick}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
