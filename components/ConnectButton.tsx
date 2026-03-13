'use client';

import { usePrivy } from '@privy-io/react-auth';

export function ConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solanaWallet = (user?.linkedAccounts as any[])?.find(
    (a: any) => a.type === 'wallet' && a.chainType === 'solana'
  );
  const address: string | undefined = solanaWallet?.address;

  if (!ready) {
    return (
      <button
        id="wallet-btn"
        disabled
        className="bg-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        id="wallet-btn"
        onClick={login}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        <span className="text-sm text-gray-300 font-mono">
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
        </span>
      </div>
      <button
        id="wallet-disconnect-btn"
        onClick={logout}
        className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}
