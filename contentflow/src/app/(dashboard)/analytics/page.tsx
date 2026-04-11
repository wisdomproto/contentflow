'use client'

import { useProjectStore } from '@/stores/project-store'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

export default function AnalyticsPage() {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)

  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        프로젝트를 선택하세요
      </div>
    )
  }

  return <AnalyticsDashboard />
}
