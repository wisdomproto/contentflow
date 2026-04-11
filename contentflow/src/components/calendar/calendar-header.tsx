'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarHeaderProps {
  year: number
  month: number
  view: 'month' | 'week'
  onPrev: () => void
  onNext: () => void
  onViewChange: (view: 'month' | 'week') => void
}

export function CalendarHeader({ year, month, view, onPrev, onNext, onViewChange }: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-base font-semibold">{year}년 {month}월</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onViewChange('month')}
          className={`px-3 py-1 rounded-md text-xs ${view === 'month' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          월간
        </button>
        <button
          onClick={() => onViewChange('week')}
          className={`px-3 py-1 rounded-md text-xs ${view === 'week' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          주간
        </button>
      </div>
    </div>
  )
}
