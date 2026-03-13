'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState } from 'react';
import { LoginModal } from './LoginModal';

export function ConnectButton() {
  const { ready, authenticated, logout, user } = usePrivy();
  const [showModal, setShowModal] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solanaWallet = (user?.linkedAccounts as any[])?.find(
    (a: any) => a.type === 'wallet' && a.chainType === 'solana'
  );
  const address: string | undefined = solanaWallet?.address;

  if (!ready) {
    return (
      <button
        disabled
        className="bg-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  if (!authenticated) {
    return (
      <>
        <LoginModal isOpen={showModal} onClose={() => setShowModal(false)} />
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
          Google로 시작
        </button>
      </>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="text-sm text-gray-300 font-mono">
          {address
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : user?.email?.address ?? 'Connected'}
        </span>
      </div>
      <button
        onClick={logout}
        className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
      >
        로그아웃
      </button>
    </div>
  );
}
