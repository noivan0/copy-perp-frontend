'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://copy-perp.onrender.com';

interface FundingSignal {
  symbol: string;
  mark: string;
  oracle: string;
  funding: string;
  open_interest: string;
  volume_24h: string;
}

interface DivergenceSignal {
  symbol: string;
  mark: string;
  oracle: string;
  divergence_pct: number;
}

export function SignalFeed() {
  const [funding, setFunding] = useState<FundingSignal[]>([]);
  const [divergence, setDivergence] = useState<DivergenceSignal[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');

  const fetchSignals = () => {
    fetch(`${API_URL}/signals?top_n=5`)
      .then(r => r.json())
      .then(d => {
        setFunding(d.funding_extremes || []);
        setDivergence(d.oracle_mark_divergence || []);
        setUpdatedAt(new Date().toLocaleTimeString());
      })
      .catch(() => {});
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
          {funding.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">Loading...</p>
          ) : (
            funding.slice(0, 5).map(f => {
              const rate = parseFloat(f.funding);
              const isHigh = rate > 0.01;
              const isLow = rate < -0.01;
              return (
                <div key={f.symbol} className="flex justify-between items-center">
                  <span className="text-white text-sm font-medium">{f.symbol}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs">${parseFloat(f.mark).toFixed(4)}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      isHigh ? 'bg-red-500/20 text-red-400' :
                      isLow ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {(rate * 100).toFixed(4)}%
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
          <span className="text-xs text-gray-500">5s refresh</span>
        </div>
        <div className="space-y-3">
          {divergence.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">No significant divergence</p>
          ) : (
            divergence.slice(0, 5).map(d => (
              <div key={d.symbol} className="flex justify-between items-center">
                <span className="text-white text-sm font-medium">{d.symbol}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs">Mark ${parseFloat(d.mark).toFixed(2)}</span>
                  <span className={`text-xs font-semibold ${d.divergence_pct >= 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                    {d.divergence_pct >= 0 ? '+' : ''}{d.divergence_pct.toFixed(3)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-gray-600 mt-4">
          Mark vs Oracle price gap. Large divergence = arbitrage opportunity.
        </p>
      </div>
    </div>
  );
}
