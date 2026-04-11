/* v7 — agent bind check, consistent 30s polling */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useVisibleInterval } from '@/lib/use-visible-interval';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallet } from '@/lib/use-solana-wallet';
import { API_URL, DEFAULT_COPY_RATIO, DEFAULT_MAX_POSITION_USDC } from '@/lib/config';
import { formatPct, formatAddr, formatPnl } from '@/lib/format';
import { useToast } from '@/components/Toast';
import { extractErrorMessage } from '@/lib/api';
import { AgentBindModal } from '@/components/AgentBindModal';

function safeNum(v: unknown, fb = 0): number { const n = Number(v); return isFinite(n) ? n : fb; }

/** "X seconds ago" 표시 훅 */
function useRelativeTime(updatedAt: number | null): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!updatedAt) { setLabel(''); return; }
    const tick = () => {
      const secs = Math.floor((Date.now() - updatedAt) / 1000);
      if (secs < 5) setLabel('just now');
      else if (secs < 60) setLabel(`${secs}s ago`);
      else setLabel(`${Math.floor(secs / 60)}m ago`);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [updatedAt]);
  return label;
}


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
  composite_score?: number;
}

type SortKey = 'score' | 'roi_30d' | 'pnl_30d' | 'win_rate';
type SortDir = 'desc' | 'asc';

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
  const [showBindModal, setShowBindModal] = useState(false);
  const { showToast } = useToast();

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
    // Agent bind 체크
    const bindKey = `cp_agent_bound_${walletAddress}`;
    let alreadyBound = false;
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem(bindKey) : null;
      if (cached === '1') {
        alreadyBound = true;
      } else {
        const r = await fetch(`${API_URL}/followers/${walletAddress}/portfolio`, { signal: AbortSignal.timeout(4000) }).catch(() => null);
        if (r?.ok) {
          const pd = await r.json();
          alreadyBound = pd?.agent_bound === true;
          if (alreadyBound) { try { localStorage.setItem(bindKey, '1'); } catch {/* */} }
        }
      }
    } catch {/* 실패 시 bind 모달 표시 */}

    if (!alreadyBound) {
      setShowBindModal(true);
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
        showToast(`Now following ${formatAddr(trader.address)} 🎯`, 'success');
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
        // HTTP 에러 코드별 메시지 추출
        const detail = await extractErrorMessage(res,
          typeof data.detail === 'string'
            ? data.detail
            : data.detail?.error || data.error
              || (data.errors?.length ? data.errors[0] : undefined)
              || 'Follow failed — please try again'
        );
        setErrMsg(detail);
        showToast(detail, 'error');
        setTimeout(() => setErrMsg(''), 4000);
      }
    } catch {
      setErrMsg('Network error');
      showToast('Network error — try again', 'error');
      setTimeout(() => setErrMsg(''), 4000);
    } finally {
      setFollowing(false);
    }
  };

  if (showBindModal && walletAddress) return (
    <AgentBindModal
      walletAddress={walletAddress}
      onComplete={() => {
        try { localStorage.setItem(`cp_agent_bound_${walletAddress}`, '1'); } catch {/* */}
        setShowBindModal(false);
        handleClick();
      }}
      onSkip={() => setShowBindModal(false)}
    />
  );

  if (done) return (
    <span className="text-green-400 text-sm font-medium">✅ Following</span>
  );

  // 로그인 안 된 상태
  if (!isLoggedIn) return (
    <button
      onClick={onLoginNeeded}
      aria-label={`Follow trader ${trader.address.slice(0, 8)}`}
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
        aria-label={`Follow trader ${trader.address.slice(0, 8)}`}
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

// ── 스켈레톤 로딩 ──
function LeaderboardSkeleton() {
  return (
    <div className="overflow-x-auto animate-pulse" aria-busy="true" aria-label="Loading leaderboard…">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            {['w-10','w-40','w-20','w-20','w-20','w-16','w-16','w-24','w-20'].map((w, i) => (
              <th key={i} className={`py-3 px-4 ${w}`}>
                <div className="h-3 bg-gray-800 rounded w-full" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, idx) => (
            <tr key={idx} className="border-b border-gray-800/50">
              <td className="py-3 px-4"><div className="h-4 w-6 bg-gray-800 rounded" /></td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-800" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-28 bg-gray-800 rounded" />
                    <div className="h-2 w-16 bg-gray-700 rounded" />
                  </div>
                </div>
              </td>
              {Array.from({ length: 6 }).map((_, j) => (
                <td key={j} className="py-3 px-4 text-right">
                  <div className="h-3 w-12 bg-gray-800 rounded ml-auto" />
                </td>
              ))}
              <td className="py-3 px-4 text-center">
                <div className="h-8 w-16 bg-gray-800 rounded-lg mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 정렬 헤더 버튼 ──
function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className = '',
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <th
      className={`py-3 px-4 text-right cursor-pointer select-none hover:text-gray-300 transition-colors ${
        active ? 'text-indigo-400' : 'text-gray-500'
      } text-xs uppercase tracking-wide ${className}`}
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (currentDir === 'desc' ? 'descending' : 'ascending') : 'none'}
    >
      {label} {active ? (currentDir === 'desc' ? '↓' : '↑') : '⇅'}
    </th>
  );
}

export function Leaderboard() {
  const { authenticated, login } = usePrivy();
  const { address: walletAddress, loading: walletLoading, timedOut: walletTimedOut } = useSolanaWallet();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const relativeTime = useRelativeTime(updatedAt);

  const fetchTraders = useCallback(async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(`${API_URL}/traders?limit=20`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTraders((data.data || []).filter((t: Trader) => Boolean(t.active)));
      setFetchError(false);
      setUpdatedAt(Date.now());
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return; // unmount/timeout — 무시
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTraders(); }, [fetchTraders]);
  useVisibleInterval(fetchTraders, 30000);

  // 네트워크 재연결 시 즉시 갱신
  useEffect(() => {
    const handler = () => fetchTraders();
    window.addEventListener('network:reconnected', handler);
    return () => window.removeEventListener('network:reconnected', handler);
  }, [fetchTraders]);

  const handleLoginNeeded = () => {
    if (login) login();
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // 정렬 적용
  const sortedTraders = [...traders].sort((a, b) => {
    let aVal: number, bVal: number;
    switch (sortKey) {
      case 'roi_30d':  aVal = safeNum(a.roi_30d); bVal = safeNum(b.roi_30d); break;
      case 'pnl_30d':  aVal = safeNum(a.pnl_30d); bVal = safeNum(b.pnl_30d); break;
      case 'win_rate': aVal = safeNum(a.win_rate); bVal = safeNum(b.win_rate); break;
      default:         aVal = safeNum(a.composite_score ?? a.score); bVal = safeNum(b.composite_score ?? b.score);
    }
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  if (loading) return <LeaderboardSkeleton />;

  if (fetchError) return (
    <div className="text-center py-12 text-red-400">
      <div className="text-4xl mb-3">⚠️</div>
      <p className="text-sm">Failed to load leaderboard — retrying…</p>
      <button
        onClick={fetchTraders}
        className="mt-3 text-indigo-400 text-sm hover:underline"
      >
        Retry now
      </button>
    </div>
  );

  if (traders.length === 0) return (
    <div className="text-center py-12 text-gray-500">
      <div className="text-4xl mb-3">📊</div>
      <p>No active traders found.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
            <th className="text-left py-3 px-4 w-10">#</th>
            <th className="text-left py-3 px-4">Trader</th>
            <SortHeader label="30d ROI" sortKey="roi_30d" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <th className="text-right py-3 px-4 hidden md:table-cell text-xs uppercase tracking-wide text-gray-500">7d ROI</th>
            <th className="text-right py-3 px-4 hidden lg:table-cell text-xs uppercase tracking-wide text-gray-500">Win Rate</th>
            <th className="text-right py-3 px-4 hidden lg:table-cell text-xs uppercase tracking-wide text-gray-500">PF</th>
            <SortHeader label="Score" sortKey="score" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="hidden xl:table-cell" />
            <SortHeader label="30d PnL" sortKey="pnl_30d" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <th className="text-center py-3 px-4 text-xs uppercase tracking-wide text-gray-500">Follow</th>
          </tr>
        </thead>
        <tbody>
          {sortedTraders.map((trader, idx) => {
            const isRecommended = trader.is_recommended === true;
            const roi30 = safeNum(trader.roi_30d);
            const roi7  = safeNum(trader.roi_7d);
            const wr    = safeNum(trader.win_rate);
            const wrDisplay = trader.win_rate > 0 ? `${(wr * 100).toFixed(0)}%` : '—';
            const pf    = safeNum(trader.profit_factor);
            const score = safeNum(trader.composite_score ?? trader.score);
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
                  {formatPct(roi30)}
                </td>
                <td className={`py-3 px-4 text-right font-mono text-sm hidden md:table-cell ${roi7 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPct(roi7)}
                </td>
                <td className="py-3 px-4 text-right text-sm text-gray-300 hidden lg:table-cell">
                  {wrDisplay}
                </td>
                <td className="py-3 px-4 text-right text-sm text-gray-300 hidden lg:table-cell">
                  {pf > 0 ? `${pf.toFixed(1)}x` : '—'}
                </td>
                <td className="py-3 px-4 text-right text-sm text-indigo-300 hidden xl:table-cell font-mono">
                  {score > 0 ? score.toFixed(0) : '—'}
                </td>
                <td className={`py-3 px-4 text-right font-mono text-sm ${pnl30 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pnl30 !== 0 ? formatPnl(pnl30) : '—'}
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
      <div className="flex items-center justify-between mt-2 px-2">
        {updatedAt && (
          <span className="text-xs text-gray-600">Last updated {relativeTime}</span>
        )}
        <p className="text-xs text-gray-700 ml-auto">
          Click column headers (30d ROI / Score / 30d PnL) to sort ↑↓
        </p>
      </div>
    </div>
  );
}
