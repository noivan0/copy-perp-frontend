# 배포 가이드

## 🔧 백엔드 (Render) — 원클릭
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/noivan0/copy-perp)

설정:
1. 위 버튼 클릭
2. 아래 환경변수 입력
3. Deploy 클릭

### 백엔드 환경변수 (Render)
| 변수명 | 설명 | 예시 |
|--------|------|------|
| `AGENT_PRIVATE_KEY` | 에이전트 Solana 개인키 | `4x...base58` |
| `AGENT_WALLET` | 에이전트 지갑 주소 | `AaBb...` |
| `BUILDER_CODE` | Pacifica Builder Code | `noivan` |

> ⚠️ **AGENT_PRIVATE_KEY는 절대 공개 저장소에 커밋하지 마세요.**

---

## 🌐 프론트엔드 (Vercel) — 원클릭
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/noivan0/copy-perp-web&env=NEXT_PUBLIC_PRIVY_APP_ID,NEXT_PUBLIC_API_URL,NEXT_PUBLIC_FUUL_API_KEY&envDescription=Copy+Perp+환경변수&project-name=copy-perp&repository-name=copy-perp-web)

### 프론트엔드 환경변수 (Vercel / .env.local)
| 변수명 | 필수 | 설명 | 예시 |
|--------|------|------|------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | ✅ | Privy 소셜 로그인 App ID (공개 가능) | `cmmvoxcix058e0ckv7uhp9ip0` |
| `NEXT_PUBLIC_API_URL` | ✅ | 백엔드 API URL | `https://copy-perp.onrender.com` |
| `NEXT_PUBLIC_FUUL_API_KEY` | ⬜ | Fuul 레퍼럴 API 키 (없으면 Mock 모드) | `fuul_live_...` |

> ℹ️ `NEXT_PUBLIC_` 접두사가 붙은 변수는 브라우저에 노출됩니다.
> 개인키/시크릿은 절대 `NEXT_PUBLIC_`으로 설정하지 마세요.

### 로컬 개발
```bash
cp .env.local.example .env.local
# .env.local 수정 후
npm install
npm run dev
```

---

## 🔒 보안 헤더

`next.config.ts`에 다음 헤더가 자동 적용됩니다:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 📦 빌드 확인

```bash
npm run build
# First Load JS < 200KB 권장
```

---

## 🔗 관련 링크

- Privy Dashboard: https://dashboard.privy.io
- Render: https://render.com
- Vercel: https://vercel.com
- Pacifica DEX: https://pacifica.fi
- Fuul: https://fuul.xyz
