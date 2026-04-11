'use client'

import { useProjectStore } from '@/stores/project-store'
import { CompetitorsDashboard } from '@/components/competitors/competitors-dashboard'

export default function CompetitorsPage() {
  const { selectedProjectId } = useProjectStore()

  if (!selectedProjectId) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">프로젝트를 선택하세요</div>
  }

  return <CompetitorsDashboard />
}
