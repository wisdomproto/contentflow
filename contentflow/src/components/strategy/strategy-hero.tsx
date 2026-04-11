'use client';

import type { HeroStat } from '@/types/strategy';

interface StrategyHeroProps {
  projectName: string;
  stats: HeroStat[];
}

export function StrategyHero({ projectName, stats }: StrategyHeroProps) {
  return (
    <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 px-8 py-10 text-white">
      <div className="max-w-5xl mx-auto">
        <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 px-3 py-1 rounded-full text-xs font-medium mb-3">
          📋 통합 마케팅 전략
        </span>
        <h1 className="text-3xl font-black tracking-tight mb-2">{projectName}<br/>통합 마케팅 전략 대시보드</h1>
        <p className="text-sm text-white/70 max-w-xl mb-6">
          키워드 데이터 + 채널 전략 + 콘텐츠 자동화(ContentFlow) 를 하나로 연결하는 마케팅 로드맵
        </p>
        {stats.length > 0 && (
          <div className="flex gap-7 flex-wrap">
            {stats.map((s, i) => (
              <div key={i}>
                <div className="text-2xl font-black tracking-tight">{s.value}</div>
                <div className="text-xs text-white/55 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
