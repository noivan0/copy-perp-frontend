/* v3 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';

function safeNum(v: unknown, fb = 0): number { const n = Number(v); return isFinite(n) ? n : fb; }

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://copy-perp.onrender.com';

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
  followerAddress,
  onLoginNeeded,
}: {
  traderAddr: string;
  authenticated: boolean;
  followerAddress?: string;
  onLoginNeeded: () => void;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleClick = async () => {
    if (!authenticated) { onLoginNeeded(); return; }
    if (!followerAddress) {
      setMsg('Wallet not ready — please wait');
      setState('error');
      setTimeout(() => setState('idle'), 3000);
      return;
    }
    setState('loading');
    try {
      const res = await fetch(`${API_URL}/followers/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower_address: followerAddress,
          traders: [traderAddr],
          copy_ratio: 0.07,
          max_position_usdc: 50,
          strategy: 'safe',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setState('done');
      } else {
        setMsg(data.detail || 'Failed');
        setState('error');
        setTimeout(() => setState('idle'), 3000);
      }
    } catch {
      setMsg('Network error');
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  if (state === 'done') return (
    <span className="text-green-400 text-sm font-medium px-2">✅ Following</span>
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5"
      >
        {state === 'loading' ? (
          <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin inline-block" /> Following...</>
        ) : (
          authenticated ? 'Follow' : 'Sign in to Follow'
        )}
      </button>
      {state === 'error' && msg && (
        <span className="text-xs text-red-400">{msg}</span>
      )}
    </div>
  );
}

function TraderCard({ trader, rank, authenticated, followerAddress, onLoginNeeded }: {
  trader: CRSTrader;
  rank: number;
  authenticated: boolean;
  followerAddress?: string;
  onLoginNeeded: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const gradeStyle = GRADE_COLORS[trader.grade] || GRADE_COLORS['D'];
  const ringStyle = GRADE_RING[trader.grade] || '';
  const roi30 = safeNum(trader.raw?.roi_30d);
  const pnl30 = safeNum(trader.raw?.pnl_30d);
  const equity = safeNum(trader.raw?.equity);

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
              followerAddress={followerAddress}
              onLoginNeeded={onLoginNeeded}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-gray-800 border-t border-gray-800">
        <div className="bg-gray-900 p-3 text-center">
          <div className={`text-lg font-bold ${roi30 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {roi30 >= 0 ? '+' : ''}{roi30.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">30d ROI</div>
        </div>
        <div className="bg-gray-900 p-3 text-center">
          <div className={`text-lg font-bold ${pnl30 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {pnl30 >= 0 ? '+$' : '-$'}{Math.abs(pnl30).toLocaleString(undefined, {maximumFractionDigits: 0})}
          </div>
          <div className="text-xs text-gray-500">30d PnL</div>
        </div>
        <div className="bg-gray-900 p-3 text-center">
          <div className="text-lg font-bold text-indigo-300">
            {trader.copy_ratio_pct}%
          </div>
          <div className="text-xs text-gray-500">Suggested Ratio</div>
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
        className="w-full py-2 text-xs text-gray-600 hover:text-gray-400 border-t border-gray-800/50 transition-colors flex items-center justify-center gap-1"
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
              <div className="text-white font-mono">${equity.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2">
              <div className="text-gray-500">Consistency</div>
              <div className="text-white font-mono">{trader.raw.consistency ?? '—'}</div>
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
  const [gradeFilter, setGradeFilter] = useState('B');
  const [showDisqualified, setShowDisqualified] = useState(false);
  const [availableGrades, setAvailableGrades] = useState<Set<string>>(new Set());

  const { authenticated, user, login } = usePrivy();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solanaWallet = (user?.linkedAccounts as any[])?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => a.type === 'wallet' && a.chainType === 'solana'
  );
  const followerAddress: string | undefined = solanaWallet?.address;

  const fetchRanked = useCallback(async () => {
    try {
      const [rankedRes, tradersRes] = await Promise.all([
        fetch(`${API_URL}/traders/ranked?limit=50&min_grade=C&exclude_disqualified=${!showDisqualified}`),
        fetch(`${API_URL}/traders?limit=200`),
      ]);
      const rankedData = await rankedRes.json();
      const tradersData = await tradersRes.json();

      const roiMap: Record<string, number> = {};
      for (const t of (tradersData.data || [])) {
        if (t.address && typeof t.roi_30d === 'number') roiMap[t.address] = t.roi_30d;
      }

      const merged: CRSTrader[] = (rankedData.data || []).map((t: CRSTrader) => ({
        ...t,
        raw: { ...t.raw, roi_30d: roiMap[t.address] ?? t.raw.roi_30d ?? 0 },
      }));

      setAllTraders(merged);

      // 실제 존재하는 등급 계산
      const grades = new Set(merged.map(t => t.grade));
      setAvailableGrades(grades);

      // 필터 적용: gradeFilter 이상의 CRS 등급만
      const GRADE_ORDER = ['S','A','B','C','D'];
      const filterIdx = GRADE_ORDER.indexOf(gradeFilter);
      const filtered = merged.filter(t => GRADE_ORDER.indexOf(t.grade) >= 0 && GRADE_ORDER.indexOf(t.grade) <= filterIdx);
      setTraders(filtered);
    } catch {
      setTraders([]);
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
            return (
              <button
                key={g}
                onClick={() => setGradeFilter(g)}
                disabled={!hasTraders && g !== 'B' && g !== 'C'}
                title={GRADE_DESC[g]}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  gradeFilter === g
                    ? GRADE_COLORS[g]
                    : hasTraders
                      ? 'border-gray-700 text-gray-400 hover:text-gray-200'
                      : 'border-gray-800 text-gray-700 cursor-not-allowed'
                }`}
              >
                {g}+
                {!hasTraders && <span className="ml-1 text-xs opacity-50">0</span>}
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
      ) : traders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🔍</div>
          <p className="mb-1">No traders found for grade <strong>{gradeFilter}+</strong></p>
          <p className="text-xs text-gray-600">Try selecting B+ or C+ to see available traders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {traders.map((t, i) => (
            <TraderCard
              key={t.address}
              trader={t}
              rank={i + 1}
              authenticated={authenticated}
              followerAddress={followerAddress}
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
