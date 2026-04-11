'use client'

import { CalendarEventCard } from './calendar-event-card'

interface CalendarMonthProps {
  year: number
  month: number
  events: Array<{ id: string; channel: string; language: string; title: string; status: string; date: string }>
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export function CalendarMonth({ year, month, events }: CalendarMonthProps) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  function getEventsForDay(day: number) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date.startsWith(dateStr))
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-px mb-px">
        {DAY_LABELS.map((label, i) => (
          <div key={label} className={`text-center text-xs py-1.5 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-muted-foreground'}`}>
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`bg-card border border-border rounded min-h-[100px] p-1.5 ${
              day && isCurrentMonth && day === today.getDate() ? 'ring-1 ring-primary' : ''
            }`}
          >
            {day && (
              <>
                <div className={`text-xs mb-1 ${i % 7 === 0 ? 'text-red-400' : i % 7 === 6 ? 'text-blue-400' : 'text-muted-foreground'}`}>
                  {day}
                  {isCurrentMonth && day === today.getDate() && <span className="ml-1 text-primary text-[10px]">오늘</span>}
                </div>
                {getEventsForDay(day).map(event => (
                  <CalendarEventCard key={event.id} {...event} />
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
