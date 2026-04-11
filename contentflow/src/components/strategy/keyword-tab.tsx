'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';
import { KeywordTable } from './keyword-table';
import { cn } from '@/lib/utils';
import type { KeywordData, KeywordItem } from '@/types/strategy';
import { useState } from 'react';

const COLOR_STYLES = { teal: 'border-t-emerald-600', amber: 'border-t-amber-600', coral: 'border-t-red-600', purple: 'border-t-purple-600' };

interface KeywordTabProps {
  data: KeywordData | null;
  naverKeywords: KeywordItem[];
  onRegenerate?: (instruction: string) => void;
}

export function KeywordTab({ data, naverKeywords, onRegenerate }: KeywordTabProps) {
  const [instruction, setInstruction] = useState('');

  const kw = naverKeywords || [];
  if (!data && kw.length === 0) return <div className="text-center text-muted-foreground py-16">데이터 없음</div>;

  const items = (data?.items?.length ? data.items : kw) || [];

  return (
    <div className="space-y-8">
      {onRegenerate && (
        <div className="flex gap-2">
          <Input placeholder="수정 지시" value={instruction} onChange={(e) => setInstruction(e.target.value)} className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => { onRegenerate(instruction); setInstruction(''); }}>
            <RefreshCw size={14} className="mr-1" />재생성
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-card border rounded-xl p-3"><div className="text-2xl font-black">{items.length}</div><div className="text-xs text-muted-foreground">분석 키워드</div></div>
        <div className="bg-white dark:bg-card border rounded-xl p-3"><div className="text-2xl font-black text-red-600">{items.filter((k) => k.totalSearch >= 2000).length}</div><div className="text-xs text-muted-foreground">고볼륨 2000+</div></div>
        <div className="bg-white dark:bg-card border rounded-xl p-3"><div className="text-2xl font-black text-emerald-600">{data?.goldenKeywords?.length || 0}</div><div className="text-xs text-muted-foreground">황금 키워드</div></div>
        <div className="bg-white dark:bg-card border rounded-xl p-3"><div className="text-2xl font-black">{items.length ? Math.round(items.reduce((s, k) => s + k.mobileRatio, 0) / items.length) : 0}%</div><div className="text-xs text-muted-foreground">평균 모바일 비중</div></div>
      </div>

      {data?.goldenKeywords && data.goldenKeywords.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">🥇 황금 키워드 — 지금 당장 공략 가능</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.goldenKeywords.map((gk, i) => (
              <div key={i} className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">#{gk.priority} · 월 {gk.totalSearch.toLocaleString()} · 경쟁 {gk.competition}</div>
                <div className="font-bold mb-1">{gk.keyword}</div>
                <div className="text-xs text-muted-foreground">{gk.strategy}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.insights && data.insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.insights.map((ins, i) => (
            <div key={i} className={cn('bg-white dark:bg-card border rounded-xl p-4 border-t-[3px]', COLOR_STYLES[ins.color])}>
              <div className="font-bold text-sm mb-1">{ins.title}</div>
              <div className="text-xs text-muted-foreground">{ins.description}</div>
            </div>
          ))}
        </div>
      )}

      <KeywordTable items={items} categories={data?.categories || []} />
    </div>
  );
}
