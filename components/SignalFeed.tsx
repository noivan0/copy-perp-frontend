/* v2 */
'use client';

import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/config';


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

export function SignalFeed() {
  const [funding, setFunding] = useState<MarketSignal[]>([]);
  const [divergence, setDivergence] = useState<MarketSignal[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSignals = () => {
    fetch(`${API_URL}/signals?top_n=5`)
      .then(r => r.json())
      .then(d => {
        setFunding(d.funding_extremes || []);
        setDivergence(d.oracle_mark_divergence || []);
        setUpdatedAt(new Date().toLocaleTimeString());
        setHasError(false);
        setIsLoading(false);
      })
      .catch(() => {
        setHasError(true);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchSignals();
    const iv = setInterval(fetchSignals, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Funding Rate Extremes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">⚡ Funding Rate Extremes</h3>
          <span className="text-xs text-gray-500">{updatedAt || '—'}</span>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-gray-600 text-sm text-center py-4">Loading...</p>
          ) : hasError ? (
            <p className="text-red-400 text-sm text-center py-4">⚠️ Signal data unavailable — retrying…</p>
          ) : funding.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">No funding extremes</p>
          ) : (
            funding.slice(0, 5).map(f => {
              const rate = safeFloat(f.funding);
              const mark = safeFloat(f.mark);
              const isHigh = rate > 0.01;
              const isLow = rate < -0.01;
              return (
                <div key={f.symbol} className="flex justify-between items-center">
                  <span className="text-white text-sm font-medium w-20">{f.symbol}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs">${mark.toFixed(4)}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      isHigh ? 'bg-red-500/20 text-red-400' :
                      isLow ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {rate >= 0 ? '+' : ''}{(rate * 100).toFixed(4)}%
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
          
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-gray-600 text-sm text-center py-4">Loading...</p>
          ) : hasError ? (
            <p className="text-red-400 text-sm text-center py-4">⚠️ Data unavailable</p>
          ) : divergence.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">No significant divergence</p>
          ) : (
            divergence.slice(0, 5).map(d => {
              const mark = safeFloat(d.mark);
              const oracle = safeFloat(d.oracle);
              // divergence_pct may be missing — compute from mark/oracle
              const divPct = d.divergence_pct != null
                ? safeFloat(d.divergence_pct)
                : (oracle > 0 ? ((mark - oracle) / oracle * 100) : 0);
              return (
                <div key={d.symbol} className="flex justify-between items-center">
                  <span className="text-white text-sm font-medium w-20">{d.symbol}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs">Mark ${mark.toFixed(4)}</span>
                    <span className={`text-xs font-semibold ${divPct >= 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                      {divPct >= 0 ? '+' : ''}{divPct.toFixed(3)}%
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
    </div>
  );
}
