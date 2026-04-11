'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TopicItem, ContentCategory } from '@/types/strategy';

const CAT_STYLES: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-red-100 text-red-700',
  D: 'bg-purple-100 text-purple-700',
  E: 'bg-gray-100 text-gray-700',
};

interface TopicTableProps {
  topics: TopicItem[];
  categories: ContentCategory[];
  onCreateContent?: (topic: TopicItem) => void;
}

export function TopicTable({ topics, categories, onCreateContent }: TopicTableProps) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return topics;
    return topics.filter((t) => t.category === filter);
  }, [topics, filter]);

  return (
    <div>
      <div className="flex gap-1.5 mb-3 flex-wrap items-center">
        <button onClick={() => setFilter('all')} className={cn('px-3 py-1 rounded-full text-xs font-semibold border', filter === 'all' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white dark:bg-card text-muted-foreground border-border')}>
          전체 {topics.length}
        </button>
        {categories.map((c) => (
          <button key={c.code} onClick={() => setFilter(c.code)} className={cn('px-3 py-1 rounded-full text-xs font-semibold border', filter === c.code ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white dark:bg-card text-muted-foreground border-border')}>
            {c.code}. {c.name}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length}개</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left p-2 text-xs font-bold text-muted-foreground w-16">No.</th>
              <th className="text-left p-2 text-xs font-bold text-muted-foreground">카테고리</th>
              <th className="text-left p-2 text-xs font-bold text-muted-foreground">주제</th>
              <th className="text-left p-2 text-xs font-bold text-muted-foreground">각도</th>
              <th className="text-left p-2 text-xs font-bold text-muted-foreground">키워드</th>
              {onCreateContent && <th className="p-2 w-20"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-2 text-xs font-bold text-muted-foreground">{t.id}</td>
                <td className="p-2"><span className={cn('px-2 py-0.5 rounded-lg text-xs font-semibold', CAT_STYLES[t.category] || 'bg-gray-100')}>{t.category}</span></td>
                <td className="p-2 font-medium">{t.title}</td>
                <td className="p-2 text-xs text-muted-foreground">{t.angle}</td>
                <td className="p-2 text-xs text-emerald-700">{t.keywords.join(', ')}</td>
                {onCreateContent && (
                  <td className="p-2">
                    <Button variant="ghost" size="sm" onClick={() => onCreateContent(t)} className="h-7 text-xs">
                      <Plus size={12} className="mr-1" />만들기
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
