'use client';

import { useState, useCallback } from 'react';
import type { GA4Config, GA4OverviewData, GA4TrafficSource, GA4TopPage } from '@/types/analytics';

interface AnalyticsState {
  overview: GA4OverviewData | null;
  traffic: GA4TrafficSource[];
  topPages: GA4TopPage[];
  loading: boolean;
  error: string | null;
}

export function useAnalytics(ga4Config: GA4Config | null) {
  const [state, setState] = useState<AnalyticsState>({
    overview: null,
    traffic: [],
    topPages: [],
    loading: false,
    error: null,
  });

  const fetchAll = useCallback(async (period: '7d' | '30d' = '7d') => {
    if (!ga4Config?.propertyId || !ga4Config?.clientEmail || !ga4Config?.privateKey) {
      setState(s => ({ ...s, error: 'GA4 설정이 필요합니다. 프로젝트 설정 > 퍼널·분석에서 설정하세요.' }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    const body = { ...ga4Config, period };

    try {
      const [overviewRes, trafficRes, pagesRes] = await Promise.all([
        fetch('/api/analytics/overview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        fetch('/api/analytics/traffic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        fetch('/api/analytics/top-pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      ]);

      const [overview, traffic, pages] = await Promise.all([
        overviewRes.json(),
        trafficRes.json(),
        pagesRes.json(),
      ]);

      if (overview.error) throw new Error(overview.error);

      setState({
        overview,
        traffic: traffic.sources ?? [],
        topPages: pages.pages ?? [],
        loading: false,
        error: null,
      });
    } catch (err) {
      setState(s => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'GA4 데이터 로드 실패',
      }));
    }
  }, [ga4Config]);

  return { ...state, fetchAll };
}
