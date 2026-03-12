import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Copy Perp — Decentralized Copy Trading on Pacifica',
  description: 'Follow top traders and automatically copy their positions on Pacifica DEX',
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
          {children}
        </Providers>
      </body>
    </html>
  );
}
