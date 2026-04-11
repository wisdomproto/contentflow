'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings } from 'lucide-react';
import { useProjectStore } from '@/stores/project-store';
import { useAnalytics } from '@/hooks/use-analytics';
import { OverviewCards } from './overview-cards';
import { PageviewsChart } from './pageviews-chart';
import { TrafficChart } from './traffic-chart';
import { TopPagesTable } from './top-pages-table';
import type { GA4Config, FunnelConfig } from '@/types/analytics';

export function AnalyticsDashboard() {
  const project = useProjectStore((s) => {
    const id = s.selectedProjectId;
    return id ? s.projects.find(p => p.id === id) : undefined;
  });

  const ga4Config = (project?.ga4_config ?? null) as GA4Config | null;
  const funnelConfig = (project?.funnel_config ?? null) as FunnelConfig | null;
  const { overview, traffic, topPages, loading, error, fetchAll } = useAnalytics(ga4Config);
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');

  useEffect(() => {
    if (ga4Config?.propertyId) {
      fetchAll(period);
    }
  }, [ga4Config?.propertyId, period, fetchAll]);

  if (!ga4Config?.propertyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center">
        <Settings size={48} className="text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-bold mb-2">GA4 연동이 필요합니다</h3>
        <p className="text-sm text-muted-foreground mb-4">
          프로젝트 설정 &gt; 퍼널·분석에서 Google Analytics 4를 연결하세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight">사이트 분석</h2>
          {funnelConfig?.websiteUrl && (
            <p className="text-xs text-muted-foreground">{funnelConfig.websiteUrl}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${period === '7d' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setPeriod('7d')}
            >
              7일
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${period === '30d' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setPeriod('30d')}
            >
              30일
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchAll(period)} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {overview && (
        <>
          <OverviewCards data={overview} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PageviewsChart data={overview.dailyPageviews} />
            <TrafficChart data={traffic} />
          </div>
          <TopPagesTable data={topPages} websiteUrl={funnelConfig?.websiteUrl} />
        </>
      )}
    </div>
  );
}
