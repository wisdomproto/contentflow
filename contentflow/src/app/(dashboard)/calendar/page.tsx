'use client'

import { useProjectStore } from '@/stores/project-store'
import { CalendarView } from '@/components/calendar/calendar-view'

export default function CalendarPage() {
  const { selectedProjectId } = useProjectStore()

  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        프로젝트를 선택하세요
      </div>
    )
  }

  return <CalendarView />
}
