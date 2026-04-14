import { ConnectButton } from '@/components/ConnectButton';
import { Leaderboard } from '@/components/Leaderboard';
import { SignalFeed } from '@/components/SignalFeed';
import { CopyTradeLog } from '@/components/CopyTradeLog';
import { Portfolio } from '@/components/Portfolio';
import { ReferralBanner, RefCodeNotice } from '@/components/ReferralBanner';
import { RankedTraders } from '@/components/RankedTraders';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { HeroCTA } from '@/components/HeroCTA';

const APP_VERSION = '1.4.0';
const DEPLOY_DATE = '2026-04-14';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950">
      {/* 오프라인 감지 배너 */}
      <OfflineBanner />

      {/* Header */}
      <header className="border-b border-gray-800 sticky top-0 bg-gray-950/95 backdrop-blur z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
              CP
            </div>
            <div>
              <span className="font-bold text-white">Copy Perp</span>
              <span className="text-gray-500 text-xs ml-2 hidden sm:inline">on Pacifica</span>
            </div>
          </div>
          <ConnectButton />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Referral code notice */}
        <ErrorBoundary name="RefCodeNotice">
          <RefCodeNotice />
        </ErrorBoundary>

        {/* Referral banner (post-login) */}
        <ErrorBoundary name="ReferralBanner">
          <ReferralBanner />
        </ErrorBoundary>

        {/* Hero */}
        <section className="text-center py-6 md:py-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-3 py-1.5 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
            Live on Pacifica Mainnet
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Copy Top Traders<br />
            <span className="text-indigo-400">on Pacifica DEX</span>
          </h1>
          <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto mb-6">
            Follow the best performers and automatically mirror their positions.
            Fully on-chain, non-custodial, powered by Builder Code.
          </p>
          <div className="flex items-center justify-center flex-wrap gap-4 md:gap-6 text-sm text-gray-500 mb-6">
            <span className="flex items-center gap-1.5">🔐 Non-custodial</span>
            <span className="flex items-center gap-1.5">⚡ &lt;600ms latency</span>
            <span className="flex items-center gap-1.5">💰 0.1% builder fee</span>
            <span className="flex items-center gap-1.5">🔑 Privy wallet</span>
          </div>
          <HeroCTA />
        </section>

        {/* How It Works — 상단 배치로 흐름 이해 먼저 */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4 text-center">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { num: '01', icon: '🔑', title: 'Connect', desc: 'Sign in with Google. Solana wallet auto-created.' },
              { num: '02', icon: '🎯', title: 'Choose', desc: 'Browse CRS-ranked traders by reliability score.' },
              { num: '03', icon: '⚡', title: 'Copy', desc: 'Set ratio & max size. Trades mirror in <600ms.' },
              { num: '04', icon: '💰', title: 'Earn', desc: 'Builder Code (noivan) captures 0.1% of all copy trade volume on-chain.' },
            ].map(({ num, icon, title, desc }) => (
              <div key={num} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="text-xs text-indigo-400 font-mono mb-1">STEP {num}</div>
                <h3 className="font-semibold text-white text-sm mb-1">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live Market Signals */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Live Market Signals</h2>
              <p className="text-xs text-gray-500 mt-0.5">Funding rate extremes &amp; oracle divergence</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              LIVE · 5s
            </span>
          </div>
          <ErrorBoundary name="SignalFeed">
            <SignalFeed />
          </ErrorBoundary>
        </section>

        {/* CRS Ranked Traders */}
        <section id="crs-leaderboard" className="scroll-mt-20">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl font-semibold text-white">CRS Leaderboard</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Composite Reliability Score — 5-dimensional ranking before you copy
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              LIVE · 60s
            </span>
          </div>
          <ErrorBoundary name="RankedTraders">
            <RankedTraders />
          </ErrorBoundary>
        </section>

        {/* My Portfolio — 로그인 시만 노출 (Portfolio 내부에서 null 반환) */}
        <ErrorBoundary name="Portfolio">
          <Portfolio sectionMode />
        </ErrorBoundary>

        {/* Full Leaderboard */}
        <section id="full-leaderboard" className="scroll-mt-20">
          <div className="flex items-center justify-between mb-4 scroll-mt-20">
            <div>
              <h2 className="text-xl font-semibold text-white">Full Leaderboard</h2>
              <p className="text-xs text-gray-500 mt-0.5">All active traders sorted by 30d PnL</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              LIVE · 30s
            </span>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <ErrorBoundary name="Leaderboard">
              <Leaderboard />
            </ErrorBoundary>
          </div>
        </section>

        {/* Live Copy Trade Log */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Live Copy Trade Log</h2>
              <p className="text-xs text-gray-500 mt-0.5">Real-time copy execution history</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              LIVE · 30s
            </span>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 overflow-x-hidden">
            <ErrorBoundary name="CopyTradeLog">
              <CopyTradeLog />
            </ErrorBoundary>
          </div>
        </section>
      </div>

      <footer className="border-t border-gray-800 mt-16 py-8 text-center text-gray-600 text-sm space-y-1">
        <p>Copy Perp — Made by noivan · Pacifica Hackathon 2026</p>
        <p className="text-xs text-gray-700">
          v{APP_VERSION} · {DEPLOY_DATE} · Mainnet
        </p>
      </footer>
    </main>
  );
}
