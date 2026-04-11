'use client';

import { useEffect, useState, useCallback, createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

let _counter = 0;

/**
 * ToastProvider — app/layout.tsx 에서 감싸기
 * useToast() 훅으로 어디서든 토스트 알림 표시 가능
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_counter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast 렌더링 영역 */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
              ${toast.type === 'success' ? 'bg-green-900/90 border border-green-700/60 text-green-200' :
                toast.type === 'error'   ? 'bg-red-900/90 border border-red-700/60 text-red-200' :
                                           'bg-gray-800/90 border border-gray-700/60 text-gray-200'}
            `}
          >
            <span>
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="text-current opacity-50 hover:opacity-100 transition-opacity ml-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** 어디서든 토스트를 표시할 수 있는 훅 */
export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
