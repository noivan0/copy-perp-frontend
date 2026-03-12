'use client';

import { PrivyProvider } from '@privy-io/react-auth';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function Providers({ children }: { children: React.ReactNode }) {
  // Privy App ID 없으면 그냥 children 렌더 (빌드/개발 환경)
  if (!PRIVY_APP_ID || PRIVY_APP_ID === 'placeholder-replace-with-real-app-id') {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['google', 'twitter', 'email', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#6366f1',
        },
        embeddedWallets: {
          solana: { createOnLogin: 'users-without-wallets' },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
