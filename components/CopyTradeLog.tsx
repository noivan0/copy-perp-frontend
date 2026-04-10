/* v3 — safeNum guard on all toFixed calls */
'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://copy-perp.onrender.com';

function safeNum(v: unknown, fb = 0): number {
  const n = Number(v);
  return isFinite(n) ? n : fb;
}

interface CopyTrade {
  id: number;
  follower_address: string;
  trader_address: string;
  symbol: string;
  side: string;
  amount: string;
  price: string;
  status: string;
  pnl: number | null;
  created_at: number;
}

interface Summary {
  filled?: number;
  total?: number;
  failed?: number;
  total_volume_usdc?: number;
  total_pnl_usdc?: number;
  realized_pnl_usdc?: number;
  win_rate_pct?: number;
}

export function CopyTradeLog({ follower }: { follower?: string }) {
  const [trades, setTrades] = useState<CopyTrade[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = `${API_URL}/trades?limit=20${follower ? `&follower=${follower}` : ''}`;
    const load = () => {
      fetch(url)
        .then(r => r.json())
        .then(d => {
          setTrades(Array.isArray(d.data) ? d.data : []);
          setSummary(d.summary || null);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [follower]);

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );

  const totalPnl = safeNum(summary?.realized_pnl_usdc ?? summary?.total_pnl_usdc);

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">Filled Orders</div>
            <div className="text-xl font-bold text-white">{safeNum(summary.filled)}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">Total Volume</div>
            <div className="text-xl font-bold text-indigo-400">
              ${safeNum(summary.total_volume_usdc).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400">Total PnL</div>
            <div className={`text-xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} USDC
            </div>
          </div>
        </div>
      )}

      {trades.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No copy trades yet. Follow a trader to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-2 px-3">Time</th>
                <th className="text-left py-2 px-3">Symbol</th>
                <th className="text-left py-2 px-3">Side</th>
                <th className="text-right py-2 px-3">Size</th>
                <th className="text-right py-2 px-3">Price</th>
                <th className="text-center py-2 px-3">Status</th>
                <th className="text-right py-2 px-3">PnL</th>
              </tr>
            </thead>
            <tbody>
              {trades.map(t => {
                const tradePnl = safeNum(t.pnl);
                return (
                  <tr key={t.id} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                    <td className="py-2 px-3 text-gray-500">
                      {new Date(safeNum(t.created_at) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2 px-3 font-medium">{t.symbol}</td>
                    <td className={`py-2 px-3 font-medium ${t.side === 'bid' ? 'text-green-400' : 'text-red-400'}`}>
                      {t.side === 'bid' ? '▲ LONG' : '▼ SHORT'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{t.amount}</td>
                    <td className="py-2 px-3 text-right font-mono">${safeNum(parseFloat(t.price || '0')).toLocaleString()}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        t.status === 'filled' ? 'bg-green-500/20 text-green-400' :
                        t.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {t.status === 'filled' ? 'Filled' : t.status === 'failed' ? 'Failed' : 'Pending'}
                      </span>
                    </td>
                    <td className={`py-2 px-3 text-right font-mono ${tradePnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {t.pnl != null ? `${tradePnl >= 0 ? '+' : ''}${tradePnl.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
