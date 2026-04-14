'use client'

import { useSaveStatusStore } from '@/stores/save-status-store'
import { Check, Loader2, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SaveStatusIndicatorProps {
  className?: string
}

export function SaveStatusIndicator({ className }: SaveStatusIndicatorProps) {
  const pending = useSaveStatusStore((s) => s.pending)
  const flushing = useSaveStatusStore((s) => s.flushing)
  const lastError = useSaveStatusStore((s) => s.lastError)
  const lastSavedAt = useSaveStatusStore((s) => s.lastSavedAt)

  const active = pending > 0 || flushing

  if (lastError && !active) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-destructive', className)} title={lastError}>
        <TriangleAlert size={12} />
        <span>저장 실패</span>
      </div>
    )
  }

  if (active) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <Loader2 size={12} className="animate-spin" />
        <span>저장 중{pending > 1 ? ` (${pending})` : ''}…</span>
      </div>
    )
  }

  if (lastSavedAt) {
    const rel = formatRelative(lastSavedAt)
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <Check size={12} className="text-green-500" />
        <span>저장됨{rel ? ` · ${rel}` : ''}</span>
      </div>
    )
  }

  return null
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 5_000) return '방금'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}초 전`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`
  return ''
}
