'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/project-store'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, List, Loader2, Rocket, Trash2 } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-yellow-500/10 text-yellow-500',
  publishing: 'bg-blue-500/10 text-blue-500',
  published: 'bg-green-500/10 text-green-500',
  failed: 'bg-red-500/10 text-red-500',
}

const STATUS_LABELS: Record<string, string> = {
  draft: '임시',
  scheduled: '예약',
  publishing: '발행중',
  published: '발행됨',
  failed: '실패',
}

const CHANNEL_FILTERS = [
  { id: 'all', label: '전체', icon: '📋' },
  { id: 'wordpress', label: 'WP', icon: 'W' },
  { id: 'instagram', label: 'IG', icon: '📸' },
  { id: 'facebook', label: 'FB', icon: '👤' },
  { id: 'threads', label: 'TH', icon: '💬' },
  { id: 'youtube', label: 'YT', icon: '🎬' },
  { id: 'naver_blog', label: 'N', icon: '📗' },
]

const LANG_FLAGS: Record<string, string> = {
  ko: '🇰🇷', en: '🇺🇸', th: '🇹🇭', vi: '🇻🇳', ja: '🇯🇵', zh: '🇨🇳',
}

const STATUS_FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'scheduled', label: '예약' },
  { value: 'published', label: '발행됨' },
  { value: 'failed', label: '실패' },
]

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export function PublishQueue() {
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [statusFilter, setStatusFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')
  const [langFilter, setLangFilter] = useState('all')
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { selectedProjectId, projects } = useProjectStore()
  const project = projects.find(p => p.id === selectedProjectId)
  const targetLanguages = project?.target_languages || ['ko']

  // Calendar state
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1)

  const [publishingId, setPublishingId] = useState<string | null>(null)

  const loadRecords = () => {
    if (!selectedProjectId) { setRecords([]); setLoading(false); return }
    const supabase = createClient()
    supabase.from('publish_records').select('*').eq('project_id', selectedProjectId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setRecords(data || []); setLoading(false) })
  }

  useEffect(() => { loadRecords() }, [selectedProjectId])

  const handlePublishNow = async (record: any) => {
    if (record.channel !== 'wordpress') { alert('현재 WordPress 발행만 지원합니다.'); return }
    const credsRaw = localStorage.getItem(`wp_credentials_${selectedProjectId}`)
    if (!credsRaw) { alert('WordPress 연결 설정을 먼저 해주세요.'); return }
    const creds = JSON.parse(credsRaw)

    // Get blog cards for this content
    const supabase = createClient()
    const { data: blogContents } = await supabase.from('blog_contents').select('id').eq('content_id', record.content_id)
    let htmlBody = record.metadata?.content || ''
    if (blogContents?.length) {
      const { data: cards } = await supabase.from('blog_cards').select('*').eq('blog_content_id', blogContents[0].id).order('sort_order')
      if (cards?.length) {
        htmlBody = cards.map((card: any) => {
          const c = card.content || {}
          const heading = c.heading ? `<h2>${c.heading}</h2>` : ''
          const text = c.text || ''
          const img = c.url ? `<img src="${c.url}" alt="${c.alt || ''}" />` : ''
          return `${heading}\n${img}\n${text}`
        }).join('\n\n')
      }
    }

    setPublishingId(record.id)
    try {
      const res = await fetch('/api/publish/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'publish',
          title: record.metadata?.title || 'Untitled',
          content: htmlBody,
          siteUrl: creds.siteUrl,
          username: creds.username,
          applicationPassword: creds.appPassword,
          projectId: selectedProjectId,
          contentId: record.content_id,
          recordId: record.id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`발행 완료! ${data.url}`)
        loadRecords()
      } else {
        alert(`발행 실패: ${data.error}`)
      }
    } catch (err) { alert(`오류: ${err}`) }
    finally { setPublishingId(null) }
  }

  const handleDeleteRecord = async (id: string) => {
    const supabase = createClient()
    await supabase.from('publish_records').delete().eq('id', id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const filteredRecords = records.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (channelFilter !== 'all' && r.channel !== channelFilter) return false
    if (langFilter !== 'all' && r.language !== langFilter) return false
    return true
  })

  // Calendar helpers
  function getCalendarRecords(year: number, month: number) {
    return filteredRecords.filter(r => {
      const date = r.published_at || r.scheduled_at || r.created_at
      if (!date) return false
      const d = new Date(date)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
  }

  function getRecordsForDay(day: number) {
    return getCalendarRecords(calYear, calMonth).filter(r => {
      const date = r.published_at || r.scheduled_at || r.created_at
      return new Date(date).getDate() === day
    })
  }

  const firstDay = new Date(calYear, calMonth - 1, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth, 0).getDate()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === calYear && today.getMonth() + 1 === calMonth

  const calendarCells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)
  while (calendarCells.length % 7 !== 0) calendarCells.push(null)

  return (
    <div className="space-y-4">
      {/* Header: View toggle + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View toggle */}
        <div className="flex bg-muted rounded-md overflow-hidden">
          <button onClick={() => setView('list')}
            className={cn('px-3 py-1.5 text-xs flex items-center gap-1', view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            <List size={12} /> 리스트
          </button>
          <button onClick={() => setView('calendar')}
            className={cn('px-3 py-1.5 text-xs flex items-center gap-1', view === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            <CalendarDays size={12} /> 캘린더
          </button>
        </div>

        {/* Channel filter */}
        <div className="flex gap-1">
          {CHANNEL_FILTERS.map(ch => (
            <button key={ch.id} onClick={() => setChannelFilter(ch.id)}
              className={cn('px-2 py-1 rounded text-[10px]', channelFilter === ch.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>
              {ch.icon} {ch.label}
            </button>
          ))}
        </div>

        {/* Language filter */}
        <select value={langFilter} onChange={e => setLangFilter(e.target.value)}
          className="bg-muted text-xs rounded-md px-2 py-1.5 border border-border">
          <option value="all">🌐 전체</option>
          {targetLanguages.map((lang: string) => (
            <option key={lang} value={lang}>{LANG_FLAGS[lang] || '🌐'} {lang.toUpperCase()}</option>
          ))}
        </select>

        {/* Status filter */}
        <div className="flex gap-1 ml-auto">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={cn('px-2 py-1 rounded text-[10px]', statusFilter === f.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">로딩중...</div>
      ) : view === 'list' ? (
        /* List View */
        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              발행 기록이 없습니다
            </div>
          ) : (
            filteredRecords.map(record => (
              <div key={record.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                {/* Channel icon */}
                <div className={cn('w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0',
                  record.channel === 'wordpress' ? 'bg-[#21759b]' :
                  record.channel === 'instagram' ? 'bg-gradient-to-br from-[#f09433] to-[#dc2743]' :
                  record.channel === 'facebook' ? 'bg-[#1877f2]' :
                  record.channel === 'youtube' ? 'bg-[#ff0000]' :
                  record.channel === 'threads' ? 'bg-foreground' :
                  'bg-[#03c75a]'
                )}>
                  {record.channel === 'wordpress' ? 'W' : record.channel === 'instagram' ? 'IG' : record.channel === 'facebook' ? 'FB' : record.channel === 'youtube' ? 'YT' : record.channel === 'threads' ? 'T' : 'N'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{record.metadata?.title || 'Untitled'}</div>
                  <div className="text-xs text-muted-foreground">
                    {LANG_FLAGS[record.language] || '🌐'} {record.language?.toUpperCase()}
                    {record.published_at && (
                      <span className="ml-2">
                        · {new Date(record.published_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 발행
                      </span>
                    )}
                    {record.scheduled_at && record.status === 'scheduled' && (
                      <span className="ml-2 text-yellow-500">
                        · {new Date(record.scheduled_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 예약
                      </span>
                    )}
                    {record.published_url && (
                      <a href={record.published_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">보기 →</a>
                    )}
                  </div>
                </div>

                <span className={cn('px-2 py-0.5 rounded text-xs shrink-0', STATUS_COLORS[record.status])}>
                  {STATUS_LABELS[record.status] || record.status}
                </span>

                {/* Actions */}
                {record.status === 'scheduled' && (
                  <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 shrink-0" disabled={publishingId === record.id} onClick={() => handlePublishNow(record)}>
                    {publishingId === record.id ? <><Loader2 size={10} className="animate-spin" /> 발행 중</> : <><Rocket size={10} /> 발행</>}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteRecord(record.id)}>
                  <Trash2 size={12} />
                </Button>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Calendar View */
        <div>
          {/* Calendar header */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); } else setCalMonth(m => m - 1); }}
              className="text-muted-foreground hover:text-foreground px-2">←</button>
            <span className="text-sm font-semibold">{calYear}년 {calMonth}월</span>
            <button onClick={() => { if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); } else setCalMonth(m => m + 1); }}
              className="text-muted-foreground hover:text-foreground px-2">→</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-px">
            {DAY_LABELS.map((label, i) => (
              <div key={label} className={cn('text-center text-xs py-1.5', i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-muted-foreground')}>
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px max-h-[55vh] overflow-y-auto">
            {calendarCells.map((day, i) => (
              <div key={i} className={cn('bg-card border border-border rounded min-h-[80px] p-1.5',
                day && isCurrentMonth && day === today.getDate() ? 'ring-1 ring-primary' : '')}>
                {day && (
                  <>
                    <div className={cn('text-[10px] mb-0.5', i % 7 === 0 ? 'text-red-400' : i % 7 === 6 ? 'text-blue-400' : 'text-muted-foreground')}>
                      {day}
                    </div>
                    {getRecordsForDay(day).map(r => (
                      <div key={r.id} className={cn('rounded px-1 py-0.5 mb-0.5 text-[9px] text-white truncate cursor-pointer',
                        r.channel === 'wordpress' ? 'bg-[#21759b]' :
                        r.channel === 'instagram' ? 'bg-[#c13584]' :
                        r.channel === 'facebook' ? 'bg-[#1877f2]' :
                        r.channel === 'youtube' ? 'bg-[#ff0000]' :
                        'bg-muted-foreground'
                      )} title={r.metadata?.title}>
                        {LANG_FLAGS[r.language] || ''} {r.metadata?.title?.substring(0, 15) || 'Untitled'}
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
