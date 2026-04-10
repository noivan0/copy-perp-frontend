import { ConnectButton } from '@/components/ConnectButton';
import { Leaderboard } from '@/components/Leaderboard';
import { SignalFeed } from '@/components/SignalFeed';
import { CopyTradeLog } from '@/components/CopyTradeLog';
import { ReferralBanner, RefCodeNotice } from '@/components/ReferralBanner';
import { RankedTraders } from '@/components/RankedTraders';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 sticky top-0 bg-gray-950/90 backdrop-blur z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              CP
            </div>
            <div>
              <span className="font-bold text-white">Copy Perp</span>
              <span className="text-gray-500 text-xs ml-2">on Pacifica</span>
            </div>
          </div>
          <ConnectButton />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Referral code notice */}
        <RefCodeNotice />

        {/* Referral banner (post-login) */}
        <ReferralBanner />

        {/* Hero */}
        <section className="text-center py-8">
          <h1 className="text-4xl font-bold text-white mb-3">
            Copy Top Traders on{' '}
            <span className="text-indigo-400">Pacifica DEX</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Follow the best traders and automatically mirror their positions.
            Fully on-chain, non-custodial, powered by Builder Code.
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
            <span>🔐 Non-custodial</span>
            <span>⚡ &lt;600ms latency</span>
            <span>💰 0.1% builder fee</span>
            <span>🎁 Fuul rewards</span>
          </div>
        </section>

        {/* Live Market Signals */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Live Market Signals</h2>
          <SignalFeed />
        </section>

        {/* CRS Ranked Traders */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl font-semibold text-white">CRS Leaderboard</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Composite Reliability Score — 5-dimensional ranking before you copy
              </p>
            </div>
            <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">● Live</span>
          </div>
          <RankedTraders />
        </section>

        {/* Full Leaderboard */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Full Leaderboard</h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Live</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <Leaderboard />
          </div>
        </section>

        {/* Live Copy Trade Log */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Live Copy Trade Log</h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">30s refresh</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <CopyTradeLog />
          </div>
        </section>

        {/* How It Works */}
        <section className="border-t border-gray-800 pt-10">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { num: '01', icon: '🔑', title: 'Connect', desc: 'Sign in with Google via Privy. Solana wallet auto-created in 30 seconds.' },
              { num: '02', icon: '🎯', title: 'Choose', desc: 'Browse CRS-ranked traders by ROI, win rate, and max drawdown.' },
              { num: '03', icon: '⚡', title: 'Copy', desc: 'Set your copy ratio and max size. Copy Engine replicates trades in <600ms.' },
              { num: '04', icon: '💰', title: 'Earn', desc: 'Followers earn Fuul points. Builder Code noivan captures fees on-chain.' },
            ].map(({ num, icon, title, desc }) => (
              <div key={num} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <div className="text-3xl mb-3">{icon}</div>
                <div className="text-xs text-indigo-400 font-mono mb-1">STEP {num}</div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="border-t border-gray-800 mt-16 py-8 text-center text-gray-600 text-sm">
        <p>Copy Perp — Made by noivan</p>
      </footer>
    </main>
  );
}
