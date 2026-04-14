'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/project-store'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, Clock, Eye, List, Loader2, Rocket, Trash2 } from 'lucide-react'
import { BlogPreviewDialog } from '@/components/content/blog-preview-dialog'
import { WordpressPreviewDialog } from '@/components/content/wordpress-preview-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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

const BEST_POST_TIMES: Record<string, Record<string, string>> = {
  ko: {
    instagram: '오전 7-9시, 점심 12-1시, 저녁 7-9시',
    facebook: '오전 9-10시, 오후 1-3시',
    wordpress: '오전 8-10시 (SEO 크롤링 최적)',
    naver_blog: '오전 6-8시, 저녁 9-11시',
    threads: '오전 8-9시, 저녁 8-10시',
    youtube: '금-토 오후 2-4시, 평일 저녁 6-8시',
  },
  en: {
    instagram: '화-금 오전 10시 (EST), 점심 12시',
    facebook: '수-금 오전 9시-오후 1시 (EST)',
    wordpress: 'Tue-Thu 9-11 AM (EST)',
    youtube: 'Fri-Sat 2-4 PM, Weekdays 5-7 PM (EST)',
    threads: 'Tue-Thu 10 AM - 12 PM (EST)',
  },
  ja: {
    instagram: '오전 7-8시, 점심 12시, 저녁 9-10시 (JST)',
    facebook: '평일 오전 9-11시 (JST)',
    youtube: '금-토 오후 5-7시 (JST)',
  },
  th: {
    instagram: '오전 8-9시, 저녁 7-9시 (ICT)',
    facebook: '오전 10-12시, 저녁 8-10시 (ICT)',
    youtube: '저녁 6-9시 (ICT)',
  },
  vi: {
    instagram: '오전 7-8시, 저녁 8-10시 (ICT)',
    facebook: '오전 9-11시, 저녁 7-9시 (ICT)',
    youtube: '저녁 7-9시 (ICT)',
  },
}

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
  const [previewRecord, setPreviewRecord] = useState<any>(null)
  const [previewCards, setPreviewCards] = useState<any[]>([])

  const openPreview = async (record: any) => {
    const supabase = createClient()
    const ch = record.channel
    if (ch === 'wordpress' || ch === 'naver_blog') {
      const { data: blogContents } = await supabase.from('blog_contents').select('id, title').eq('content_id', record.content_id)
      if (blogContents?.length) {
        const { data: cards } = await supabase.from('blog_cards').select('*').eq('blog_content_id', blogContents[0].id).order('sort_order')
        setPreviewCards(cards || [])
      }
    } else if (ch === 'instagram' || ch === 'facebook') {
      const igContentId = record.metadata?.igContentId
      if (igContentId) {
        const { data: cards } = await supabase.from('instagram_cards').select('*').eq('instagram_content_id', igContentId).order('sort_order')
        setPreviewCards(cards || [])
      }
    } else if (ch === 'threads') {
      const tcId = record.metadata?.threadsContentId
      if (tcId) {
        const { data: cards } = await supabase.from('threads_cards').select('*').eq('threads_content_id', tcId).order('sort_order')
        setPreviewCards(cards || [])
      }
    }
    setPreviewRecord(record)
  }

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
      // Load globalStyle from blog_content.seo_details
      const { data: bcData } = await supabase.from('blog_contents').select('seo_details').eq('id', blogContents[0].id).single()
      const gs = (bcData?.seo_details as Record<string, unknown>)?.globalStyle as Record<string, unknown> || {}
      const align = (gs.align as string) || 'left'
      const hBold = gs.headingBold !== false
      const bBold = !!gs.bodyBold
      const hFont = (gs.headingFont as string) || 'Noto Sans KR'
      const bFont = (gs.bodyFont as string) || 'Noto Sans KR'
      const hSize = (gs.headingSize as number) || 22
      const bSize = (gs.bodySize as number) || 16

      if (cards?.length) {
        const sections = cards.map((card: any) => {
          const c = card.content || {}
          const heading = c.heading ? `<h2 style="font-family:'${hFont}',sans-serif;font-size:${hSize}px;font-weight:${hBold ? 700 : 400};margin:1.5em 0 0.5em;line-height:1.3;text-align:${align};">${c.heading}</h2>` : ''
          const text = c.text ? `<div style="font-family:'${bFont}',sans-serif;font-size:${bSize}px;line-height:1.9;color:#333;word-break:keep-all;text-align:${align};${bBold ? 'font-weight:700;' : ''}">${c.text}</div>` : ''
          const img = c.url ? `<figure style="margin:1em 0;text-align:${align};"><img src="${c.url}" alt="${c.alt || ''}" style="max-width:100%;height:auto;border-radius:8px;" />${c.caption ? `<figcaption style="font-size:0.85em;color:#888;margin-top:0.3em;">${c.caption}</figcaption>` : ''}</figure>` : ''
          return `${heading}\n${img}\n${text}`
        }).join('\n\n')
        htmlBody = `<div style="max-width:720px;margin:0 auto;padding:0 16px;font-size:17px;line-height:1.8;color:#222;">${sections}</div>`
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

  const handleSchedule = async (id: string, scheduledAt: string | null) => {
    const supabase = createClient()
    await supabase.from('publish_records').update({ scheduled_at: scheduledAt }).eq('id', id)
    setRecords(prev => prev.map(r => r.id === id ? { ...r, scheduled_at: scheduledAt } : r))
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm truncate">{record.metadata?.title || 'Untitled'}</span>
                    <button onClick={() => openPreview(record)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors" title="미리보기">
                      <Eye size={12} />
                    </button>
                  </div>
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

                {/* Schedule + Actions */}
                {record.status === 'scheduled' && (() => {
                  const makeTime = (dayOffset: number, hour: number) => {
                    const d = new Date(); d.setDate(d.getDate() + dayOffset); d.setHours(hour, 0, 0, 0);
                    return d.toISOString();
                  };
                  const quickPicks = [
                    { label: '오늘 저녁 7시', time: makeTime(0, 19) },
                    { label: '내일 오전 8시', time: makeTime(1, 8) },
                    { label: '내일 저녁 7시', time: makeTime(1, 19) },
                    { label: '모레 오전 9시', time: makeTime(2, 9) },
                  ];
                  const lang = record.language || 'ko';
                  const times = BEST_POST_TIMES[lang] || BEST_POST_TIMES.ko;
                  const bestTimeText = times[record.channel];

                  return (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="relative">
                        <Clock size={12} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <input
                          type="datetime-local"
                          value={record.scheduled_at ? new Date(new Date(record.scheduled_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                          onChange={(e) => handleSchedule(record.id, e.target.value ? new Date(e.target.value).toISOString() : null)}
                          className="h-7 pl-6 pr-1 text-[10px] bg-muted border border-border rounded w-36"
                        />
                      </div>
                      <div className="relative group/quick">
                        <button className="h-7 px-1.5 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors text-[10px] gap-0.5">
                          <Clock size={10} /> ▼
                        </button>
                        <div className="absolute top-full right-0 mt-1 w-52 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg hidden group-hover/quick:block z-50">
                          <div className="p-2 space-y-0.5">
                            <div className="text-[9px] text-muted-foreground font-semibold mb-1">⚡ 빠른 예약</div>
                            {quickPicks.map(qp => (
                              <button key={qp.label} onClick={() => handleSchedule(record.id, qp.time)}
                                className="w-full text-left px-2 py-1 rounded text-[10px] hover:bg-accent transition-colors">
                                {qp.label}
                              </button>
                            ))}
                          </div>
                          {bestTimeText && (
                            <div className="border-t border-border px-2 py-1.5 text-[9px]">
                              <span className="text-muted-foreground">📊 추천:</span> <span className="text-primary">{bestTimeText}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700" disabled={publishingId === record.id} onClick={() => handlePublishNow(record)}>
                        {publishingId === record.id ? <><Loader2 size={10} className="animate-spin" /> 발행 중</> : <><Rocket size={10} /> 즉시 발행</>}
                      </Button>
                    </div>
                  );
                })()}
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
      {/* Preview dialogs */}
      {previewRecord && previewRecord.channel === 'naver_blog' && (
        <BlogPreviewDialog
          open={!!previewRecord}
          onOpenChange={(open) => { if (!open) setPreviewRecord(null) }}
          cards={previewCards}
          seoTitle={previewRecord.metadata?.title || ''}
        />
      )}
      {previewRecord && previewRecord.channel === 'wordpress' && (
        <WordpressPreviewDialog
          open={!!previewRecord}
          onOpenChange={(open) => { if (!open) setPreviewRecord(null) }}
          title={previewRecord.metadata?.title || ''}
          metaTitle={previewRecord.metadata?.title || ''}
          metaDescription=""
          cards={previewCards}
        />
      )}
      {previewRecord && (previewRecord.channel === 'instagram' || previewRecord.channel === 'facebook') && (
        <Dialog open={!!previewRecord} onOpenChange={(open) => { if (!open) setPreviewRecord(null) }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>카드뉴스 미리보기</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {previewCards.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">카드 데이터가 없습니다</p>
              ) : previewCards.map((card, i) => {
                // Parse text from text_style.textBlocks
                const ts = card.text_style as Record<string, unknown> | null;
                const blocks = ts && Array.isArray(ts.textBlocks) ? (ts.textBlocks as Array<{ id: string; text: string; hidden?: boolean }>) : [];
                const visibleTexts = blocks.filter(b => b.text?.trim() && !b.hidden);
                return (
                  <div key={card.id} className="rounded-lg border overflow-hidden" style={{ backgroundColor: (ts?.bgColor as string) || '#fff' }}>
                    {card.background_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.background_image_url} alt="" className="w-full" />
                    )}
                    {visibleTexts.length > 0 && (
                      <div className="p-3 space-y-1">
                        {visibleTexts.map(b => (
                          <p key={b.id} className="text-sm" style={{ color: (ts?.bgColor as string)?.startsWith('#f') || (ts?.bgColor as string) === '#ffffff' ? '#222' : '#eee' }}>
                            {b.text}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="px-3 pb-2 text-[10px] text-muted-foreground">카드 {i + 1}</div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {previewRecord && previewRecord.channel === 'threads' && (
        <Dialog open={!!previewRecord} onOpenChange={(open) => { if (!open) setPreviewRecord(null) }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>스레드 미리보기</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {previewCards.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">스레드 데이터가 없습니다</p>
              ) : previewCards.map((card, i) => (
                <div key={card.id} className="border-l-2 border-foreground/20 pl-3 py-1">
                  <p className="text-sm whitespace-pre-line">{card.body || ''}</p>
                  <div className="text-[10px] text-muted-foreground mt-1">스레드 {i + 1}</div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
