'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OverviewData } from '@/types/strategy';
import { useState } from 'react';

const SEVERITY_STYLES = {
  critical: { icon: '🔴', border: 'border-l-red-500' },
  warning: { icon: '🟡', border: 'border-l-amber-500' },
  opportunity: { icon: '🟢', border: 'border-l-emerald-500' },
};
const COLOR_STYLES = {
  teal: 'border-t-emerald-600 text-emerald-700',
  amber: 'border-t-amber-600 text-amber-700',
  coral: 'border-t-red-600 text-red-700',
  purple: 'border-t-purple-600 text-purple-700',
};

interface OverviewTabProps {
  data: OverviewData | null;
  onRegenerate?: (instruction: string) => void;
}

export function OverviewTab({ data, onRegenerate }: OverviewTabProps) {
  const [instruction, setInstruction] = useState('');

  if (!data) return <div className="text-center text-muted-foreground py-16">데이터 없음 — 전략을 생성해주세요.</div>;

  return (
    <div className="space-y-8">
      {onRegenerate && (
        <div className="flex gap-2">
          <Input placeholder="수정 지시 (예: 경쟁사 추가해줘)" value={instruction} onChange={(e) => setInstruction(e.target.value)} className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => { onRegenerate(instruction); setInstruction(''); }}>
            <RefreshCw size={14} className="mr-1" />재생성
          </Button>
        </div>
      )}

      <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-700 mb-3">핵심 차별화</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.differentiators.map((d, i) => (
            <div key={i} className={cn('bg-white dark:bg-card border rounded-xl p-4 border-t-[3px]', COLOR_STYLES[d.color])}>
              <div className="text-xs font-bold uppercase tracking-wider mb-1">{d.label}</div>
              <div className="font-bold text-sm mb-1">{d.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{d.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-red-700 mb-3">현재 문제점 & 기회</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.issues.map((issue, i) => (
            <div key={i} className={cn('bg-white dark:bg-card border rounded-xl p-4 border-l-4', SEVERITY_STYLES[issue.severity].border)}>
              <div className="text-lg mb-1">{SEVERITY_STYLES[issue.severity].icon}</div>
              <div className="font-bold text-sm mb-1">{issue.title}</div>
              <div className="text-xs text-muted-foreground">{issue.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-700 mb-3">경쟁사 분석</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.competitors.map((c, i) => (
            <div key={i} className="bg-white dark:bg-card border rounded-xl p-4 border-l-4 border-l-amber-500">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">{c.type}</div>
              <div className="font-bold text-sm mb-2">{c.name}</div>
              <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                <div><strong>강점:</strong> {c.strengths}</div>
                <div><strong>약점:</strong> {c.weaknesses}</div>
                <div><strong>전략:</strong> {c.strategy}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-800 dark:text-emerald-200">
        <strong>차별화 포지셔닝:</strong> {data.positioning}
      </div>
    </div>
  );
}
