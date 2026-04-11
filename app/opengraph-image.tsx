import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Copy Perp — Decentralized Copy Trading on Pacifica DEX';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #030712 0%, #0f172a 50%, #1e1b4b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        {/* Logo + Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              background: '#4f46e5',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            CP
          </div>
          <div
            style={{
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '999px',
              padding: '8px 20px',
              color: '#a5b4fc',
              fontSize: '18px',
            }}
          >
            Live on Pacifica Testnet
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.1,
            marginBottom: '20px',
          }}
        >
          Copy Top Traders
          <br />
          <span style={{ color: '#818cf8' }}>on Pacifica DEX</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '26px',
            color: '#9ca3af',
            textAlign: 'center',
            maxWidth: '800px',
            marginBottom: '48px',
          }}
        >
          Non-custodial · CRS-ranked · &lt;600ms latency · Fuul rewards
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {['🔐 Non-custodial', '⚡ &lt;600ms', '💰 0.1% fee', '🎁 Fuul rewards'].map((f) => (
            <div
              key={f}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px 20px',
                color: '#d1d5db',
                fontSize: '18px',
              }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
