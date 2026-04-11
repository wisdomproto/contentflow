'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KpiActionData } from '@/types/strategy';

const PRIORITY_STYLES = {
  now: 'bg-green-100 text-green-800',
  soon: 'bg-amber-100 text-amber-800',
  mid: 'bg-purple-100 text-purple-800',
};
const PRIORITY_LABEL = { now: '즉시', soon: '단기', mid: '중기' };

interface KpiTabProps {
  data: KpiActionData | null;
  onRegenerate?: (instruction: string) => void;
}

export function KpiTab({ data, onRegenerate }: KpiTabProps) {
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
        <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-700 mb-3">채널별 KPI</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.channelKpis.map((kpi, i) => (
            <div key={i} className="bg-white dark:bg-card border rounded-xl p-4 border-t-[3px] border-t-emerald-600">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">{kpi.icon} {kpi.channel}</div>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {kpi.metrics.map((m, j) => <span key={j} className="px-2 py-0.5 bg-muted rounded-full text-[11px] font-semibold">{m}</span>)}
              </div>
              <div className="text-xs font-bold text-emerald-700">🎯 {kpi.target}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">📊 통합 KPI</div>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {data.integratedKpi.metrics.map((m, i) => <span key={i} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full text-[11px] font-semibold">{m}</span>)}
        </div>
        {data.integratedKpi.warning && <div className="text-xs text-red-700 dark:text-red-400 font-bold">⚠️ {data.integratedKpi.warning}</div>}
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-700 mb-3">우선순위 액션플랜</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-emerald-700 text-white">
                <th className="text-left p-2 text-xs font-bold">순위</th>
                <th className="text-left p-2 text-xs font-bold">액션</th>
                <th className="text-left p-2 text-xs font-bold">타임라인</th>
                <th className="text-left p-2 text-xs font-bold">비용/월</th>
                <th className="text-left p-2 text-xs font-bold">담당</th>
              </tr>
            </thead>
            <tbody>
              {data.actions.map((a, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/30">
                  <td className="p-2"><span className={cn('px-2 py-0.5 rounded-lg text-xs font-bold', PRIORITY_STYLES[a.priority])}>{PRIORITY_LABEL[a.priority]}</span></td>
                  <td className="p-2">
                    <div className="font-bold text-sm">{a.action}</div>
                    {a.description && <div className="text-xs text-muted-foreground">{a.description}</div>}
                  </td>
                  <td className="p-2 text-sm">{a.timeline}</td>
                  <td className="p-2 text-sm">{a.cost}</td>
                  <td className="p-2 text-sm">{a.assignee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data.budgetSummary && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-800 dark:text-emerald-200">
          <strong>예산 배분 요약:</strong> {data.budgetSummary}
        </div>
      )}
    </div>
  );
}
