/**
 * 탭 활성화 시에만 실행되는 setInterval
 * Page Visibility API 활용 — 백그라운드 탭에서 불필요한 API 호출 방지
 */
'use client';
import { useEffect, useRef } from 'react';

export function useVisibleInterval(callback: () => void, ms: number) {
  const savedCallback = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const start = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => savedCallback.current(), ms);
    };
    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) stop();
      else { savedCallback.current(); start(); }  // 탭 복귀 시 즉시 갱신
    };

    start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [ms]);
}
