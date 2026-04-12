'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/stores/project-store'
import { createClient } from '@/lib/supabase/client'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-yellow-900/50 text-yellow-400',
  publishing: 'bg-blue-900/50 text-blue-400',
  published: 'bg-green-900/50 text-green-400',
  failed: 'bg-red-900/50 text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  draft: '임시',
  scheduled: '예약',
  publishing: '발행중',
  published: '발행됨',
  failed: '실패',
}

const FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'scheduled', label: '예약' },
  { value: 'published', label: '발행됨' },
  { value: 'failed', label: '실패' },
]

export function PublishQueue() {
  const [filter, setFilter] = useState('all')
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { selectedProjectId } = useProjectStore()

  useEffect(() => {
    if (!selectedProjectId) { setRecords([]); setLoading(false); return }
    const supabase = createClient()
    supabase.from('publish_records').select('*').eq('project_id', selectedProjectId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRecords(data || [])
        setLoading(false)
      })
  }, [selectedProjectId])

  const filteredRecords = filter === 'all' ? records : records.filter(r => r.status === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">발행 대기열</h3>
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-3 py-1 rounded-md text-xs transition-colors',
                filter === f.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">로딩중...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {filter === 'all' ? '발행 기록이 없습니다' : `${STATUS_LABELS[filter] || filter} 기록이 없습니다`}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRecords.map((record) => (
            <div key={record.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm">{record.metadata?.title || 'Untitled'}</div>
                <div className="text-xs text-muted-foreground">
                  {record.channel} · {record.language?.toUpperCase()}
                  {record.published_url && (
                    <a href={record.published_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">
                      보기 →
                    </a>
                  )}
                </div>
              </div>
              <span className={cn('px-2 py-0.5 rounded text-xs', STATUS_COLORS[record.status])}>
                {STATUS_LABELS[record.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
