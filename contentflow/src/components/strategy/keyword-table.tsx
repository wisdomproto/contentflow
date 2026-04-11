'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { KeywordItem } from '@/types/strategy';

const COMP_STYLES = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-emerald-100 text-emerald-700' };
const COMP_LABEL = { high: '높음', medium: '중간', low: '낮음' };

interface KeywordTableProps {
  items: KeywordItem[];
  categories: string[];
}

export function KeywordTable({ items, categories }: KeywordTableProps) {
  const [filter, setFilter] = useState('all');
  const [sortKey, setSortKey] = useState<'totalSearch' | 'mobileRatio' | 'competition'>('totalSearch');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let result = items;
    if (filter === 'golden') result = result.filter((k) => k.isGolden);
    else if (filter === 'high') result = result.filter((k) => k.totalSearch >= 2000);
    else if (filter !== 'all') result = result.filter((k) => k.category === filter);

    return [...result].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === 'string' || typeof bv === 'string') return 0;
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [items, filter, sortKey, sortAsc]);

  const maxVol = items.length ? Math.max(...items.map((k) => k.totalSearch)) : 1;

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <div>
      <div className="flex gap-1.5 mb-3 flex-wrap items-center">
        {[{ id: 'all', label: '전체' }, { id: 'golden', label: '🥇 황금' }, { id: 'high', label: '🔴 2000+' }, ...categories.map((c) => ({ id: c, label: c }))].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={cn('px-3 py-1 rounded-full text-xs font-semibold border transition-colors', filter === f.id ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white dark:bg-card text-muted-foreground border-border hover:border-emerald-500')}>
            {f.label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length}개</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left p-2 text-xs font-bold text-muted-foreground">키워드</th>
              <th className="text-right p-2 text-xs font-bold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort('totalSearch')}>월 검색량 {sortKey === 'totalSearch' ? (sortAsc ? '↑' : '↓') : ''}</th>
              <th className="text-right p-2 text-xs font-bold text-muted-foreground">PC</th>
              <th className="text-right p-2 text-xs font-bold text-muted-foreground">모바일</th>
              <th className="text-right p-2 text-xs font-bold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort('mobileRatio')}>모바일%</th>
              <th className="text-left p-2 text-xs font-bold text-muted-foreground">경쟁</th>
              <th className="text-left p-2 text-xs font-bold text-muted-foreground">분류</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((k, i) => {
              const barW = Math.max(4, Math.round((k.totalSearch / maxVol) * 70));
              return (
                <tr key={i} className="border-b border-border hover:bg-muted/30">
                  <td className="p-2 font-semibold">{k.keyword}{k.isGolden ? ' 🥇' : ''}</td>
                  <td className="p-2 text-right tabular-nums">
                    <span className="inline-block h-1.5 rounded-full bg-emerald-600 align-middle mr-1" style={{ width: `${barW}px` }} />
                    {k.totalSearch.toLocaleString()}
                  </td>
                  <td className="p-2 text-right text-muted-foreground tabular-nums">{k.pcSearch.toLocaleString()}</td>
                  <td className="p-2 text-right text-muted-foreground tabular-nums">{k.mobileSearch.toLocaleString()}</td>
                  <td className="p-2 text-right text-muted-foreground tabular-nums">{k.mobileRatio}%</td>
                  <td className="p-2"><span className={cn('px-2 py-0.5 rounded-lg text-xs font-bold', COMP_STYLES[k.competition])}>{COMP_LABEL[k.competition]}</span></td>
                  <td className="p-2"><span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-muted">{k.category}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
