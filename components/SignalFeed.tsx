'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

interface MarketSignal {
  symbol: string;
  funding: string;
  mark: string;
  oracle: string;
  open_interest: string;
}

export function SignalFeed() {
  const [funding, setFunding] = useState<MarketSignal[]>([]);
  const [divergence, setDivergence] = useState<MarketSignal[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  async function fetchSignals() {
    try {
      const res = await fetch(`${API_URL}/signals?top_n=5`);
      const d = await res.json();
      setFunding(d.funding_extremes || []);
      setDivergence(d.oracle_mark_divergence || []);
      setLastUpdate(new Date());
    } catch {}
  }

  useEffect(() => {
    fetchSignals();
    const t = setInterval(fetchSignals, 5000);
    return () => clearInterval(t);
  }, []);

  const FundingBadge = ({ value }: { value: string }) => {
    const v = parseFloat(value) * 100;
    const color = v > 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10';
    return (
      <span className={`font-mono text-xs px-2 py-0.5 rounded ${color}`}>
        {v > 0 ? '+' : ''}{v.toFixed(4)}%
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 펀딩비 극단 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">⚡ Funding Rate Extremes</h3>
          <span className="text-xs text-gray-500">
            {lastUpdate ? lastUpdate.toLocaleTimeString() : '—'}
          </span>
        </div>
        <div className="space-y-3">
          {funding.map(m => (
            <div key={m.symbol} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium text-white w-16">{m.symbol}</span>
                <FundingBadge value={m.funding} />
              </div>
              <div className="text-right text-xs text-gray-500">
                OI: {parseFloat(m.open_interest || '0').toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          ))}
          {funding.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">Connecting to WS...</p>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-4">
          Extreme funding = potential reversal signal. High positive = longs overloaded.
        </p>
      </div>

      {/* Oracle-Mark 괴리 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">🔮 Oracle-Mark Divergence</h3>
          <span className="text-xs text-gray-500">5s refresh</span>
        </div>
        <div className="space-y-3">
          {divergence.map(m => {
            const mark = parseFloat(m.mark || '0');
            const oracle = parseFloat(m.oracle || '0');
            const div = oracle > 0 ? ((mark - oracle) / oracle * 100) : 0;
            return (
              <div key={m.symbol} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-white w-16">{m.symbol}</span>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded ${div > 0 ? 'text-purple-400 bg-purple-400/10' : 'text-orange-400 bg-orange-400/10'}`}>
                    {div > 0 ? '+' : ''}{div.toFixed(4)}%
                  </span>
                </div>
                <div className="text-right text-xs text-gray-500 font-mono">
                  {mark.toFixed(4)}
                </div>
              </div>
            );
          })}
          {divergence.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">No significant divergence</p>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-4">
          Mark vs Oracle price gap. Large divergence = arbitrage opportunity.
        </p>
      </div>
    </div>
  );
}
