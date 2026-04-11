/* v8 — skipped_insufficient 배지, last-updated, 30s polling, tooltip */
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
  const ms = ts > 1e12 ? ts : ts * 1000;
  return new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/** "X seconds ago" 훅 */
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

/** 상태 배지 — 잔액 부족(skipped_insufficient) 포함 */
function StatusBadge({ status, errorMsg }: { status: string; errorMsg?: string }) {
  const isInsufficient = status === 'skipped_insufficient';
  const isFailed = status === 'failed' || isInsufficient;

  let badgeClass = '';
  let label = '';
  let tooltipText = errorMsg || '';

  if (status === 'filled') {
    badgeClass = 'bg-green-500/20 text-green-400';
    label = '✓ Filled';
  } else if (isInsufficient) {
    badgeClass = 'bg-red-500/20 text-red-400';
    label = '⚠ Low Funds';
    tooltipText = tooltipText || 'Insufficient balance — trade was skipped. Please top up your account.';
  } else if (status === 'failed') {
    badgeClass = 'bg-red-500/20 text-red-400';
    label = '✗ Failed';
    tooltipText = tooltipText || 'Trade execution failed';
  } else {
    badgeClass = 'bg-yellow-500/20 text-yellow-400';
    label = '⏳ Pending';
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-help ${badgeClass}`}
        title={tooltipText}
      >
        {label}
      </span>
      {isFailed && errorMsg && (
        <div
          className="text-[10px] text-red-400/70 max-w-[120px] truncate leading-tight"
          title={errorMsg}
        >
          {errorMsg.length > 40 ? errorMsg.slice(0, 40) + '…' : errorMsg}
        </div>
      )}
      {isInsufficient && !errorMsg && (
        <div className="text-[10px] text-red-400/60 leading-tight text-center">
          Insufficient funds
        </div>
      )}
    </div>
  );
}

export function CopyTradeLog({ follower }: { follower?: string }) {
  const [trades, setTrades] = useState<CopyTrade[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [serviceDown, setServiceDown] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const relativeTime = useRelativeTime(updatedAt);

  const fetchTrades = useCallback(async () => {
    const url = `${API_URL}/trades?limit=30${follower ? `&follower_address=${follower}` : ''}`;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (r.status === 503 || r.status >= 500) {
        throw new Error(`SERVICE_UNAVAILABLE:${r.status}`);
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const data: CopyTrade[] = Array.isArray(d.data) ? d.data : [];
      setTrades(data);
      setSummary(d.summary || null);
      setFetchError(false);
      setUpdatedAt(Date.now());
    } catch (err) {
      const isUnavailable = err instanceof Error && err.message.startsWith('SERVICE_UNAVAILABLE');
      setFetchError(true);
      setServiceDown(isUnavailable);
    } finally {
      setLoading(false);
    }
  }, [follower]);

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    fetchTrades();
  }, [fetchTrades]);

  // 30초마다 자동 갱신 (탭 활성 시에만) — SignalFeed 5초 외 전 섹션 30초 통일
  useVisibleInterval(fetchTrades, 30000);

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );

  if (fetchError) return (
    <div className="text-center py-8 text-red-400 text-sm space-y-2">
      <div className="text-2xl">⚠️</div>
      <p className="font-medium">
        {serviceDown
          ? 'Service temporarily unavailable. Retrying in 30s…'
          : 'Failed to load trade history — retrying…'}
      </p>
      <button
        onClick={fetchTrades}
        className="text-indigo-400 text-xs hover:underline"
      >
        Retry now
      </button>
    </div>
  );

  const totalPnl = safeNum(summary?.realized_pnl_usdc ?? summary?.total_pnl_usdc);
  const filled = safeNum(summary?.filled);
  const failed = safeNum(summary?.failed);
  const total = safeNum(summary?.total);
  const wr = safeNum(summary?.win_rate_pct);

  // skipped_insufficient 거래 수 집계
  const insufficientCount = trades.filter(t => t.status === 'skipped_insufficient').length;

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

      {/* 잔액 부족 경고 배너 */}
      {insufficientCount > 0 && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <span className="text-red-400 text-lg shrink-0">⚠️</span>
          <div>
            <p className="text-red-400 text-sm font-medium">Insufficient Funds — {insufficientCount} trade{insufficientCount > 1 ? 's' : ''} skipped</p>
            <p className="text-red-400/70 text-xs mt-0.5">
              Some copy trades were skipped due to insufficient balance. Please deposit more funds to continue copying.
            </p>
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
                const isInsufficient = t.status === 'skipped_insufficient';
                const isFailed = t.status === 'failed' || isInsufficient;
                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-gray-800/20 transition-colors group ${isFailed ? 'bg-red-950/10' : ''}`}
                  >
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
                      <StatusBadge status={t.status} errorMsg={t.error_msg} />
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

      <div className="flex items-center justify-between text-xs text-gray-600">
        {updatedAt && <span>Last updated {relativeTime}</span>}
        <span className="ml-auto">Auto-refresh every 30s</span>
      </div>
    </div>
  );
}
