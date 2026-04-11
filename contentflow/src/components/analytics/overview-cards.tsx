'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Users, Eye, MousePointerClick, Timer } from 'lucide-react';
import type { GA4OverviewData } from '@/types/analytics';

interface OverviewCardsProps {
  data: GA4OverviewData;
}

export function OverviewCards({ data }: OverviewCardsProps) {
  const cards = [
    { label: '세션', value: data.totalSessions.toLocaleString(), icon: MousePointerClick, color: 'text-blue-600' },
    { label: '사용자', value: data.totalUsers.toLocaleString(), icon: Users, color: 'text-emerald-600' },
    { label: '페이지뷰', value: data.totalPageviews.toLocaleString(), icon: Eye, color: 'text-purple-600' },
    { label: '이탈률', value: `${(data.bounceRate * 100).toFixed(1)}%`, icon: Timer, color: 'text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <c.icon size={14} className={c.color} /> {c.label}
            </div>
            <div className="text-2xl font-black tracking-tight">{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
