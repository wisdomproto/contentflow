'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import { useProjectStore } from '@/stores/project-store';
import { buildWeeklyReportHtml } from '@/lib/weekly-report-builder';
import type { WeeklyReportData, GA4Config, ImportedStrategy } from '@/types/analytics';

interface WeeklyReportDialogProps {
  projectId: string;
  onClose: () => void;
}

export function WeeklyReportDialog({ projectId, onClose }: WeeklyReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);

  const project = useProjectStore(s => s.projects.find(p => p.id === projectId));
  const allContents = useProjectStore(s => s.contents);
  const contents = useMemo(() => allContents.filter(c => c.project_id === projectId), [allContents, projectId]);
  const blogContents = useProjectStore(s => s.blogContents);
  const instagramContents = useProjectStore(s => s.instagramContents);
  const threadsContents = useProjectStore(s => s.threadsContents);
  const youtubeContents = useProjectStore(s => s.youtubeContents);

  if (!project) return null;

  const ga4Config = (project.ga4_config ?? null) as GA4Config | null;
  const importedStrategy = (project.imported_strategy ?? null) as unknown as ImportedStrategy | null;

  const generateReport = async () => {
    setLoading(true);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const periodStart = weekAgo.toISOString().slice(0, 10);
    const periodEnd = now.toISOString().slice(0, 10);

    // GA4 데이터 가져오기
    let analyticsData: WeeklyReportData['analytics'] = undefined;
    if (ga4Config?.propertyId && ga4Config?.clientEmail && ga4Config?.privateKey) {
      try {
        const body = { ...ga4Config, period: '7d' };
        const [overviewRes, trafficRes] = await Promise.all([
          fetch('/api/analytics/overview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
          fetch('/api/analytics/traffic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        ]);
        const [overview, traffic] = await Promise.all([overviewRes.json(), trafficRes.json()]);

        if (!overview.error) {
          analyticsData = {
            sessions: overview.totalSessions,
            sessionsDelta: 0,
            users: overview.totalUsers,
            usersDelta: 0,
            pageviews: overview.totalPageviews,
            pageviewsDelta: 0,
            bounceRate: overview.bounceRate,
            topPages: [],
            trafficSources: traffic.sources ?? [],
            dailyPageviews: overview.dailyPageviews ?? [],
          };
        }
      } catch {
        // GA4 실패 시 무시
      }
    }

    // 콘텐츠 현황
    const recentWeek = contents.filter(c => {
      const created = new Date(c.created_at);
      return created >= weekAgo;
    });

    const channelCounts: Record<string, number> = {};
    const contentIds = contents.map(c => c.id);

    const blogCount = blogContents.filter(b => contentIds.includes(b.content_id)).length;
    const instaCount = instagramContents.filter(b => contentIds.includes(b.content_id)).length;
    const threadsCount = threadsContents.filter(b => contentIds.includes(b.content_id)).length;
    const ytCount = youtubeContents.filter(b => contentIds.includes(b.content_id)).length;

    if (blogCount > 0) channelCounts['블로그'] = blogCount;
    if (instaCount > 0) channelCounts['카드뉴스'] = instaCount;
    if (threadsCount > 0) channelCounts['스레드'] = threadsCount;
    if (ytCount > 0) channelCounts['유튜브'] = ytCount;

    const reportData: WeeklyReportData = {
      projectName: project.name,
      period: { start: periodStart, end: periodEnd },
      analytics: analyticsData,
      content: {
        totalCreated: recentWeek.length,
        totalPublished: recentWeek.filter(c => c.status === 'published').length,
        byChannel: Object.entries(channelCounts).map(([channel, count]) => ({ channel, count })),
        recentItems: recentWeek.slice(0, 10).map(c => ({
          title: c.title,
          channel: c.category ?? '-',
          status: c.status,
          date: c.created_at.slice(0, 10),
        })),
      },
      keywords: importedStrategy ? {
        tracked: importedStrategy.keywords.length,
        goldenKeywords: importedStrategy.keywords.filter(k => k.isGolden).map(k => k.keyword),
      } : undefined,
    };

    const html = buildWeeklyReportHtml(reportData);
    setReportHtml(html);
    setLoading(false);
  };

  const handleDownload = () => {
    if (!reportHtml) return;
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_주간보고서_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-background rounded-xl border shadow-xl w-[700px] max-h-[85vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <FileText size={16} /> 주간 보고서
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X size={16} /></Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!reportHtml ? (
            <div className="flex flex-col items-center justify-center h-[300px]">
              <p className="text-sm text-muted-foreground mb-4">
                GA4 트래픽 + 콘텐츠 현황을 분석하여 주간 보고서를 생성합니다
              </p>
              <Button onClick={generateReport} disabled={loading}>
                {loading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <FileText size={14} className="mr-1.5" />}
                {loading ? '생성 중...' : '보고서 생성'}
              </Button>
            </div>
          ) : (
            <iframe
              srcDoc={reportHtml}
              className="w-full h-[500px] border rounded-lg"
              title="주간 보고서 미리보기"
            />
          )}
        </div>

        {reportHtml && (
          <div className="p-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReportHtml(null)}>다시 생성</Button>
            <Button onClick={handleDownload}>
              <Download size={14} className="mr-1.5" /> HTML 다운로드
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
