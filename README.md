# Copy Perp — Web Frontend

> **Pacifica Hackathon 2026 | Track 3: Social & Gamification**
> Next.js 14 + Privy + Fuul 기반 카피트레이딩 프론트엔드

---

## 🔗 Links

- **Backend API:** https://github.com/noivan0/copy-perp
- **Live Demo:** http://localhost:3000 (로컬 실행)
- **Testnet:** https://test-app.pacifica.fi

---

## ✨ Features

- **Privy 소셜 로그인** — Google/Twitter/Discord → Solana 지갑 자동 생성
- **CRS 랭킹 리더보드** — Copy Reliability Score 기반 트레이더 선별
- **실시간 마켓 시그널** — 펀딩비 극단 + Oracle-Mark 괴리 감지
- **1-Click 카피트레이딩** — 팔로우 → 자동 비례 주문
- **Fuul 레퍼럴 배너** — 바이럴 성장 루프
- **Copy Trade 로그** — 실시간 체결 내역

---

## 🚀 Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.local.example .env.local
# NEXT_PUBLIC_PRIVY_APP_ID=cmmvoxcix058e0ckv7uhp9ip0
# NEXT_PUBLIC_API_URL=http://localhost:8001

# 3. Start backend first (copy-perp/)
cd ../copy-perp && uvicorn api.main:app --port 8001

# 4. Run frontend
npm run dev
```

Open http://localhost:3000

---

## 🏗 Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Auth/Wallet | Privy (`@privy-io/react-auth`) |
| Referral | Fuul (`lib/fuul.ts`) |
| Styling | Tailwind CSS |
| Language | TypeScript |

---

## 📁 Structure

```
app/
├── layout.tsx          # 루트 레이아웃 (Privy Provider)
├── page.tsx            # 메인 페이지
└── providers.tsx       # PrivyProvider 설정

components/
├── ConnectButton.tsx   # Privy 로그인/지갑 연결 버튼
├── Leaderboard.tsx     # 트레이더 리더보드 + 팔로우 버튼
├── RankedTraders.tsx   # CRS 등급별 트레이더 카드
├── SignalFeed.tsx      # 실시간 마켓 시그널
├── CopyTradeLog.tsx    # 복사 거래 로그
├── ReferralBanner.tsx  # Fuul 레퍼럴 배너
├── LoginModal.tsx      # 로그인 모달
└── BuilderCodeApproval.tsx  # Builder Code 서명 UI

lib/
├── fuul.ts             # Fuul 레퍼럴 클라이언트
└── privy-helpers.ts    # Privy 지갑 주소 추출 유틸
```

---

## 🔑 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_PRIVY_APP_ID=cmmvoxcix058e0ckv7uhp9ip0
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_BUILDER_CODE=noivan
```

---

## 🎬 Demo Flow

```
1. http://localhost:3000 접속
2. "Connect Wallet" → Privy Google 로그인
3. CRS 랭킹 리더보드에서 트레이더 선택
4. "Follow" 클릭 → copy_ratio / max_position 설정
5. Copy Trade Log에서 실시간 체결 확인
6. "Share" 버튼 → Fuul 레퍼럴 링크 생성
```

---

## 📦 Deploy

```bash
# Vercel (권장)
npx vercel --prod

# 또는 Docker
docker build -t copy-perp-web .
docker run -p 3000:3000 copy-perp-web
```

---

*Pacifica Hackathon 2026 | Builder Code: `noivan` | Track 3: Social & Gamification*
