/* v4 — format.ts 통합, 업데이트 시각 양쪽 표시, 새 데이터 하이라이트 */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useVisibleInterval } from '@/lib/use-visible-interval';
import { API_URL } from '@/lib/config';
import { formatPrice, formatPct } from '@/lib/format';


interface MarketSignal {
  symbol: string;
  mark: string;
  oracle: string;
  funding: string;
  open_interest: string;
  volume_24h?: string;
  divergence_pct?: number;  // optional — computed if missing
}

function safeFloat(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isFinite(n) ? n : fallback;
}

/** "Updated X seconds ago" 계산 */
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

export function SignalFeed() {
  const [funding, setFunding] = useState<MarketSignal[]>([]);
  const [divergence, setDivergence] = useState<MarketSignal[]>([]);
  const [updatedAtMs, setUpdatedAtMs] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // 새 데이터 수신 시 하이라이트 트리거
  const [flashKey, setFlashKey] = useState(0);
  const prevSymbolsRef = useRef<string>('');

  const relativeTime = useRelativeTime(updatedAtMs);
  const updatedLabel = updatedAtMs
    ? `Updated ${relativeTime}`
    : '—';

  const fetchSignals = useCallback(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    fetch(`${API_URL}/signals?top_n=5`, { signal: ctrl.signal })
      .then(r => { clearTimeout(timer); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => {
        const newFunding: MarketSignal[] = d.funding_extremes || [];
        const newDivergence: MarketSignal[] = d.oracle_mark_divergence || [];

        // 심볼 변경 감지 → 하이라이트
        const symbolSnapshot = JSON.stringify(newFunding.map(f => f.symbol).concat(newDivergence.map(x => x.symbol)));
        if (prevSymbolsRef.current && prevSymbolsRef.current !== symbolSnapshot) {
          setFlashKey(k => k + 1);
        }
        prevSymbolsRef.current = symbolSnapshot;

        setFunding(newFunding);
        setDivergence(newDivergence);
        setUpdatedAtMs(Date.now());
        setHasError(false);
        setIsLoading(false);
      })
      .catch(() => {
        clearTimeout(timer);
        setHasError(true);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);
  useVisibleInterval(fetchSignals, 5000);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Funding Rate Extremes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">⚡ Funding Rate Extremes</h3>
          <span className="text-xs text-gray-500" title={updatedAtMs ? new Date(updatedAtMs).toLocaleTimeString() : ''}>
            {updatedLabel}
          </span>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-gray-600 text-sm text-center py-4">Loading...</p>
          ) : hasError ? (
            <p className="text-red-400 text-sm text-center py-4">⚠️ Signal data unavailable — retrying…</p>
          ) : funding.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">No funding extremes</p>
          ) : (
            funding.slice(0, 5).map((f, i) => {
              const rate = safeFloat(f.funding);
              const mark = safeFloat(f.mark);
              const isHigh = rate > 0.01;
              const isLow = rate < -0.01;
              return (
                <div
                  key={`${flashKey}-${f.symbol}-${i}`}
                  className="flex justify-between items-center transition-colors duration-500"
                  style={flashKey > 0 ? { animation: 'signal-flash 0.8s ease-out' } : undefined}
                >
                  <span className="text-white text-sm font-medium w-20">{f.symbol}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs">{formatPrice(mark)}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      isHigh ? 'bg-red-500/20 text-red-400' :
                      isLow ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {formatPct(rate * 100, 4)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <p className="text-xs text-gray-600 mt-4">
          Extreme funding = potential reversal signal. High positive → longs overloaded.
        </p>
      </div>

      {/* Oracle-Mark Divergence */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">🔮 Oracle-Mark Divergence</h3>
          <span className="text-xs text-gray-500" title={updatedAtMs ? new Date(updatedAtMs).toLocaleTimeString() : ''}>
            {updatedLabel}
          </span>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-gray-600 text-sm text-center py-4">Loading...</p>
          ) : hasError ? (
            <p className="text-red-400 text-sm text-center py-4">⚠️ Data unavailable</p>
          ) : divergence.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">No significant divergence</p>
          ) : (
            divergence.slice(0, 5).map((d, i) => {
              const mark = safeFloat(d.mark);
              const oracle = safeFloat(d.oracle);
              // divergence_pct may be missing — compute from mark/oracle
              const divPct = d.divergence_pct != null
                ? safeFloat(d.divergence_pct)
                : (oracle > 0 ? ((mark - oracle) / oracle * 100) : 0);
              return (
                <div
                  key={`${flashKey}-${d.symbol}-${i}`}
                  className="flex justify-between items-center transition-colors duration-500"
                  style={flashKey > 0 ? { animation: 'signal-flash 0.8s ease-out' } : undefined}
                >
                  <span className="text-white text-sm font-medium w-20">{d.symbol}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs">Mark {formatPrice(mark)}</span>
                    <span className={`text-xs font-semibold ${divPct >= 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                      {formatPct(divPct, 3)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <p className="text-xs text-gray-600 mt-4">
          Mark vs Oracle price gap. Large divergence = arbitrage opportunity.
        </p>
      </div>

      {/* 플래시 애니메이션 CSS */}
      <style>{`
        @keyframes signal-flash {
          0%   { background-color: rgba(99, 102, 241, 0.18); }
          100% { background-color: transparent; }
        }
      `}</style>
    </div>
  );
}
