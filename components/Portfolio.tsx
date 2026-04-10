'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallet } from '@/lib/use-solana-wallet';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getSolanaAddress, truncateAddress } from '@/lib/privy-helpers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://copy-perp.onrender.com';

interface FollowerEntry {
  address: string;
  trader_address: string;
  copy_ratio: number;
  max_position_usdc: number;
  active: number;
  created_at: number;
}

interface PnlSummary {
  total_pnl: number;
  win_rate: number;
  total_trades: number;
  win_count: number;
  loss_count: number;
  volume_usdc: number;
}

interface ByTraderEntry {
  trader_address: string;
  total_pnl: number;
  trades: number;
  win_rate: number;
}

interface RecentTrade {
  id: number;
  symbol: string;
  side: string;
  status: string;
  pnl: number | null;
  amount: number | null;
  price: number | null;
  created_at: number;
  trader_address: string;
}

interface PortfolioState {
  following: FollowerEntry[];
  pnlSummary: PnlSummary | null;
  byTrader: ByTraderEntry[];
  recentTrades: RecentTrade[];
}

function safeNum(v: unknown, fb = 0): number {
  const n = Number(v);
  return isFinite(n) ? n : fb;
}

function fmtPnl(pnl: number): string {
  return `${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}`;
}

export function Portfolio({ sectionMode = false }: { sectionMode?: boolean }) {
  const { authenticated, user } = usePrivy();
  const { address: walletAddress, loading: walletLoading, timedOut: walletTimedOut } = useSolanaWallet();
  const [state, setState] = useState<PortfolioState | null>(null);
  const [loading, setLoading] = useState(false);
  const [unfollowing, setUnfollowing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastStartupAt = useRef<number>(0);

  

  const fetchData = useCallback(async () => {
    if (!authenticated || !walletAddress) return;
    setLoading(true);
    setError(null);

    try {
      const [followingRes, pnlRes, byTraderRes, tradesRes] = await Promise.allSettled([
        fetch(`${API_URL}/followers/list?follower_address=${walletAddress}`).then(r => r.json()),
        fetch(`${API_URL}/pnl/${walletAddress}/summary?days=30`).then(r => r.json()),
        fetch(`${API_URL}/pnl/${walletAddress}/by-trader`).then(r => r.json()),
        fetch(`${API_URL}/pnl/${walletAddress}/trades?limit=20`).then(r => r.json()),
      ]);

      const followingData = followingRes.status === 'fulfilled' ? (followingRes.value?.data ?? []) : [];

      // DB 리셋 감지: DB에 following 없는데 localStorage 캐시 있으면 자동 재등록
      if (followingData.length === 0 && typeof window !== 'undefined') {
        const cached = localStorage.getItem(`cp_following_${walletAddress}`);
        if (cached) {
          try {
            const cachedTraders: string[] = JSON.parse(cached);
            if (cachedTraders.length > 0) {
              // 백그라운드로 재등록
              fetch(`${API_URL}/followers/onboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  follower_address: walletAddress,
                  traders: cachedTraders,
                  copy_ratio: 0.07,
                  max_position_usdc: 50,
                  strategy: 'safe',
                }),
              }).then(() => {
                // 재등록 후 500ms 후 다시 조회
                setTimeout(() => fetchData(), 500);
              }).catch(() => {});
            }
          } catch { /* ignore */ }
        }
      }

      setState({
        following: followingData,
        pnlSummary: pnlRes.status === 'fulfilled' ? pnlRes.value : null,
        byTrader: byTraderRes.status === 'fulfilled' ? (byTraderRes.value?.data ?? []) : [],
        recentTrades: tradesRes.status === 'fulfilled' ? (tradesRes.value?.data ?? []) : [],
      });
    } catch (e) {
      setError('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  }, [authenticated, walletAddress]);

  useEffect(() => {
    fetchData();
    // Follow 성공 시 자동 갱신
    const onFollow = () => { setTimeout(fetchData, 800); };
    if (typeof window !== 'undefined') {
      window.addEventListener('followSuccess', onFollow);
      return () => window.removeEventListener('followSuccess', onFollow);
    }
  }, [fetchData]);

  // 30초마다 자동 갱신
  useEffect(() => {
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Follow 이벤트 수신 시 자동 갱신
  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('portfolio:refresh', handler);
    return () => window.removeEventListener('portfolio:refresh', handler);
  }, [fetchData]);

  // 서버 재시작(DB 리셋) 감지 → localStorage 팔로워 자동 재등록
  useEffect(() => {
    if (!walletAddress) return;
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/healthz`);
        const d = await res.json();
        const sa: number = d.startup_at ?? 0;
        if (sa && lastStartupAt.current && sa !== lastStartupAt.current) {
          const cached = localStorage.getItem(`cp_following_${walletAddress}`);
          if (cached) {
            const traders: string[] = JSON.parse(cached);
            if (traders.length > 0) {
              await fetch(`${API_URL}/followers/onboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  follower_address: walletAddress,
                  traders,
                  copy_ratio: 0.07,
                  max_position_usdc: 50,
                  strategy: 'safe',
                }),
              });
              setTimeout(() => fetchData(), 800);
            }
          }
        }
        if (sa) lastStartupAt.current = sa;
      } catch { /* ignore */ }
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, [walletAddress, fetchData]);

  const handleUnfollow = async (traderAddress: string) => {
    if (!walletAddress || unfollowing) return;
    setUnfollowing(traderAddress);
    try {
      const res = await fetch(
        `${API_URL}/follow/${traderAddress}?follower_address=${walletAddress}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        // 로컬 상태에서 즉시 제거
        setState(prev =>
          prev
            ? { ...prev, following: prev.following.filter(f => f.trader_address !== traderAddress) }
            : prev
        );
      }
    } catch {
      // 실패 시 조용히 처리
    } finally {
      setUnfollowing(null);
    }
  };

  /* ── 미인증 → 섹션 전체 숨김 ── */
  if (!authenticated) return null;

  /* ── 로딩 ── */
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  /* ── 에러 ── */
  if (error || !state) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p className="text-sm">{error ?? 'No portfolio data available'}</p>
        <button
          onClick={fetchData}
          className="mt-3 text-indigo-400 text-sm hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const { following, pnlSummary, byTrader, recentTrades } = state;
  const pnl = safeNum(pnlSummary?.total_pnl);
  const winRate = safeNum(pnlSummary?.win_rate) * 100; // API returns 0~1
  const totalTrades = safeNum(pnlSummary?.total_trades);

  // sectionMode: section 헤더 포함 전체 렌더
  if (sectionMode) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">My Portfolio</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your PnL, followed traders & recent copy trades</p>
          </div>
          <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">● 30s</span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <Portfolio />
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Stats 요약 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Following',
            value: following.length,
            color: 'text-indigo-400',
          },
          {
            label: 'Total Trades (30d)',
            value: totalTrades,
            color: 'text-white',
          },
          {
            label: 'Win Rate (30d)',
            value: `${winRate.toFixed(1)}%`,
            color: winRate >= 50 ? 'text-green-400' : 'text-red-400',
          },
          {
            label: 'Total PnL (30d)',
            value: fmtPnl(pnl),
            color: pnl >= 0 ? 'text-green-400' : 'text-red-400',
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center"
          >
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* ── 팔로잉 트레이더 ── */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Following Traders
          {following.length > 0 && (
            <span className="ml-2 text-xs text-gray-600">({following.length})</span>
          )}
        </h3>

        {following.length === 0 ? (
          <div className="text-center py-6 bg-gray-800/50 rounded-xl border border-gray-700">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-sm text-gray-500">
              You&apos;re not following any traders yet.
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Browse the CRS Leaderboard to find top traders.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {following.map((f) => {
              const perf = byTrader.find(t => t.trader_address === f.trader_address);
              const traderPnl = safeNum(perf?.total_pnl);
              const isUnfollowing = unfollowing === f.trader_address;

              return (
                <div
                  key={f.trader_address}
                  className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 gap-3"
                >
                  {/* 트레이더 정보 */}
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm text-white truncate">
                      {truncateAddress(f.trader_address, 8)}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Copy {((f.copy_ratio || 0) * 100).toFixed(0)}% ·
                      Max ${safeNum(f.max_position_usdc).toFixed(0)} USDC
                      {perf && (
                        <span className="ml-2">
                          · {perf.trades} trades
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PnL + Unfollow */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {perf ? (
                      <div className="text-right">
                        <div
                          className={`text-sm font-mono font-medium ${
                            traderPnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {fmtPnl(traderPnl)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {(safeNum(perf.win_rate) * 100).toFixed(0)}% win
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600 text-right">
                        No trades yet
                      </div>
                    )}

                    <button
                      onClick={() => handleUnfollow(f.trader_address)}
                      disabled={isUnfollowing}
                      className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUnfollowing ? '...' : 'Unfollow'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 최근 Copy Trade ── */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Copy Trades (30d)</h3>

        {recentTrades.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm">No copy trades yet. Follow a trader to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800 bg-gray-900/50">
                  <th className="text-left py-2.5 px-3">Symbol</th>
                  <th className="text-left py-2.5 px-3">Side</th>
                  <th className="text-right py-2.5 px-3">Size</th>
                  <th className="text-right py-2.5 px-3">PnL</th>
                  <th className="text-center py-2.5 px-3">Status</th>
                  <th className="text-left py-2.5 px-3 hidden md:table-cell">Trader</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((t) => {
                  const tradePnl = safeNum(t.pnl);
                  const size = safeNum(t.amount) * safeNum(t.price);
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="py-2 px-3 font-medium text-white">
                        {t.symbol ?? '—'}
                      </td>
                      <td
                        className={`py-2 px-3 font-medium ${
                          t.side === 'bid' ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {t.side === 'bid' ? 'LONG' : 'SHORT'}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-300 font-mono text-xs">
                        {size > 0 ? `$${size.toFixed(2)}` : '—'}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-mono text-xs ${
                          t.status === 'filled'
                            ? tradePnl > 0
                              ? 'text-green-400'
                              : tradePnl < 0
                              ? 'text-red-400'
                              : 'text-gray-500'
                            : 'text-gray-600'
                        }`}
                      >
                        {t.status === 'filled' ? fmtPnl(tradePnl) : '—'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            t.status === 'filled'
                              ? 'bg-green-500/20 text-green-400'
                              : t.status === 'failed'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-600 font-mono text-xs hidden md:table-cell">
                        {t.trader_address ? truncateAddress(t.trader_address, 6) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 새로고침 ── */}
      <div className="text-right">
        <button
          onClick={fetchData}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}
