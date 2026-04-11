'use client';
/**
 * HeroCTA — Hero 섹션 CTA 버튼
 * 앵커 스크롤을 클라이언트에서 처리 (서버 컴포넌트에서 href="#..." 동작 불안정 문제 해결)
 */

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function HeroCTA() {
  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      <button
        onClick={() => scrollTo('crs-leaderboard')}
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm shadow-lg shadow-indigo-500/20"
      >
        🚀 Start Copy Trading
      </button>
      <button
        onClick={() => scrollTo('full-leaderboard')}
        className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-gray-200 font-semibold px-6 py-3 rounded-xl transition-colors text-sm border border-gray-700"
      >
        📊 View All Traders
      </button>
    </div>
  );
}
