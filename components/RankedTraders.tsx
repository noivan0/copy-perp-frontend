'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { LoginModal } from './LoginModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

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

function CRSBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-20 text-right shrink-0">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-gray-400 w-8 text-right font-mono">{value.toFixed(0)}</span>
    </div>
  );
}

function TraderCard({ trader, rank, onFollow }: {
  trader: CRSTrader;
  rank: number;
  onFollow: (addr: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { authenticated } = usePrivy();

  const gradeStyle = GRADE_COLORS[trader.grade] || GRADE_COLORS['D'];
  const ringStyle = GRADE_RING[trader.grade] || '';
  const roi30 = trader.raw.roi_30d ?? 0;
  const pnl30 = trader.raw.pnl_30d ?? 0;
  const equity = trader.raw.equity ?? 0;

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl overflow-hidden ${ringStyle} hover:border-gray-700 transition-all`}>
      {/* 헤더 */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* 순위 */}
          <div className="text-gray-600 font-mono text-sm shrink-0 w-6 text-center">
            {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : `#${rank}`}
          </div>
          {/* 아바타 */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {trader.address.slice(0,2).toUpperCase()}
          </div>
          {/* 주소 + 등급 */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-white">
                {trader.address.slice(0,8)}…{trader.address.slice(-4)}
              </span>
              <span className={`px-1.5 py-0.5 text-xs font-bold rounded border ${gradeStyle}`}>
                {trader.grade}
              </span>
            </div>
            {trader.alias && (
              <div className="text-xs text-gray-500 truncate">{trader.alias}</div>
            )}
          </div>
        </div>

        {/* CRS 점수 + 팔로우 */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{trader.crs.toFixed(0)}</div>
            <div className="text-xs text-gray-500">CRS</div>
          </div>
          {!trader.disqualified && (
            <button
              onClick={() => {
                if (!authenticated) onFollow(trader.address);
                else onFollow(trader.address);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              팔로우
            </button>
          )}
        </div>
      </div>

      {/* 핵심 지표 */}
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
          <div className="text-xs text-gray-500">추천 비율</div>
        </div>
      </div>

      {/* 강점/경고 요약 */}
      {(trader.strengths?.length > 0 || trader.warnings?.length > 0 || trader.disqualified) && (
        <div className="px-4 py-3 border-t border-gray-800/50">
          {trader.disqualified ? (
            <div className="text-xs text-red-400 flex items-center gap-1.5">
              <span>❌</span>
              <span>{trader.disq_reason || '하드 필터 제외'}</span>
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

      {/* 상세 확장 토글 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-2 text-xs text-gray-600 hover:text-gray-400 border-t border-gray-800/50 transition-colors flex items-center justify-center gap-1"
      >
        {expanded ? '접기 ▲' : '상세 분석 ▼'}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-800/50 pt-3">
          {/* 5차원 스코어 바 */}
          <div className="space-y-1.5">
            <div className="text-xs text-gray-500 mb-2 font-medium">CRS 5차원 분석</div>
            <CRSBar value={trader.profitability_score ?? 0} label="수익성" color="bg-green-500" />
            <CRSBar value={trader.risk_score ?? 0} label="위험관리" color="bg-blue-500" />
            <CRSBar value={trader.momentum_score ?? 0} label="모멘텀" color="bg-purple-500" />
            <CRSBar value={trader.consistency_score ?? 0} label="일관성" color="bg-indigo-500" />
            <CRSBar value={trader.copyability_score ?? 0} label="복사가능" color="bg-cyan-500" />
          </div>

          {/* 원시 지표 */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-800 rounded-lg p-2">
              <div className="text-gray-500">자산</div>
              <div className="text-white font-mono">${equity.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2">
              <div className="text-gray-500">일관성</div>
              <div className="text-white font-mono">{trader.raw.consistency ?? '—'}</div>
            </div>
          </div>

          {/* 지갑 주소 전체 */}
          <div className="bg-gray-800 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">지갑 주소</div>
            <div className="font-mono text-xs text-gray-300 break-all">{trader.address}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RankedTraders() {
  const [traders, setTraders] = useState<CRSTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState('C');
  const [showDisqualified, setShowDisqualified] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [followTarget, setFollowTarget] = useState<string | undefined>();

  const fetchRanked = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_URL}/traders/ranked?limit=30&min_grade=${gradeFilter}&exclude_disqualified=${!showDisqualified}`
      );
      const data = await res.json();
      setTraders(data.data || []);
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

  const handleFollow = (addr: string) => {
    setFollowTarget(addr);
    setLoginModal(true);
  };

  return (
    <>
      <LoginModal
        isOpen={loginModal}
        onClose={() => { setLoginModal(false); setFollowTarget(undefined); }}
        followAfterLogin={followTarget}
        onSuccess={() => setLoginModal(false)}
      />

      {/* 필터 툴바 */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {(['S','A','B','C']).map(g => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                gradeFilter === g
                  ? GRADE_COLORS[g]
                  : 'border-gray-700 text-gray-500 hover:text-gray-300'
              }`}
            >
              {g}등급+
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showDisqualified}
            onChange={e => setShowDisqualified(e.target.checked)}
            className="rounded"
          />
          제외 트레이더 표시
        </label>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : traders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🔍</div>
          <p>선택한 등급의 트레이더가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {traders.map((t, i) => (
            <TraderCard key={t.address} trader={t} rank={i + 1} onFollow={handleFollow} />
          ))}
        </div>
      )}

      {/* 하단 안내 */}
      <div className="mt-6 text-xs text-gray-600 text-center">
        CRS(Composite Reliability Score) — 수익성·위험관리·모멘텀·일관성·복사가능성 5차원 평가 · 60초 자동 갱신
      </div>
    </>
  );
}
