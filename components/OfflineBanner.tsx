/* OfflineBanner — navigator.onLine 기반 오프라인 감지 */
'use client';

import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    // 초기 상태
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
      setReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      if (wasOffline) {
        setReconnected(true);
        // 재연결 시 모든 섹션 데이터 갱신 트리거
        window.dispatchEvent(new CustomEvent('network:reconnected'));
        // 3초 후 재연결 메시지 숨김
        setTimeout(() => {
          setReconnected(false);
          setWasOffline(false);
        }, 3000);
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [wasOffline]);

  if (!isOffline && !reconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium transition-all ${
        isOffline
          ? 'bg-red-600 text-white'
          : 'bg-green-600 text-white'
      }`}
      role="alert"
      aria-live="polite"
    >
      {isOffline ? (
        <>
          <span className="w-2 h-2 bg-white rounded-full opacity-80 animate-pulse" />
          No internet connection — please check your network
        </>
      ) : (
        <>
          <span>✓</span>
          Reconnected — refreshing data…
        </>
      )}
    </div>
  );
}
