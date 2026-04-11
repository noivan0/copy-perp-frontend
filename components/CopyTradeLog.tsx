/* v7 — format.ts 통합, 모바일 테이블 min-w 추가 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useVisibleInterval } from '@/lib/use-visible-interval';
import { API_URL } from '@/lib/config';
import { formatPnl, formatPrice } from '@/lib/format';


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
  const [fetchError, setFetchError] = useState(false);

  const fetchTrades = useCallback(async () => {
    const url = `${API_URL}/trades?limit=30${follower ? `&follower_address=${follower}` : ''}`;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const data: CopyTrade[] = Array.isArray(d.data) ? d.data : [];
      setTrades(data);
      setSummary(d.summary || null);
      setFetchError(false);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [follower]);

  // follower 변경 시 상태 초기화 후 재조회
  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    fetchTrades();
  }, [fetchTrades]);

  // 15초마다 자동 갱신 (탭 활성 시에만)
  useVisibleInterval(fetchTrades, 15000);

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );

  if (fetchError) return (
    <div className="text-center py-8 text-red-400 text-sm">
      ⚠️ Failed to load trade history — retrying…
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
              {formatPnl(totalPnl)}
            </div>
            <div className="text-xs text-gray-500">USDC</div>
          </div>
        </div>
      )}

      {trades.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">
          <div className="text-3xl mb-2">📋</div>
          No copy trades yet. Follow a trader from the CRS Leaderboard above to start copying.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[600px] text-xs">
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
                      {formatPrice(safeNum(t.exec_price ?? parseFloat(t.price || '0')))}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.status === 'filled' ? 'bg-green-500/20 text-green-400' :
                        t.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`} title={t.error_msg || ''}>
                        {t.status === 'filled' ? '✓ Filled' :
                         t.status === 'failed' ? '✗ Failed' :
                         '⏳ Pending'}
                      </span>
                      {t.status === 'failed' && t.error_msg && (
                        <div className="text-[10px] text-red-400/70 mt-0.5 max-w-[120px] truncate" title={t.error_msg}>
                          {t.error_msg.length > 40 ? t.error_msg.slice(0, 40) + '…' : t.error_msg}
                        </div>
                      )}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono ${
                      !hasPnl ? 'text-gray-600' :
                      pnlVal >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {hasPnl ? formatPnl(pnlVal) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-600 text-center">
        Auto-refresh every 15s
      </p>
    </div>
  );
}
