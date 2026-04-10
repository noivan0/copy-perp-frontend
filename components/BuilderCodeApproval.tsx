'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import bs58 from 'bs58';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://copy-perp.onrender.com';
const BUILDER_CODE = 'noivan';
const MAX_FEE_RATE = '0.0005';

interface Props {
  onApproved: () => void;
}

export function BuilderCodeApproval({ onApproved }: Props) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [status, setStatus] = useState<'checking' | 'needed' | 'signing' | 'approved' | 'error'>('checking');
  const [error, setError] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const solanaWallet = (user?.linkedAccounts as any[])?.find(
    (a: any) => a.type === 'wallet' && a.chainType === 'solana'
  );
  const address: string = solanaWallet?.address || '';

  useEffect(() => {
    if (!address) return;
    checkApproval();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  async function checkApproval() {
    if (!address) return;
    setStatus('checking');
    try {
      const res = await fetch(`${API_URL}/builder/check?account=${address}`);
      const data = await res.json();
      if (data.approved) {
        setStatus('approved');
        onApproved();
      } else {
        setStatus('needed');
      }
    } catch {
      setStatus('needed');
    }
  }

  async function handleApprove() {
    if (!address) return;
    setStatus('signing');
    setError('');

    try {
      const prepRes = await fetch(`${API_URL}/builder/prepare-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: address, max_fee_rate: MAX_FEE_RATE }),
      });
      const prep = await prepRes.json();

      const privyWallet = wallets.find((w) => w.walletClientType === 'privy');
      if (!privyWallet) throw new Error('Privy embedded wallet not found');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = await (privyWallet as any).getSolanaProvider?.();
      let signature: string;
      if (provider) {
        const msgBytes = new TextEncoder().encode(prep.message);
        const { signature: sig } = await provider.signMessage(msgBytes);
        signature = bs58.encode(sig instanceof Uint8Array ? sig : new Uint8Array(sig));
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { signature: sig } = await (privyWallet as any).sign(
          new TextEncoder().encode(prep.message)
        );
        signature = bs58.encode(sig instanceof Uint8Array ? sig : new Uint8Array(sig));
      }

      const approveRes = await fetch(`${API_URL}/builder/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: address,
          signature,
          timestamp: prep.timestamp,
          max_fee_rate: MAX_FEE_RATE,
        }),
      });

      if (!approveRes.ok) {
        const err = await approveRes.json();
        throw new Error(err.detail || 'Approval failed');
      }

      setStatus('approved');
      onApproved();
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="w-4 h-4 border border-gray-600 border-t-transparent rounded-full animate-spin" />
        Checking Builder Code...
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <span>✅</span>
        <span>Builder Code <span className="font-mono">{BUILDER_CODE}</span> approved</span>
      </div>
    );
  }

  if (status === 'signing') {
    return (
      <div className="flex items-center gap-2 text-sm text-indigo-400">
        <div className="w-4 h-4 border border-indigo-500 border-t-transparent rounded-full animate-spin" />
        Signing in wallet...
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-xl">🔐</span>
        <div>
          <p className="text-sm font-medium text-white">Builder Code Approval Required</p>
          <p className="text-xs text-gray-400 mt-1">
            Copy Perp collects <strong className="text-white">0.05%</strong> of trade fees via builder code{' '}
            <span className="font-mono text-indigo-400">{BUILDER_CODE}</span>.
            One-time signature, used to sustain the service.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        onClick={handleApprove}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
      >
        Sign &amp; Start Copy Trading
      </button>

      <p className="text-xs text-gray-600 text-center">
        One-time signature · Revocable at any time
      </p>
    </div>
  );
}
