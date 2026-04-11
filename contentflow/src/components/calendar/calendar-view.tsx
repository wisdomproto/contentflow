'use client'

import { useState } from 'react'
import { CalendarHeader } from './calendar-header'
import { CalendarMonth } from './calendar-month'

export function CalendarView() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [view, setView] = useState<'month' | 'week'>('month')

  // TODO: fetch events from /api/calendar/events
  const events: any[] = []

  function handlePrev() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function handleNext() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="p-6 max-w-5xl">
      <CalendarHeader
        year={year}
        month={month}
        view={view}
        onPrev={handlePrev}
        onNext={handleNext}
        onViewChange={setView}
      />
      {view === 'month' && (
        <CalendarMonth year={year} month={month} events={events} />
      )}
      {view === 'week' && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          주간 뷰는 Phase 2 후반에 구현 예정
        </div>
      )}
    </div>
  )
}
