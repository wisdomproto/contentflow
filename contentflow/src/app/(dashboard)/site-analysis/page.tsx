'use client'

import { useProjectStore } from '@/stores/project-store'
import { SiteAnalysisDashboard } from '@/components/analytics/site-analysis-dashboard'

export default function SiteAnalysisPage() {
  const { selectedProjectId } = useProjectStore()

  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        프로젝트를 선택하세요
      </div>
    )
  }

  return <SiteAnalysisDashboard />
}
