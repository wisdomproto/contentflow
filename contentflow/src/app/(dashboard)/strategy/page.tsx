'use client'

import { useProjectStore } from '@/stores/project-store'
import { StrategyDashboard } from '@/components/strategy/strategy-dashboard'

export default function StrategyPage() {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)

  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        프로젝트를 선택하세요
      </div>
    )
  }

  return <StrategyDashboard />
}
