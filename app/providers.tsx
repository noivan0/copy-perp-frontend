'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { PRIVY_APP_ID } from '@/lib/config';


export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // 'wallet' 제거: WalletConnect projectId 없이 포함 시 콘솔 에러 11개 발생
        // Copy Perp UX: Google/Email → Solana 임베디드 지갑 자동 생성 (비수탁)
        loginMethods: ['google', 'email'],
        appearance: {
          theme: 'dark',
          accentColor: '#6366f1',
        },
        // Privy v3: createOnLogin per chain
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
