/* v5 — format helpers, toast notifications */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallet } from '@/lib/use-solana-wallet';
import { API_URL, DEFAULT_COPY_RATIO, DEFAULT_MAX_POSITION_USDC } from '@/lib/config';
import { formatPct, formatUSDC, formatAddr } from '@/lib/format';
import { useToast } from '@/components/Toast';

function safeNum(v: unknown, fb = 0): number { const n = Number(v); return isFinite(n) ? n : fb; }


interface CRSTrader {
  address: string;
  alias?: string;
  crs: number;
  grade: string;
  disqualified: boolean;
  disq_reason?: string;
  recommended_copy_ratio: number;
  copy_ratio_pct: number;
  tier_label: string;
  strengths: string[];
  warnings: string[];
  raw: {
    pnl_30d?: number;
    pnl_7d?: number;
    roi_30d?: number;
    equity?: number;
    consistency?: number;
  };
  trade_stats?: {
    win_rate: number | null;
    trade_count: number | null;
    roi_30d: number | null;
    data_source?: string;
  };
  momentum_score?: number;
  profitability_score?: number;
  risk_score?: number;
  consistency_score?: number;
  copyability_score?: number;
}

const GRADE_COLORS: Record<string, string> = {
  S: 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10',
  A: 'text-indigo-400 border-indigo-500/50 bg-indigo-500/10',
  B: 'text-green-400 border-green-500/50 bg-green-500/10',
  C: 'text-orange-400 border-orange-500/50 bg-orange-500/10',
  D: 'text-red-400 border-red-500/50 bg-red-500/10',
};

const GRADE_RING: Record<string, string> = {
  S: 'ring-2 ring-yellow-500/30',
  A: 'ring-1 ring-indigo-500/20',
  B: '',
  C: '',
  D: '',
};

// Grade thresholds for tooltip
const GRADE_DESC: Record<string, string> = {
  S: 'Elite (CRS≥80) — Max 15% copy ratio',
  A: 'Top (CRS≥65) — Max 10% copy ratio',
  B: 'Qualified (CRS≥50) — Max 7% copy ratio',
  C: 'Caution (CRS≥35) — Max 4% copy ratio',
};

function CRSBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-24 text-right shrink-0">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-gray-400 w-8 text-right font-mono">{(value ?? 0).toFixed(0)}</span>
    </div>
  );
}

