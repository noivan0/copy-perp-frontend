/* v7 — Following badge, last-updated, useVisibleInterval, consistent 30s polling */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallet } from '@/lib/use-solana-wallet';
import { API_URL, NETWORK } from '@/lib/config';
import { extractErrorMessage, httpErrorMessage } from '@/lib/api';
import { formatPct, formatUSDC, formatAddr } from '@/lib/format';
import { useToast } from '@/components/Toast';
import { CopySettingsModal, type RiskMode } from '@/components/CopySettingsModal';
import { useVisibleInterval } from '@/lib/use-visible-interval';

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

// R9: CRS 등급 색상 배지 — S=금, A=초록, B=파랑, C=노랑, D=빨강
const GRADE_COLORS: Record<string, string> = {
  S: 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10',
  A: 'text-green-400 border-green-500/50 bg-green-500/10',
  B: 'text-blue-400 border-blue-500/50 bg-blue-500/10',
  C: 'text-yellow-300 border-yellow-400/50 bg-yellow-400/10',
  D: 'text-red-400 border-red-500/50 bg-red-500/10',
};

const GRADE_RING: Record<string, string> = {
  S: 'ring-2 ring-yellow-500/30',
  A: 'ring-1 ring-green-500/20',
  B: 'ring-1 ring-blue-500/20',
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
  traderAlias,
  roi30d,
  copyRatioPct,
  authenticated,
  walletAddress,
  walletLoading,
  walletTimedOut,
  isFollowing,
  onLoginNeeded,
}: {
  traderAddr: string;
  traderAlias?: string;
  roi30d: number;
  copyRatioPct: number;
  authenticated: boolean;
  walletAddress?: string;
  walletLoading: boolean;
  walletTimedOut: boolean;
  isFollowing: boolean;
  onLoginNeeded: () => void;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();

  // 이미 팔로우 중인 경우 done 상태로 동기화
  const effectivelyDone = state === 'done' || isFollowing;

  const doFollow = async (copyRatio: number, riskMode: RiskMode, maxPositionUsdc: number) => {
    setShowModal(false);
    setState('loading');
    setMsg('');
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(`${API_URL}/followers/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          follower_address: walletAddress,
          traders: [traderAddr],
          copy_ratio: copyRatio,
          max_position_usdc: maxPositionUsdc,
          risk_mode: riskMode,
          strategy: riskMode === 'conservative' ? 'safe' : riskMode === 'aggressive' ? 'aggressive' : 'balanced',
        }),
      });
      clearTimeout(timer);

      // 503 / 5xx 전용 처리
      if (res.status === 503 || res.status >= 500) {
        const errMsg = 'Service temporarily unavailable. Retrying in 30s…';
        setMsg(errMsg);
        setState('error');
        showToast(errMsg, 'error');
        setTimeout(() => setState('idle'), 4000);
        return;
      }

      const data = await res.json();
      if (data.ok) {
        // API 응답의 effective_copy_ratio 반영
        const effectivePct = data.effective_copy_ratio != null
          ? ` (ratio: ${(data.effective_copy_ratio * 100).toFixed(1)}%)`
          : '';
        setState('done');
        showToast(`Now following ${formatAddr(traderAddr)} 🎯${effectivePct}`, 'success');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('followSuccess', {
            detail: { traderAddr, effectiveCopyRatio: data.effective_copy_ratio ?? copyRatio },
          }));
        }
        if (typeof window !== 'undefined' && walletAddress) {
          try {
            const key = `cp_following_${walletAddress}`;
            const cached: string[] = JSON.parse(localStorage.getItem(key) || '[]');
            if (!cached.includes(traderAddr)) cached.push(traderAddr);
            localStorage.setItem(key, JSON.stringify(cached));
          } catch { /* ignore */ }
          setTimeout(() => window.dispatchEvent(new CustomEvent('portfolio:refresh')), 300);
        }
      } else {
        const errDetail =
          (typeof data.detail === 'string' ? data.detail : null) ??
          data.detail?.error ?? data.error ??
          (Array.isArray(data.errors) ? data.errors[0] : null) ??
          httpErrorMessage(res.status);
        setMsg(errDetail);
        setState('error');
        showToast(errDetail, 'error');
        setTimeout(() => setState('idle'), 4000);
      }
    } catch (e) {
      const msg = e instanceof DOMException && e.name === 'AbortError'
        ? 'Request timed out — try again'
        : 'Network error — try again';
      setMsg(msg);
      setState('error');
      showToast(msg, 'error');
      setTimeout(() => setState('idle'), 4000);
    }
  };

  const handleClick = () => {
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
    setShowModal(true);
  };

  if (effectivelyDone) return (
    <span className="text-green-400 text-sm font-medium px-2 flex items-center gap-1">
      <span className="text-green-500">✓</span> Following
    </span>
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
    <>
      {showModal && (
        <CopySettingsModal
          traderAddr={traderAddr}
          traderAlias={traderAlias}
          roi30d={roi30d / 100}
          copyRatioPct={copyRatioPct}
          onConfirm={doFollow}
          onCancel={() => setShowModal(false)}
        />
      )}
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
    </>
  );
}

function TraderCard({ trader, rank, authenticated, walletAddress, walletLoading, walletTimedOut, followingAddresses, onLoginNeeded }: {
  trader: CRSTrader;
  rank: number;
  authenticated: boolean;
  walletAddress?: string;
  walletLoading: boolean;
  walletTimedOut: boolean;
  followingAddresses: Set<string>;
  onLoginNeeded: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const isFollowing = followingAddresses.has(trader.address);
  const gradeStyle = GRADE_COLORS[trader.grade] || GRADE_COLORS['D'];
  const ringStyle = GRADE_RING[trader.grade] || '';
  // roi_30d: raw 값 우선, 없으면 pnl/equity로 계산
  const rawRoi = safeNum(trader.raw?.roi_30d);
  const pnl30 = safeNum(trader.raw?.pnl_30d);
  const equity = safeNum(trader.raw?.equity);
  const roi30 = rawRoi !== 0 ? rawRoi
    : (equity > 0 && pnl30 !== 0) ? pnl30 / (equity - pnl30) * 100
    : 0;

  // Expected return preview (with $500 baseline, using recommended copy_ratio_pct)
  const PREVIEW_CAPITAL = 500;
  const previewRatio = trader.copy_ratio_pct / 100;
  const previewReturn = PREVIEW_CAPITAL * previewRatio * (roi30 / 100);
  const showPreview = roi30 !== 0 && !trader.disqualified;

  return (
    <div className={`bg-gray-900 border rounded-xl overflow-hidden ${ringStyle} transition-all ${
      isFollowing
        ? 'border-green-500/40 shadow-[0_0_0_1px_rgba(74,222,128,0.15)]'
        : 'border-gray-800 hover:border-gray-700'
    }`}>
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
              {/* Following 배지 */}
              {isFollowing && (
                <span className="px-1.5 py-0.5 text-xs font-semibold rounded border bg-green-500/15 text-green-400 border-green-500/30 flex items-center gap-0.5">
                  ✓ Following
                </span>
              )}
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
              traderAlias={trader.alias}
              roi30d={roi30}
              copyRatioPct={trader.copy_ratio_pct}
              authenticated={authenticated}
              walletAddress={walletAddress}
              walletLoading={walletLoading}
              walletTimedOut={walletTimedOut}
              isFollowing={isFollowing}
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

      {/* Expected return preview — $500 baseline */}
      {showPreview && (
        <div className="px-4 py-2 border-t border-gray-800/50 flex items-center justify-between text-xs">
          <span className="text-gray-500">If you copy with $500 →</span>
          <span className={`font-semibold ${previewReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            est. {previewReturn >= 0 ? '+' : ''}{previewReturn.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} / 30d
          </span>
        </div>
      )}

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
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  // 팔로우 중인 트레이더 주소 Set
  const [followingAddresses, setFollowingAddresses] = useState<Set<string>>(new Set());

  const { authenticated, login } = usePrivy();
  const { address: walletAddress, loading: walletLoading, timedOut: walletTimedOut } = useSolanaWallet();

  const relativeTime = useRelativeTime(updatedAt);

  // 팔로잉 목록 로드 (로그인 시)
  const fetchFollowing = useCallback(async () => {
    if (!authenticated || !walletAddress) {
      setFollowingAddresses(new Set());
      return;
    }
    try {
      // localStorage 캐시에서 즉시 로드
      const key = `cp_following_${walletAddress}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        const arr: string[] = JSON.parse(cached);
        setFollowingAddresses(new Set(arr));
      }
      // API에서 최신 데이터로 갱신
      const res = await fetch(`${API_URL}/followers/list?follower_address=${walletAddress}`);
      if (res.ok) {
        const d = await res.json();
        const addrs: string[] = (d.data || []).map((f: { trader_address: string }) => f.trader_address);
        setFollowingAddresses(new Set(addrs));
        localStorage.setItem(key, JSON.stringify(addrs));
      }
    } catch { /* ignore */ }
  }, [authenticated, walletAddress]);

  // 팔로우 성공 시 팔로잉 목록 갱신
  useEffect(() => {
    const handler = () => fetchFollowing();
    window.addEventListener('followSuccess', handler);
    window.addEventListener('portfolio:refresh', handler);
    return () => {
      window.removeEventListener('followSuccess', handler);
      window.removeEventListener('portfolio:refresh', handler);
    };
  }, [fetchFollowing]);

  useEffect(() => { fetchFollowing(); }, [fetchFollowing]);

  const fetchRanked = useCallback(async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const [rankedResult, tradersResult] = await Promise.allSettled([
        fetch(`${API_URL}/traders/ranked?limit=100&min_grade=C&exclude_disqualified=${!showDisqualified}`, { signal: ctrl.signal }),
        fetch(`${API_URL}/traders?limit=100`, { signal: ctrl.signal }),
      ]);
      clearTimeout(timer);
      if (rankedResult.status === 'rejected' || !rankedResult.value.ok) {
        throw new Error(`/traders/ranked 오류`);
      }
      const rankedData = await rankedResult.value.json();
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

      const grades = new Set(merged.map(t => t.grade));
      const counts: Record<string, number> = {};
      for (const t of merged) {
        if (!t.disqualified) counts[t.grade] = (counts[t.grade] || 0) + 1;
      }
      setAvailableGrades(grades);
      setGradeCounts(counts);

      const GRADE_ORDER = ['S','A','B','C','D'];
      const filterIdx = GRADE_ORDER.indexOf(gradeFilter);
      const filtered = merged.filter(t => GRADE_ORDER.indexOf(t.grade) >= 0 && GRADE_ORDER.indexOf(t.grade) <= filterIdx);
      setTraders(filtered);
      setFetchError(false);
      setUpdatedAt(Date.now());
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
  }, [fetchRanked]);

  // 30초 폴링 (탭 활성 시에만)
  useVisibleInterval(fetchRanked, 30000);

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
                className={`px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors border ${
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
        <div className="flex items-center gap-3 flex-wrap">
          {updatedAt && (
            <span className="text-xs text-gray-600">Updated {relativeTime}</span>
          )}
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
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse" aria-busy="true" aria-label="Loading traders…">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-4 bg-gray-800 rounded" />
                  <div className="w-9 h-9 rounded-full bg-gray-800" />
                  <div className="space-y-2">
                    <div className="h-3 w-28 bg-gray-800 rounded" />
                    <div className="h-2 w-16 bg-gray-700 rounded" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="h-6 w-10 bg-gray-800 rounded ml-auto" />
                  <div className="h-2 w-8 bg-gray-700 rounded ml-auto" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-px bg-gray-800 border-t border-gray-800">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="bg-gray-900 p-3 text-center space-y-1.5">
                    <div className="h-4 w-12 bg-gray-800 rounded mx-auto" />
                    <div className="h-2 w-10 bg-gray-700 rounded mx-auto" />
                  </div>
                ))}
              </div>
              <div className="h-10 bg-gray-900 border-t border-gray-800/50" />
            </div>
          ))}
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
          <p className="mb-1">No {gradeFilter}-grade traders on {NETWORK} yet.</p>
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
              followingAddresses={followingAddresses}
              onLoginNeeded={login}
            />
          ))}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-600 text-center">
        CRS: Profitability(30%) · Risk(25%) · Momentum(25%) · Consistency(15%) · Copyability(5%) · Updates every 30s
      </div>
    </>
  );
}
