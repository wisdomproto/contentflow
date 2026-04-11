'use client';

import { useProjectStore } from '@/stores/project-store';
import { ContentTabs } from '@/components/content/content-tabs';
import { ProjectSettings } from '@/components/project/project-settings';
import { StrategyDashboard } from '@/components/strategy/strategy-dashboard';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
import { FolderOpen } from 'lucide-react';

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4">
        <FolderOpen size={64} className="mx-auto text-muted-foreground/50" />
        <h2 className="text-xl font-semibold text-muted-foreground">
          컨텐츠를 선택하세요
        </h2>
        <p className="text-sm text-muted-foreground/70">
          왼쪽 사이드바에서 프로젝트를 펼치고 컨텐츠를 클릭하면<br />
          여기에 편집 화면이 표시됩니다.
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  // Subscribe to each value individually for proper reactivity
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const selectedContentId = useProjectStore((s) => s.selectedContentId);
  const showProjectSettings = useProjectStore((s) => s.showProjectSettings);
  const showStrategy = useProjectStore((s) => s.showStrategy);
  const showAnalytics = useProjectStore((s) => s.showAnalytics);
  const projects = useProjectStore((s) => s.projects);

  if (!selectedProjectId) {
    return <EmptyState />;
  }

  // Show strategy dashboard
  if (showStrategy) {
    return <StrategyDashboard />;
  }

  // Show analytics dashboard
  if (showAnalytics) {
    return <AnalyticsDashboard />;
  }

  // Show project settings when explicitly requested or no content selected
  if (showProjectSettings || !selectedContentId) {
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return <EmptyState />;
    return <ProjectSettings project={project} />;
  }

  return <ContentTabs />;
}
