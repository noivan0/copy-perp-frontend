/**
 * CopySettingsModal — 팔로우 전 copy_ratio / risk_mode / 시뮬레이션 설정 모달
 * v1: 슬라이더(copy ratio) + 버튼(risk mode) + 기대수익 시뮬레이터
 */
'use client';

import { useState, useEffect } from 'react';

export type RiskMode = 'conservative' | 'balanced' | 'aggressive';

interface CopySettingsModalProps {
  traderAlias?: string;
  traderAddr: string;
  roi30d: number;          // 트레이더 30d ROI (소수, 예: 0.15 = 15%)
  copyRatioPct: number;    // API 추천 copy ratio % (예: 7)
  onConfirm: (copyRatio: number, riskMode: RiskMode, maxPositionUsdc: number) => void;
  onCancel: () => void;
}

const RISK_PRESETS: Record<RiskMode, { label: string; emoji: string; desc: string; ratioMultiplier: number; maxPos: number }> = {
  conservative: {
    label: 'Conservative',
    emoji: '🛡️',
    desc: 'Lower exposure, stable returns',
    ratioMultiplier: 0.5,
    maxPos: 25,
  },
  balanced: {
    label: 'Balanced',
    emoji: '⚖️',
    desc: 'Recommended default',
    ratioMultiplier: 1.0,
    maxPos: 50,
  },
  aggressive: {
    label: 'Aggressive',
    emoji: '🚀',
    desc: 'Higher risk, higher reward',
    ratioMultiplier: 1.5,
    maxPos: 100,
  },
};

export function CopySettingsModal({
  traderAlias,
  traderAddr,
  roi30d,
  copyRatioPct,
  onConfirm,
  onCancel,
}: CopySettingsModalProps) {
  const [riskMode, setRiskMode] = useState<RiskMode>('balanced');
  const [capitalUsdc, setCapitalUsdc] = useState(500);

  // 기본 copy ratio — API 추천값 기준
  const baseRatio = Math.min(copyRatioPct / 100, 0.15);
  const preset = RISK_PRESETS[riskMode];
  const effectiveRatio = Math.min(baseRatio * preset.ratioMultiplier, 0.20);
  const maxPositionUsdc = preset.maxPos;

  // 기대수익 시뮬레이션
  const estimatedReturn = capitalUsdc * effectiveRatio * roi30d;
  const estimatedPct = effectiveRatio * roi30d * 100;

  const shortAddr = `${traderAddr.slice(0, 6)}…${traderAddr.slice(-4)}`;
  const displayName = traderAlias || shortAddr;

  // ESC 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Copy settings"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white text-sm">Copy Settings</h2>
            <p className="text-xs text-gray-500 mt-0.5">Following <span className="text-indigo-400">{displayName}</span></p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Risk Mode selector */}
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2 block">
              Risk Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(RISK_PRESETS) as [RiskMode, typeof RISK_PRESETS[RiskMode]][]).map(([mode, info]) => (
                <button
                  key={mode}
                  onClick={() => setRiskMode(mode)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                    riskMode === mode
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg">{info.emoji}</span>
                  <span className="text-xs font-medium">{info.label}</span>
                  <span className="text-[10px] text-gray-500 leading-tight">{info.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Copy Ratio display */}
          <div className="bg-gray-800/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Effective Copy Ratio</span>
              <span className="text-sm font-bold text-indigo-300">{(effectiveRatio * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, effectiveRatio * 100 / 0.20 * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>0%</span>
              <span>Max 20%</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Based on trader&apos;s recommended ratio of <strong className="text-gray-400">{copyRatioPct}%</strong>
            </p>
          </div>

          {/* Capital slider for simulation */}
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2 block">
              Simulate with Capital
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={100}
                max={5000}
                step={100}
                value={capitalUsdc}
                onChange={e => setCapitalUsdc(Number(e.target.value))}
                className="flex-1 accent-indigo-500"
                aria-label="Simulated capital in USDC"
              />
              <span className="text-sm font-mono text-white w-20 text-right">
                ${capitalUsdc.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Simulation result */}
          <div className={`rounded-xl p-4 border ${
            estimatedReturn >= 0
              ? 'bg-green-500/5 border-green-500/20'
              : 'bg-red-500/5 border-red-500/20'
          }`}>
            <div className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
              <span>📊</span>
              <span>30d Estimated Return (based on trader&apos;s past ROI)</span>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <div className={`text-2xl font-bold ${estimatedReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {estimatedReturn >= 0 ? '+' : ''}{estimatedReturn.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {estimatedReturn >= 0 ? '+' : ''}{estimatedPct.toFixed(1)}% on ${capitalUsdc.toLocaleString()} capital
                </div>
              </div>
              <div className="ml-auto text-xs text-gray-600 text-right leading-relaxed">
                Max position<br />per trade: ${maxPositionUsdc}
              </div>
            </div>
            <p className="text-[10px] text-gray-600 mt-2">
              ⚠️ Past performance is not indicative of future results. Crypto trading involves risk.
            </p>
          </div>

          {/* Max position note */}
          <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-800/40 rounded-lg px-3 py-2">
            <span>Max position size</span>
            <span className="text-white font-mono">${maxPositionUsdc} USDC</span>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(effectiveRatio, riskMode, maxPositionUsdc)}
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
          >
            Confirm & Follow →
          </button>
        </div>
      </div>
    </div>
  );
}