function FollowButton({
  traderAddr,
  authenticated,
  walletAddress,
  walletLoading,
  walletTimedOut,
  onLoginNeeded,
}: {
  traderAddr: string;
  authenticated: boolean;
  walletAddress?: string;
  walletLoading: boolean;
  walletTimedOut: boolean;
  onLoginNeeded: () => void;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const { showToast } = useToast();

  const handleClick = async () => {
    if (!authenticated) { onLoginNeeded(); return; }
    if (walletLoading) {
      setMsg('Wallet loading… please wait');
      setState('error');
      setTimeout(() => setState('idle'), 3000);
      return;
    }
    if (!walletAddress) {
      setMsg('Wallet not ready — please reconnect your wallet');
      setState('error');
      setTimeout(() => setState('idle'), 6000);
      return;
    }
    setState('loading');
    setMsg('');
    try {
      const res = await fetch(`${API_URL}/followers/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower_address: walletAddress,
          traders: [traderAddr],
          copy_ratio: DEFAULT_COPY_RATIO,
          max_position_usdc: DEFAULT_MAX_POSITION_USDC,
          strategy: 'safe',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setState('done');
        showToast(`Now following ${formatAddr(traderAddr)} 🎯`, 'success');
        // Portfolio 자동 갱신 트리거
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('followSuccess'));
        }
        // localStorage 캐시 업데이트 (DB 리셋 대비)
        if (typeof window !== 'undefined' && walletAddress) {
          try {
            const key = `cp_following_${walletAddress}`;
            const cached: string[] = JSON.parse(localStorage.getItem(key) || '[]');
            if (!cached.includes(traderAddr)) cached.push(traderAddr);
            localStorage.setItem(key, JSON.stringify(cached));
          } catch { /* ignore */ }
          // Portfolio 즉시 갱신
          setTimeout(() => window.dispatchEvent(new CustomEvent('portfolio:refresh')), 300);
        }
      } else {
        const errDetail = typeof data.detail === 'string'
          ? data.detail
          : data.detail?.error || data.error
            || (data.errors?.length ? data.errors[0] : undefined)
            || 'Follow failed — please try again';
        setMsg(errDetail);
        setState('error');
        showToast(errDetail, 'error');
        setTimeout(() => setState('idle'), 4000);
      }
    } catch {
      setMsg('Network error — try again');
      setState('error');
      showToast('Network error — try again', 'error');
      setTimeout(() => setState('idle'), 4000);
    }
  };

  if (state === 'done') return (
    <span className="text-green-400 text-sm font-medium px-2">✅ Following</span>
  );

  if (!authenticated) return (
    <button
      onClick={onLoginNeeded}
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
    >
      Sign in to Follow
    </button>
  );

  if (walletLoading) return (
    <button disabled className="bg-gray-700 text-gray-400 px-3 py-2.5 rounded-lg text-sm min-h-[44px] flex items-center gap-1.5">
      <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
      Wallet…
    </button>
  );

  // wallet 타임아웃 — 재연결 유도
  if (walletTimedOut) return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => window.location.reload()}
        className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2.5 rounded-lg text-xs font-medium transition-colors min-h-[44px]"
      >
        Refresh Page
      </button>
      <span className="text-yellow-400 text-xs text-right">Wallet creating…</span>
    </div>
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 min-h-[44px]"
      >
        {state === 'loading' ? (
          <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin inline-block" /> Following...</>
        ) : 'Follow →'}
      </button>
      {state === 'error' && msg && (
        <span className="text-xs text-red-400 text-right max-w-[140px] leading-tight">{msg}</span>
      )}
    </div>
  );
}

function TraderCard({ trader, rank, authenticated, walletAddress, walletLoading, walletTimedOut, onLoginNeeded }: {
  trader: CRSTrader;
  rank: number;
  authenticated: boolean;
  walletAddress?: string;
  walletLoading: boolean;
  walletTimedOut: boolean;
  onLoginNeeded: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const gradeStyle = GRADE_COLORS[trader.grade] || GRADE_COLORS['D'];
  const ringStyle = GRADE_RING[trader.grade] || '';
  // roi_30d: raw 값 우선, 없으면 pnl/equity로 계산
  const rawRoi = safeNum(trader.raw?.roi_30d);
  const pnl30 = safeNum(trader.raw?.pnl_30d);
  const equity = safeNum(trader.raw?.equity);
  const roi30 = rawRoi !== 0 ? rawRoi
    : (equity > 0 && pnl30 !== 0) ? pnl30 / (equity - pnl30) * 100
    : 0;

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl overflow-hidden ${ringStyle} hover:border-gray-700 transition-all`}>
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-gray-600 font-mono text-sm shrink-0 w-6 text-center">
            {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : `#${rank}`}
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {trader.address.slice(0,2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-white">
                {trader.address.slice(0,8)}…{trader.address.slice(-4)}
              </span>
              <span
                className={`px-1.5 py-0.5 text-xs font-bold rounded border cursor-help ${gradeStyle}`}
                title={GRADE_DESC[trader.grade] ?? ''}
              >
                {trader.grade}
              </span>
            </div>
            {trader.alias && (
              <div className="text-xs text-gray-500 truncate">{trader.alias}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{(trader.crs ?? 0).toFixed(0)}</div>
            <div className="text-xs text-gray-500">CRS</div>
          </div>
          {!trader.disqualified && (
            <FollowButton
              traderAddr={trader.address}
              authenticated={authenticated}
              walletAddress={walletAddress}
              walletLoading={walletLoading}
              walletTimedOut={walletTimedOut}
              onLoginNeeded={onLoginNeeded}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-px bg-gray-800 border-t border-gray-800">
        <div className="bg-gray-900 p-3 text-center">
          <div className={`text-base font-bold ${roi30 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPct(roi30)}
          </div>
          <div className="text-xs text-gray-500">30d ROI</div>
        </div>
        <div className="bg-gray-900 p-3 text-center">
          {trader.trade_stats?.win_rate != null ? (
            <>
              <div className={`text-base font-bold ${safeNum(trader.trade_stats.win_rate) >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                {safeNum(trader.trade_stats.win_rate).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">Win Rate</div>
            </>
          ) : (
            <>
              <div className={`text-base font-bold ${pnl30 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatUSDC(pnl30, 0)}
              </div>
              <div className="text-xs text-gray-500">30d PnL</div>
            </>
          )}
        </div>
        <div className="bg-gray-900 p-3 text-center">
          <div className="text-base font-bold text-gray-300">
            {trader.trade_stats?.trade_count != null ? trader.trade_stats.trade_count : '—'}
          </div>
          <div className="text-xs text-gray-500">Trades</div>
        </div>
        <div className="bg-gray-900 p-3 text-center">
          <div className="text-base font-bold text-indigo-300">
            {trader.copy_ratio_pct}%
          </div>
          <div className="text-xs text-gray-500">Copy Ratio</div>
        </div>
      </div>

      {(trader.strengths?.length > 0 || trader.warnings?.length > 0 || trader.disqualified) && (
        <div className="px-4 py-3 border-t border-gray-800/50">
          {trader.disqualified ? (
            <div className="text-xs text-red-400 flex items-center gap-1.5">
              <span>❌</span>
              <span>{trader.disq_reason || 'Filtered out'}</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {trader.strengths?.slice(0,2).map((s, i) => (
                <span key={i} className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
                  ✅ {s}
                </span>
              ))}
              {trader.warnings?.slice(0,1).map((w, i) => (
                <span key={i} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20">
                  ⚠️ {w}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        aria-label={expanded ? 'Collapse trader analysis' : 'Show full trader analysis'}
        aria-expanded={expanded}
        className="w-full py-3 text-xs text-gray-600 hover:text-gray-400 border-t border-gray-800/50 transition-colors flex items-center justify-center gap-1 min-h-[44px]"
      >
        {expanded ? 'Collapse ▲' : 'Full Analysis ▼'}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-800/50 pt-3">
          <div className="space-y-1.5">
            <div className="text-xs text-gray-500 mb-2 font-medium">CRS 5-Dimension Analysis</div>
            <CRSBar value={trader.profitability_score ?? 0} label="Profitability" color="bg-green-500" />
            <CRSBar value={trader.risk_score ?? 0} label="Risk Mgmt" color="bg-blue-500" />
            <CRSBar value={trader.momentum_score ?? 0} label="Momentum" color="bg-purple-500" />
            <CRSBar value={trader.consistency_score ?? 0} label="Consistency" color="bg-indigo-500" />
            <CRSBar value={trader.copyability_score ?? 0} label="Copyability" color="bg-cyan-500" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-800 rounded-lg p-2">
              <div className="text-gray-500">Equity</div>
              <div className="text-white font-mono">{equity > 0 ? `$${equity.toLocaleString('en-US', {maximumFractionDigits: 0})}` : '—'}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2">
              <div className="text-gray-500">Consistency</div>
              <div className="text-white font-mono">{trader.raw.consistency != null ? String(trader.raw.consistency) : '—'}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2">
              <div className="text-gray-500">Trade Count</div>
              <div className="text-white font-mono">
                {trader.trade_stats?.trade_count != null ? trader.trade_stats.trade_count : '—'}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2">
              <div className="text-gray-500">Win Rate</div>
              <div className={`font-mono ${
                trader.trade_stats?.win_rate != null
                  ? (safeNum(trader.trade_stats.win_rate) >= 50 ? 'text-green-400' : 'text-yellow-400')
                  : 'text-white'
              }`}>
                {trader.trade_stats?.win_rate != null
                  ? `${safeNum(trader.trade_stats.win_rate).toFixed(0)}%`
                  : '—'}
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">Wallet Address</div>
            <div className="font-mono text-xs text-gray-300 break-all">{trader.address}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RankedTraders() {
  const [traders, setTraders] = useState<CRSTrader[]>([]);
  const [allTraders, setAllTraders] = useState<CRSTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [gradeFilter, setGradeFilter] = useState('B');
  const [showDisqualified, setShowDisqualified] = useState(false);
  const [availableGrades, setAvailableGrades] = useState<Set<string>>(new Set());
  const [gradeCounts, setGradeCounts] = useState<Record<string, number>>({});

  const { authenticated, login } = usePrivy();
  const { address: walletAddress, loading: walletLoading, timedOut: walletTimedOut } = useSolanaWallet();

  const fetchRanked = useCallback(async () => {
    try {
      // Promise.allSettled: /traders가 실패해도 /traders/ranked는 표시 (graceful degradation)
      const [rankedResult, tradersResult] = await Promise.allSettled([
        fetch(`${API_URL}/traders/ranked?limit=100&min_grade=C&exclude_disqualified=${!showDisqualified}`),
        fetch(`${API_URL}/traders?limit=100`),
      ]);
      if (rankedResult.status === 'rejected' || !rankedResult.value.ok) {
        throw new Error(`/traders/ranked 오류: ${rankedResult.status === 'rejected' ? rankedResult.reason : rankedResult.value.status}`);
      }
      const rankedData = await rankedResult.value.json();
      // /traders 실패해도 ranked는 표시 (roi_30d는 raw에서 fallback)
      let tradersData: { data?: { address: string; roi_30d?: number }[] } = { data: [] };
      if (tradersResult.status === 'fulfilled' && tradersResult.value.ok) {
        tradersData = await tradersResult.value.json();
      }

      const roiMap: Record<string, number> = {};
      for (const t of (tradersData.data || [])) {
        if (t.address && typeof t.roi_30d === 'number') roiMap[t.address] = t.roi_30d;
      }

      const merged: CRSTrader[] = (rankedData.data || []).map((t: CRSTrader) => ({
        ...t,
        raw: { ...t.raw, roi_30d: roiMap[t.address] ?? t.raw.roi_30d ?? 0 },
      }));

      setAllTraders(merged);

      // 실제 존재하는 등급 계산 + 등급별 카운트
      const grades = new Set(merged.map(t => t.grade));
      const counts: Record<string, number> = {};
      for (const t of merged) {
        if (!t.disqualified) counts[t.grade] = (counts[t.grade] || 0) + 1;
      }
      setAvailableGrades(grades);
      setGradeCounts(counts);

      // 필터 적용: gradeFilter 이상의 CRS 등급만
      const GRADE_ORDER = ['S','A','B','C','D'];
      const filterIdx = GRADE_ORDER.indexOf(gradeFilter);
      const filtered = merged.filter(t => GRADE_ORDER.indexOf(t.grade) >= 0 && GRADE_ORDER.indexOf(t.grade) <= filterIdx);
      setTraders(filtered);
      setFetchError(false);
    } catch {
      setTraders([]);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [gradeFilter, showDisqualified]);

  useEffect(() => {
    setLoading(true);
    fetchRanked();
    const t = setInterval(fetchRanked, 60000);
    return () => clearInterval(t);
  }, [fetchRanked]);

  // 데이터 로드 후 기본값을 가장 높은 등급으로 자동 설정
  useEffect(() => {
    if (allTraders.length === 0) return;
    const GRADE_ORDER = ['S','A','B','C','D'];
    const bestGrade = GRADE_ORDER.find(g => allTraders.some(t => t.grade === g && !t.disqualified));
    if (bestGrade) setGradeFilter(bestGrade);
  }, [allTraders]);

  // 필터 변경 시 allTraders에서 재필터링
  useEffect(() => {
    if (allTraders.length === 0) return;
    const GRADE_ORDER = ['S','A','B','C','D'];
    const filterIdx = GRADE_ORDER.indexOf(gradeFilter);
    const filtered = allTraders.filter(t => GRADE_ORDER.indexOf(t.grade) <= filterIdx);
    setTraders(filtered);
  }, [gradeFilter, allTraders]);

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {(['S','A','B','C']).map(g => {
            const hasTraders = availableGrades.has(g);
            const count = gradeCounts[g] ?? 0;
            return (
              <button
                key={g}
                onClick={() => setGradeFilter(g)}
                disabled={!hasTraders}
                title={GRADE_DESC[g]}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  gradeFilter === g
                    ? GRADE_COLORS[g]
                    : hasTraders
                      ? 'border-gray-700 text-gray-400 hover:text-gray-200'
                      : 'border-gray-800 text-gray-700 cursor-not-allowed opacity-50'
                }`}
              >
                {g} {count > 0 ? `(${count})` : '(0)'}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showDisqualified}
            onChange={e => setShowDisqualified(e.target.checked)}
            className="rounded"
          />
          Show filtered traders
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : fetchError ? (
        <div className="text-center py-16 text-red-400">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm mb-3">Failed to load ranked traders — retrying…</p>
          <button
            onClick={fetchRanked}
            className="text-indigo-400 text-sm hover:underline"
          >
            Retry now
          </button>
        </div>
      ) : traders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🔍</div>
          <p className="mb-1">No {gradeFilter}-grade traders on testnet yet.</p>
          <p className="text-xs text-gray-600 mt-1">
            {gradeFilter === 'S' || gradeFilter === 'A'
              ? 'Try B or C to see available traders.'
              : 'Check back soon as more traders are evaluated.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {traders.map((t, i) => (
            <TraderCard
              key={t.address}
              trader={t}
              rank={i + 1}
              authenticated={authenticated}
              walletAddress={walletAddress}
              walletLoading={walletLoading}
              walletTimedOut={walletTimedOut}
              onLoginNeeded={login}
            />
          ))}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-600 text-center">
        CRS: Profitability(30%) · Risk(25%) · Momentum(25%) · Consistency(15%) · Copyability(5%) · Updates every 60s
      </div>
    </>
  );
}
