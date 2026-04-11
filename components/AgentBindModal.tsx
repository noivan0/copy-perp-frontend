/**
 * AgentBindModal — Agent Key Binding Onboarding
 * Approves server Agent Key on Pacifica DEX via user wallet signature.
 *
 * Flow:
 *   1. GET /followers/bind-agent/payload?follower_address={addr} → message_to_sign
 *   2. User signs with Privy Solana wallet (useSignMessage)
 *   3. POST /followers/bind-agent → { success: true }
 *   4. onComplete() callback → copy trading active
 */
'use client';

import { useState } from 'react';
import { useSignMessage, useWallets } from '@privy-io/react-auth/solana';
import { API_URL } from '@/lib/config';

/** base58 encode without BigInt (ES2017 compatible) */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function encodeBase58(bytes: Uint8Array): string {
  let leadingZeros = 0;
  for (const b of bytes) { if (b !== 0) break; leadingZeros++; }
  const digits: number[] = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }
  let str = '1'.repeat(leadingZeros);
  for (let i = digits.length - 1; i >= 0; i--) str += BASE58_ALPHABET[digits[i]];
  return str;
}

export interface AgentBindModalProps {
  walletAddress: string;
  onComplete: () => void;
  onSkip: () => void;
}

type Step = 'intro' | 'signing' | 'submitting' | 'done' | 'error';

export function AgentBindModal({ walletAddress, onComplete, onSkip }: AgentBindModalProps) {
  const [step, setStep] = useState<Step>('intro');
  const [error, setError] = useState('');

  const { signMessage } = useSignMessage();
  const { wallets } = useWallets();

  const handleBind = async () => {
    try {
      setStep('signing');
      setError('');

      // 1. Fetch message to sign
      const res = await fetch(
        `${API_URL}/followers/bind-agent/payload?follower_address=${encodeURIComponent(walletAddress)}`
      );
      if (!res.ok) throw new Error(`Failed to get bind payload: HTTP ${res.status}`);
      const data = await res.json();

      const messageToSign: string = data.message_to_sign ?? data.message;
      if (!messageToSign) throw new Error('Server returned no message to sign');

      // 2. Find Privy Solana embedded wallet
      const wallet =
        wallets.find((w) => w.address.toLowerCase() === walletAddress.toLowerCase()) ??
        wallets[0];
      if (!wallet) throw new Error('No signing wallet found — please reconnect');

      // 3. Sign with Privy (shows popup to user)
      // Pacifica expects raw UTF-8 bytes signed with ed25519
      const messageBytes = new TextEncoder().encode(messageToSign);
      const { signature: sigBytes } = await signMessage({
        message: messageBytes,
        wallet,
      });

      // 4. base58 encode signature
      // sigBytes is a 64-byte ed25519 signature from Privy embedded wallet
      const signature = encodeBase58(sigBytes);
      
      // BUG 31 fix: console.debug 제거 (서명/지갑 주소 민감 정보 노출)

      setStep('submitting');

      // 5. Submit to backend → Pacifica agent/bind
      const submitRes = await fetch(`${API_URL}/followers/bind-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower_address: walletAddress,
          signature,
          timestamp: data.timestamp,
          expiry_window: data.expiry_window ?? 5000,
          agent_wallet: data.agent_wallet,
        }),
      });
      const result = await submitRes.json();

      if (result.success) {
        setStep('done');
        setTimeout(onComplete, 1500);
      } else {
        throw new Error(result.error || 'Agent binding failed — please try again');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const userCancelled =
        msg.toLowerCase().includes('user rejected') ||
        msg.toLowerCase().includes('cancelled') ||
        msg.toLowerCase().includes('denied');
      setError(userCancelled ? 'Signature cancelled. Click below to try again.' : msg);
      setStep('error');
    }
  };

  const canClose = step === 'intro' || step === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={canClose ? onSkip : undefined}
      />

      {/* Modal card */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">

        {/* ── Intro ──────────────────────────────────── */}
        {step === 'intro' && (
          <>
            <div className="text-center space-y-2">
              <div className="text-3xl">⚠️</div>
              <h2 className="text-xl font-semibold text-white">One More Step to Start Copying</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Approve Copy Perp to trade on your behalf on Pacifica DEX.<br />
                <span className="text-gray-500">(Signs once — no private key shared)</span>
              </p>
            </div>

            <div className="bg-gray-800/60 rounded-xl p-4 space-y-2 text-xs text-gray-300">
              <div className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>Your assets stay in your wallet — nothing is transferred</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>The server agent can only execute trades on Pacifica on your behalf</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">⚠</span>
                <span>Your wallet will show a signature request popup</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleBind}
                className="w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20"
              >
                Approve &amp; Start Copying
              </button>
              <button
                onClick={onSkip}
                className="w-full px-4 py-2 rounded-xl text-gray-500 text-sm hover:text-gray-300 transition-colors"
              >
                Skip for now
              </button>
            </div>
          </>
        )}

        {/* ── Signing ──────────────────────────────── */}
        {step === 'signing' && (
          <div className="text-center space-y-4 py-6">
            <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div>
              <p className="text-white font-medium">Waiting for signature…</p>
              <p className="text-sm text-gray-400 mt-1">Please approve the signature request in your wallet</p>
            </div>
          </div>
        )}

        {/* ── Submitting ───────────────────────────── */}
        {step === 'submitting' && (
          <div className="text-center space-y-4 py-6">
            <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div>
              <p className="text-white font-medium">Registering with Pacifica…</p>
              <p className="text-sm text-gray-400 mt-1">Please wait a moment</p>
            </div>
          </div>
        )}

        {/* ── Done ─────────────────────────────────── */}
        {step === 'done' && (
          <div className="text-center space-y-4 py-6">
            <div className="text-4xl">✅</div>
            <div>
              <p className="text-white font-semibold">Agent approved!</p>
              <p className="text-sm text-gray-400 mt-1">Copy trading is now active…</p>
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────── */}
        {step === 'error' && (
          <>
            <div className="text-center space-y-2">
              <div className="text-3xl">❌</div>
              <p className="text-white font-medium">Approval Failed</p>
              <p className="text-sm text-red-400 break-words">{error}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-600 text-gray-300 text-sm hover:bg-gray-800 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => { setStep('intro'); setError(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
