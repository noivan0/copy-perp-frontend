/**
 * format.ts — 통합 숫자/주소 포맷 헬퍼
 * 앱 전역에서 동일한 형식으로 숫자를 표시합니다.
 */

/** USDC / USD 금액 포맷 (+/-$1,234.56) */
export function formatUSDC(value: number, decimals = 2): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';
  return `${sign}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** USDC 금액 포맷 (부호 없음, $1,234.56) */
export function formatUSDCPlain(value: number, decimals = 2): string {
  return `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** 퍼센트 포맷 (+12.3%) */
export function formatPct(value: number, decimals = 1): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/** 퍼센트 포맷 (부호 없음, 12.3%) */
export function formatPctPlain(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** 지갑 주소 단축 표시 */
export function formatAddr(address: string, headLen = 8, tailLen = 4): string {
  if (!address || address.length <= headLen + tailLen + 1) return address;
  return `${address.slice(0, headLen)}…${address.slice(-tailLen)}`;
}

/** 정수 숫자 포맷 (소수점 없음, 1,234) */
export function formatInt(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

/** PnL 포맷 — Portfolio 등에서 사용 (+$1,234.56) */
export function formatPnl(pnl: number): string {
  return formatUSDC(pnl, 2);
}

/** 가격 포맷 (최대 4자리 소수, $1.2345) */
export function formatPrice(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`;
}

/** Win Rate 포맷 — 0~1 범위 입력 → "56.3%" */
export function formatWinRate(rate: number, decimals = 1): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}
