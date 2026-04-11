'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';
import { TopicTable } from './topic-table';
import type { ContentStrategyData, TopicItem } from '@/types/strategy';

interface ContentTabProps {
  data: ContentStrategyData | null;
  onRegenerate?: (instruction: string) => void;
  onCreateContent?: (topic: TopicItem) => void;
}

export function ContentTab({ data, onRegenerate, onCreateContent }: ContentTabProps) {
  const [instruction, setInstruction] = useState('');

  if (!data) return <div className="text-center text-muted-foreground py-16">데이터 없음</div>;

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

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-700 mb-3">콘텐츠 카테고리</h3>
        <div className="flex gap-0 flex-wrap mb-3">
          {data.categories.map((cat, i) => (
            <div key={i} className="flex-1 min-w-[120px] p-3 bg-white dark:bg-card border border-border first:rounded-l-xl last:rounded-r-xl">
              <div className="text-xl font-black" style={{ color: ['#0F6E56','#BA7517','#993C1D','#534AB7','#444441'][i % 5] }}>{cat.code}</div>
              <div className="text-xs font-bold">{cat.name}</div>
              <div className="text-[11px] text-muted-foreground">{cat.description} · {cat.topicCount}개</div>
            </div>
          ))}
        </div>
        {data.cycleInfo && <p className="text-xs text-muted-foreground">{data.cycleInfo}</p>}
        {data.categoryRatios && <p className="text-xs text-muted-foreground">{data.categoryRatios}</p>}
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-700 mb-3">콘텐츠 주제 목록 ({data.topics.length}개)</h3>
        <TopicTable topics={data.topics} categories={data.categories} onCreateContent={onCreateContent} />
      </div>
    </div>
  );
}
