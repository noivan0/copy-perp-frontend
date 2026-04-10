'use client';

import { PrivyProvider } from '@privy-io/react-auth';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmmvoxcix058e0ckv7uhp9ip0';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['google', 'email', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#6366f1',
        },
        embeddedWallets: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          solana: { createOnLogin: 'users-without-wallets' } as any,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
