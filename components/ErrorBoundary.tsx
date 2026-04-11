'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** 에러 발생 시 표시할 섹션 이름 (디버깅용) */
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — 컴포넌트 단위 에러가 전체 앱을 죽이지 않도록 격리
 * 
 * 사용법:
 *   <ErrorBoundary name="Leaderboard">
 *     <Leaderboard />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 에러 정보를 콘솔에 기록 (프로덕션에서도 디버깅 가능)
    console.error(`[ErrorBoundary: ${this.props.name ?? 'unknown'}]`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-gray-900 border border-red-800/50 rounded-xl p-6 text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-red-400 text-sm font-medium mb-1">
            {this.props.name ? `${this.props.name} failed to load` : 'Something went wrong'}
          </p>
          <p className="text-gray-600 text-xs mb-4">
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.handleReset}
            className="text-indigo-400 text-sm hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
