'use client';

import { usePrivy } from '@privy-io/react-auth';
import { getSolanaAddress } from '@/lib/privy-helpers';

export function ConnectButton() {
  const { ready, authenticated, logout, login, user } = usePrivy();
  const address = getSolanaAddress(user ?? null);

  if (!ready) {
    return (
      <button disabled className="bg-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm cursor-not-allowed">
        Loading...
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
        </svg>
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="text-sm text-gray-300 font-mono">
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
        </span>
      </div>
      <button
        onClick={logout}
        className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
