import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { ToastProvider } from '@/components/Toast';

const BASE_URL = 'https://copy-perp-frontend.vercel.app';

export const metadata: Metadata = {
  title: 'Copy Perp — Decentralized Copy Trading on Pacifica',
  description: 'Automatically copy top traders on Pacifica DEX. Non-custodial, algorithm-selected, Builder Code revenue.',
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: 'Copy Perp — Copy Top Traders on Pacifica DEX',
    description: 'Follow the best perp traders and automatically mirror their positions. Non-custodial · On-chain · <600ms latency.',
    url: BASE_URL,
    siteName: 'Copy Perp',
    type: 'website',
    // OG image auto-served from app/opengraph-image.tsx via Next.js Image Response API
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Copy Perp — Decentralized Copy Trading on Pacifica',
    description: 'Follow the best perp traders and mirror their positions. Non-custodial · On-chain.',
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
