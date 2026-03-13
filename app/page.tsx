import { ConnectButton } from '@/components/ConnectButton';
import { Leaderboard } from '@/components/Leaderboard';
import { SignalFeed } from '@/components/SignalFeed';
import { CopyTradeLog } from '@/components/CopyTradeLog';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950">
      {/* 헤더 */}
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
        {/* 히어로 */}
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
            <span>⚡ 500ms latency</span>
            <span>💰 0.1% fee</span>
            <span>🎁 Fuul rewards</span>
          </div>
        </section>

        {/* 실시간 시그널 */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Live Market Signals</h2>
          <SignalFeed />
        </section>

        {/* 리더보드 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Top Traders</h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Live</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <Leaderboard />
          </div>
        </section>

        {/* Copy Trade 내역 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">실시간 Copy Trade 내역</h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">30초 자동 갱신</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <CopyTradeLog />
          </div>
        </section>

        {/* 작동 방식 */}
        <section className="border-t border-gray-800 pt-10">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: '01', title: 'Connect', desc: 'Sign in with Google via Privy. Solana wallet auto-created.', icon: '🔑' },
              { step: '02', title: 'Choose', desc: 'Browse top traders by PnL, win rate, and drawdown.', icon: '🎯' },
              { step: '03', title: 'Copy', desc: 'Set your copy ratio and max position size. We handle the rest.', icon: '⚡' },
              { step: '04', title: 'Earn', desc: 'Traders earn Builder Code fees. Followers earn Fuul points.', icon: '💰' },
            ].map(item => (
              <div key={item.step} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="text-xs text-indigo-400 font-mono mb-1">STEP {item.step}</div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="border-t border-gray-800 mt-16 py-8 text-center text-gray-600 text-sm">
        <p>Copy Perp — Pacifica Hackathon 2026 · Track 3: Social & Gamification</p>
        <p className="mt-1">Built with 💙 by Paperclip AI</p>
      </footer>
    </main>
  );
}
