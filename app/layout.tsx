import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'Copy Perp — Decentralized Copy Trading on Pacifica',
  description: 'Automatically copy top traders on Pacifica DEX. Non-custodial, algorithm-selected, Builder Code revenue.',
  openGraph: {
    title: 'Copy Perp',
    description: 'Copy top traders on Pacifica DEX — non-custodial, on-chain',
    url: 'https://copy-perp-frontend.vercel.app',
    siteName: 'Copy Perp',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Copy Perp — Decentralized Copy Trading on Pacifica',
    description: 'Copy top traders on Pacifica DEX — non-custodial, on-chain',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans bg-gray-950 text-white min-h-screen">
        <Providers>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
