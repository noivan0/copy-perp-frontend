/**
 * API 유틸리티 — HTTP 에러 코드별 사용자 메시지 표준화 + 전역 timeout 일관성
 */

/**
 * 전역 fetchWithTimeout — AbortController timeout 일관성 보장
 * R9 P0: 섹션마다 다른 timeout을 단일 유틸로 통일 (기본 10초)
 *
 * @param url - 요청 URL
 * @param options - fetch 옵션 (signal은 자동 생성되므로 전달 불필요)
 * @param timeoutMs - 타임아웃 (ms), 기본 10000 (10초)
 * @returns Response
 * @throws AbortError if timeout, TypeError on network error
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // 호출자가 외부 signal을 전달한 경우 두 signal 모두 처리
    const signal = options.signal
      ? anySignal([ctrl.signal, options.signal])
      : ctrl.signal;
    return await fetch(url, { ...options, signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 복수 AbortSignal 중 하나라도 abort 되면 abort되는 signal 반환
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const ctrl = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) { ctrl.abort(sig.reason); break; }
    sig.addEventListener('abort', () => ctrl.abort(sig.reason), { once: true });
  }
  return ctrl.signal;
}

/**
 * HTTP 상태 코드를 사용자 친화적 메시지로 변환
 */
export function httpErrorMessage(status: number): string {
  switch (status) {
    case 400: return 'Bad request — please check your input';
    case 401: return 'Please connect your wallet';
    case 403: return 'You are not authorized to perform this action';
    case 404: return 'Resource not found';
    case 422: return 'Invalid address format';
    case 429: return 'Too many requests, please wait';
    case 500: return 'Service temporarily unavailable';
    case 503: return 'Service temporarily unavailable';
    default:
      if (status >= 500) return 'Service temporarily unavailable';
      if (status >= 400) return `Request failed (${status})`;
      return 'Unexpected error';
  }
}

/**
 * fetch 응답에서 에러 메시지 추출 (JSON detail 우선, 없으면 HTTP 코드 기반)
 * @throws never — 항상 메시지를 반환하며 throw 하지 않음
 */
export async function extractErrorMessage(res: Response, fallback?: string): Promise<string> {
  if (res.ok) return '';
  try {
    const data = await res.clone().json();
    const detail =
      typeof data.detail === 'string'
        ? data.detail
        : data.detail?.error ?? data.error ?? (Array.isArray(data.errors) ? data.errors[0] : undefined);
    if (detail) return detail;
  } catch { /* JSON parse 실패 — HTTP 코드 기반 메시지 사용 */ }
  return fallback ?? httpErrorMessage(res.status);
}
