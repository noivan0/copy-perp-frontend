/* v4 — error_msg 표시, ms timestamp 처리, Agent Binding 안내, 포트폴리오 연동 */
'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://copy-perp.onrender.com';

function safeNum(v: unknown, fb = 0): number {
  const n = Number(v);
  return isFinite(n) ? n : fb;
}

function formatTime(ts: number): string {
  // ms or seconds 자동 판별
  const ms = ts > 1e12 ? ts : ts * 1000;
  return new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

interface CopyTrade {
  id: string;
  follower_address: string;
  trader_address: string;
  trader_alias?: string;
  symbol: string;
  side: string;
  amount: string;
  price: string;
  status: string;
  pnl: number | null;
  realized_pnl: number | null;
  created_at: number;
  error_msg?: string;
  exec_price?: number;
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
    const load = () => {
      const url = `${API_URL}/trades?limit=30${follower ? `&follower_address=${follower}` : ''}`;
      fetch(url)
        .then(r => r.json())
        .then(d => {
          const data: CopyTrade[] = Array.isArray(d.data) ? d.data : [];
          setTrades(data);
          setSummary(d.summary || null);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [follower]);

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );

  const totalPnl = safeNum(summary?.realized_pnl_usdc ?? summary?.total_pnl_usdc);
  const filled = safeNum(summary?.filled);
  const failed = safeNum(summary?.failed);
  const total = safeNum(summary?.total);
  const wr = safeNum(summary?.win_rate_pct);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Filled</div>
            <div className="text-xl font-bold text-green-400">{filled}</div>
            <div className="text-xs text-gray-500">of {total} orders</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Failed</div>
            <div className={`text-xl font-bold ${failed > 0 ? 'text-red-400' : 'text-gray-400'}`}>{failed}</div>
            <div className="text-xs text-gray-500">orders</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Win Rate</div>
            <div className="text-xl font-bold text-indigo-400">{wr.toFixed(1)}%</div>
            <div className="text-xs text-gray-500">on filled</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Total PnL</div>
            <div className={`text-xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">USDC</div>
          </div>
        </div>
      )}

      {trades.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">
          <div className="text-3xl mb-2">📋</div>
          No copy trades yet. Follow a trader to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800 text-xs uppercase tracking-wide">
                <th className="text-left py-2 px-3">Time</th>
                <th className="text-left py-2 px-3">Trader</th>
                <th className="text-left py-2 px-3">Symbol</th>
                <th className="text-center py-2 px-3">Side</th>
                <th className="text-right py-2 px-3">Size</th>
                <th className="text-right py-2 px-3">Price</th>
                <th className="text-center py-2 px-3">Status</th>
                <th className="text-right py-2 px-3">PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {trades.map(t => {
                const pnlVal = safeNum(t.realized_pnl ?? t.pnl);
                const hasPnl = (t.realized_pnl ?? t.pnl) != null;
                const isUnauth = t.error_msg?.includes('unauthorized to sign');
                return (
                  <tr key={t.id} className="hover:bg-gray-800/20 transition-colors group">
                    <td className="py-2 px-3 text-gray-500 whitespace-nowrap">
                      {formatTime(safeNum(t.created_at))}
                    </td>
                    <td className="py-2 px-3 text-gray-400 font-mono">
                      {(t.trader_alias || t.trader_address?.slice(0,8) || '—')}
                    </td>
                    <td className="py-2 px-3 font-semibold text-white">{t.symbol}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        t.side === 'bid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {t.side === 'bid' ? 'LONG' : 'SHORT'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-gray-300">{t.amount}</td>
                    <td className="py-2 px-3 text-right font-mono text-gray-300">
                      ${safeNum(t.exec_price ?? parseFloat(t.price || '0')).toLocaleString(undefined, {maximumFractionDigits: 4})}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.status === 'filled' ? 'bg-green-500/20 text-green-400' :
                        t.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`} title={t.error_msg || ''}>
                        {t.status === 'filled' ? '✓ Filled' :
                         t.status === 'failed' ? (isUnauth ? '🔑 Auth' : '✗ Failed') :
                         '⏳ Pending'}
                      </span>
                    </td>
                    <td className={`py-2 px-3 text-right font-mono ${
                      !hasPnl ? 'text-gray-600' :
                      pnlVal >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {hasPnl ? `${pnlVal >= 0 ? '+' : ''}$${Math.abs(pnlVal).toFixed(2)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-600 text-center">
        Auto-refresh every 15s · 🔑 Auth = Agent wallet not bound to this address
      </p>
    </div>
  );
}
