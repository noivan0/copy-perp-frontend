'use client';

import { usePrivy } from '@privy-io/react-auth';
import { getSolanaAddress } from '@/lib/privy-helpers';
import { useSolanaWallet } from '@/lib/use-solana-wallet';

export function ConnectButton() {
  const { ready, authenticated, logout, login, user } = usePrivy();
  const address = getSolanaAddress(user ?? null);
  const { loading: walletLoading, timedOut: walletTimedOut } = useSolanaWallet();

  if (!ready) {
    return (
      <button disabled className="bg-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm cursor-not-allowed min-h-[44px]">
        Loading…
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
        </svg>
        <span className="hidden sm:inline">Connect Wallet</span>
        <span className="sm:hidden">Connect</span>
      </button>
    );
  }

  /** 지갑 상태 텍스트 — timedOut / loading / 주소 3단계 */
  const walletLabel = (() => {
    if (walletLoading) return '⏳ Wallet…';
    if (walletTimedOut) return '⚠️ Wallet not detected';
    if (address) return `${address.slice(0, 6)}…${address.slice(-4)}`;
    return 'Connected';
  })();

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center gap-2 border rounded-lg px-3 py-2 ${
          walletTimedOut
            ? 'bg-yellow-900/30 border-yellow-700/50'
            : 'bg-gray-800 border-gray-700'
        }`}
        title={walletTimedOut ? 'Embedded wallet creation timed out — refresh the page to retry' : undefined}
      >
        <div className={`w-2 h-2 rounded-full ${
          walletLoading ? 'bg-yellow-400 animate-pulse' :
          walletTimedOut ? 'bg-yellow-500' :
          'bg-green-400 animate-pulse'
        }`} />
        <span className={`text-sm font-mono ${walletTimedOut ? 'text-yellow-400' : 'text-gray-300'}`}>
          {walletLabel}
        </span>
      </div>
      {walletTimedOut && (
        <button
          onClick={() => window.location.reload()}
          className="text-yellow-400 hover:text-yellow-300 text-xs transition-colors underline"
          aria-label="Reload page to retry wallet creation"
        >
          Retry
        </button>
      )}
      <button
        onClick={logout}
        aria-label="Sign out and disconnect wallet"
        className="text-gray-500 hover:text-gray-300 text-sm transition-colors min-h-[44px] px-1"
      >
        Sign out
      </button>
    </div>
  );
}
