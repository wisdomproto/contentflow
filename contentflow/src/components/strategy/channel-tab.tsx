'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';
import type { ChannelStrategyData } from '@/types/strategy';

interface ChannelTabProps {
  data: ChannelStrategyData | null;
  onRegenerate?: (instruction: string) => void;
}

export function ChannelTab({ data, onRegenerate }: ChannelTabProps) {
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
        <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-700 mb-3">유입 퍼널</h3>
        <div className="flex gap-0 flex-wrap">
          {data.funnel.map((step, i) => (
            <div key={i} className="flex-1 min-w-[120px] p-3 text-center bg-white dark:bg-card border border-border relative first:rounded-l-xl last:rounded-r-xl">
              <div className="text-xl mb-1">{step.icon}</div>
              <div className="text-xs font-bold">{step.title}</div>
              <div className="text-[11px] text-muted-foreground">{step.description}</div>
              {i < data.funnel.length - 1 && <span className="absolute right-[-10px] top-1/2 -translate-y-1/2 z-10 text-emerald-600 font-black">→</span>}
            </div>
          ))}
        </div>
        {data.funnelActions && <p className="text-xs text-muted-foreground mt-2">{data.funnelActions}</p>}
      </div>

      {data.homepageOptimization && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-200">
          <strong>홈페이지 최적화:</strong> {data.homepageOptimization}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-700 mb-3">채널별 전략</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.channels.map((ch, i) => (
            <div key={i} className="bg-white dark:bg-card border rounded-xl p-4 border-l-4 border-l-emerald-500">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">{ch.icon} {ch.channel} · {ch.frequency}</div>
              <div className="font-bold text-sm mb-2">{ch.bestTime}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{ch.strategy}</div>
              {ch.keywords.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {ch.keywords.map((kw, j) => <span key={j} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded text-[11px] font-semibold">{kw}</span>)}
                </div>
              )}
              {ch.adBudget && <div className="text-xs text-amber-700 mt-2">💰 {ch.adBudget}</div>}
            </div>
          ))}
        </div>
      </div>

      {data.schedule.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">주간 발행 스케줄</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/50">
                  <th className="text-left p-2 text-xs font-bold">채널</th>
                  {['월','화','수','목','금','토'].map((d) => <th key={d} className="text-center p-2 text-xs font-bold">{d}</th>)}
                  <th className="text-center p-2 text-xs font-bold">주 횟수</th>
                  <th className="text-center p-2 text-xs font-bold">시간</th>
                </tr>
              </thead>
              <tbody>
                {data.schedule.map((row, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-2 font-bold text-sm">{row.channel}</td>
                    {['월','화','수','목','금','토'].map((d) => (
                      <td key={d} className="p-2 text-center text-xs">
                        {row.days[d] && row.days[d] !== '—'
                          ? <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full text-[11px] font-semibold">{row.days[d]}</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    ))}
                    <td className="p-2 text-center font-black text-emerald-700">{row.weeklyCount}</td>
                    <td className="p-2 text-center text-xs text-muted-foreground">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.roles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.roles.map((r, i) => (
            <div key={i} className="bg-white dark:bg-card border rounded-xl p-4 text-center border-t-[3px] border-t-amber-500">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700">{r.role}</div>
              <div className="font-bold text-sm my-1">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.tasks}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
