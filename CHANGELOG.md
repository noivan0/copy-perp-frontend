# CHANGELOG — Copy Perp Web

All notable changes to this project will be documented here.
Format: `[vX.X.X] YYYY-MM-DD — Description`

---

## [v0.7.0] 2026-04-11 — Round 7: Real User Scenario Completion

### P0 — User Flow (Critical)
- **언팔로우 확인 다이얼로그** — Unfollow 버튼 클릭 시 `UnfollowConfirmDialog` 표시
  - "언팔로우하면 진행 중인 포지션이 유지됩니다" 안내 문구 포함
  - Cancel / Unfollow 버튼 명확 분리
- **Following 배지** — RankedTraders 목록에서 팔로우 중인 트레이더 시각적 표시
  - 카드 테두리 초록 하이라이트 + "✓ Following" 배지
  - localStorage 캐시 + API 실시간 동기화
  - 팔로우 성공 즉시 반영 (`followSuccess` 이벤트)
- **잔액 부족 처리** — `status='skipped_insufficient'` 전용 UI
  - CopyTradeLog: "⚠ Low Funds" 빨간 배지 + 툴팁
  - 잔액 부족 건수 집계 → 상단 경고 배너 표시
  - Portfolio 내 recentTrades 테이블에도 `skipped_insufficient` 구분

### P1 — Data Freshness
- **Last Updated 표시** — 모든 주요 섹션에 "Last updated Xs ago" 추가
  - Leaderboard, RankedTraders, CopyTradeLog, Portfolio 모두 적용
  - `useRelativeTime` 훅으로 5초 단위 갱신
- **폴링 주기 통일** — 30초 권장으로 정리
  - CopyTradeLog: 15초 → **30초** 조정
  - Leaderboard: 30초 ✓
  - Portfolio: 30초 ✓
  - RankedTraders: 60초 → **30초** 조정
  - SignalFeed: 5초 유지 (실시간 데이터)
- **오프라인 감지 배너** — `navigator.onLine` + `online`/`offline` 이벤트
  - 오프라인 시: 빨간 상단 배너 "연결 끊김"
  - 재연결 시: 초록 배너 + `network:reconnected` 이벤트 발생 (3초 후 숨김)

### P2 — Code Quality
- **useVisibleInterval 전체 적용** — Portfolio, RankedTraders에 추가 적용
  - 탭 비활성 시 폴링 중단 → 배터리/서버 부담 감소
- **버전 표시** — footer에 `v0.7.0 · 2026-04-11 · R7` 표시
- **OfflineBanner 컴포넌트 추가** — `components/OfflineBanner.tsx` 신규

---

## [v0.6.0] 2026-04-10 — Round 6: AbortController, Security Headers

- AbortController 10초 타임아웃 전 섹션 적용
- `risk_mode` API 파라미터 추가
- 보안 헤더 (`next.config.ts`)

---

## [v0.5.0] 2026-04-09 — Round 5: CopySettingsModal

- Risk Mode 선택 (Conservative / Balanced / Aggressive)
- 기대수익 시뮬레이터 (자본금 × Copy Ratio × ROI)
- `CopySettingsModal` 컴포넌트 신규

---

## [v0.4.0] 2026-04-08 — Round 4: SignalFeed, format.ts

- SignalFeed 5초 폴링 + 새 데이터 플래시 애니메이션
- `useRelativeTime` 훅 (SignalFeed "Updated Xs ago")
- `format.ts` 중앙화 (formatPct, formatPnl, formatPrice 등)
- byTrader PnL 분해 테이블

---

## [v0.3.0] 2026-04-07 — Round 3: Skeleton & Sort

- Leaderboard 스켈레톤 로딩
- 정렬 토글 (30d ROI / Score / 30d PnL)
- RankedTraders 카드 뷰

---

## [v0.2.0] 2026-04-06 — Round 2: Error Handling

- HTTP 에러 코드별 메시지 (`api.ts`)
- ErrorBoundary 컴포넌트
- Toast 알림 시스템

---

## [v0.1.0] 2026-04-05 — Initial Release

- Leaderboard, Portfolio, CopyTradeLog 기본 구조
- Privy 인증, Solana 지갑 연동
- Builder Code 팔로우/언팔로우 API 연동
