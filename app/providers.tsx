'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { PRIVY_APP_ID } from '@/lib/config';

// Solana wallet connectors — Privy 대시보드에 solana_wallet_auth=true 설정 시
// externalWallets.solana.connectors 미전달 → 콘솔 경고 11개 발생
// toSolanaWalletConnectors()로 명시적 전달하여 경고 제거
const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: false });

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // 'wallet' 제거: WalletConnect projectId 없이 포함 시 콘솔 에러 발생
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
        // Solana wallet connectors 명시적 전달 → 경고 제거
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
