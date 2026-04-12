'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PLATFORMS = [
  { id: 'all', label: '전체' },
  { id: 'instagram', label: 'IG 인스타', icon: '📸' },
  { id: 'youtube', label: '유튜브', icon: '🎬' },
  { id: 'naver_jisikin', label: '지식인', icon: '📗' },
  { id: 'naver_blog', label: '블로그', icon: '📰' },
]

const PLATFORM_ICONS: Record<string, string> = {
  youtube: '🎬',
  naver_jisikin: '📗',
  naver_blog: '📰',
  instagram: '📸',
}

interface FeedItem {
  id: string
  platform: string
  author: string
  title: string
  snippet: string
  time?: string
  language: string
  url?: string
  thumbnail?: string
  publishedAt?: string
  views?: string
  engagement?: { likes: number; comments: number }
}

export function MonitoringDashboard() {
  const [platform, setPlatform] = useState('all')
  const [keywords, setKeywords] = useState<string[]>(['소아성장', '성장호르몬'])
  const [newKeyword, setNewKeyword] = useState('')
  const [commentLoading, setCommentLoading] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [searching, setSearching] = useState(false)

  function addKeyword() {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()])
      setNewKeyword('')
    }
  }

  async function handleSearch() {
    if (keywords.length === 0) return
    setSearching(true)
    const allItems: FeedItem[] = []

    for (const keyword of keywords) {
      // YouTube search
      try {
        const ytRes = await fetch('/api/monitoring/search/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword, language: 'ko' }),
        })
        const ytData = await ytRes.json()
        allItems.push(...(ytData.items || []))
      } catch {}

      // Naver 지식인 search (Korean only)
      try {
        const nvRes = await fetch('/api/monitoring/search/naver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword }),
        })
        const nvData = await nvRes.json()
        allItems.push(...(nvData.items || []))
      } catch {}
    }

    setFeedItems(allItems)
    setSearching(false)
  }

  async function generateComment(item: FeedItem) {
    setCommentLoading(item.id)
    try {
      const res = await fetch('/api/monitoring/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentText: item.snippet || item.title,
          platform: item.platform,
          tone: 'professional',
          language: item.language,
        }),
      })
      const data = await res.json()
      setComments(prev => ({ ...prev, [item.id]: data.comment }))
    } catch {}
    finally { setCommentLoading(null) }
  }

  function copyComment(id: string) {
    navigator.clipboard.writeText(comments[id] || '')
  }

  const filteredFeed =
    platform === 'all' ? feedItems : feedItems.filter(item => item.platform === platform)

  function formatPublished(val?: string) {
    if (!val) return ''
    // ISO date → relative or raw
    try {
      const d = new Date(val)
      if (!isNaN(d.getTime())) {
        const diff = Date.now() - d.getTime()
        const days = Math.floor(diff / 86400000)
        if (days === 0) return '오늘'
        if (days === 1) return '어제'
        if (days < 30) return `${days}일 전`
        return d.toLocaleDateString('ko-KR')
      }
    } catch {}
    return val
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Platform Tabs with counts */}
      <div className="flex items-center gap-1 border-b border-border">
        {PLATFORMS.map(p => {
          const count = p.id === 'all' ? feedItems.length : feedItems.filter(f => f.platform === p.id).length
          return (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={cn(
                'px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
                platform === p.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {p.icon && <span className="mr-1">{p.icon}</span>}
              {p.label}
              {count > 0 && <span className="ml-1.5 bg-muted px-1.5 py-0.5 rounded-full text-[10px]">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Keywords + Search */}
      <div className="flex gap-2 flex-wrap items-center">
        {keywords.map(kw => (
          <span
            key={kw}
            className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs cursor-pointer hover:bg-primary/20"
            onClick={() => setKeywords(keywords.filter(k => k !== kw))}
          >
            {kw} ×
          </span>
        ))}
        <div className="flex gap-1">
          <Input
            placeholder="키워드 추가"
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
            className="h-7 w-32 text-xs"
          />
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addKeyword}>
            +
          </Button>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs ml-2"
          onClick={handleSearch}
          disabled={searching || keywords.length === 0}
        >
          {searching ? '검색 중...' : '🔍 검색'}
        </Button>
      </div>

      {/* Feed */}
      {filteredFeed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-4">💬</p>
          <p className="text-sm">
            {feedItems.length === 0
              ? '키워드를 설정하고 검색 버튼을 눌러 콘텐츠를 불러오세요'
              : `${platform} 플랫폼에 검색 결과가 없습니다`}
          </p>
          <p className="text-xs mt-2 text-muted-foreground/60">
            YouTube · 네이버 지식인에서 실시간 검색합니다
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {filteredFeed.map((item, idx) => (
            <div key={`${item.platform}-${item.id}-${idx}`} className="bg-card border border-border rounded-lg p-4">
              {/* Header */}
              <div className="flex items-start gap-2 mb-2">
                <span className="text-base leading-none mt-0.5">
                  {PLATFORM_ICONS[item.platform] || '🌐'}
                </span>
                <div className="flex-1 min-w-0">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold hover:underline line-clamp-2"
                    >
                      {item.title}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold line-clamp-2">{item.title}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.author && (
                      <span className="text-xs text-muted-foreground">{item.author}</span>
                    )}
                    {item.publishedAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatPublished(item.publishedAt)}
                      </span>
                    )}
                    {item.views && (
                      <span className="text-xs text-muted-foreground">👁️ {item.views}</span>
                    )}
                    {item.engagement && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span>❤️ {item.engagement.likes.toLocaleString()}</span>
                        <span>💬 {item.engagement.comments.toLocaleString()}</span>
                      </span>
                    )}
                  </div>
                </div>
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className={cn(
                      'object-cover rounded flex-shrink-0',
                      item.platform === 'youtube' ? 'w-28 h-16' : 'w-16 h-16'
                    )}
                  />
                )}
              </div>

              {/* Snippet */}
              {item.snippet && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{item.snippet}</p>
              )}

              {/* Comment section */}
              {comments[item.id] ? (
                <div className="bg-muted rounded-md p-3 border-l-2 border-primary">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-purple-400 font-semibold">✨ AI 댓글 제안</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 text-[10px] ml-auto"
                      onClick={() => generateComment(item)}
                    >
                      재생성
                    </Button>
                  </div>
                  <p className="text-sm mb-2">{comments[item.id]}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => copyComment(item.id)}
                    >
                      📋 복사
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs">
                      톤 조절
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => generateComment(item)}
                  disabled={commentLoading === item.id}
                >
                  {commentLoading === item.id ? '생성 중...' : '✨ AI 댓글 생성'}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Alert Settings */}
      <div className="bg-card border border-border rounded-lg p-3 border-l-4 border-l-yellow-500 flex items-center gap-2">
        <span className="text-lg">🔔</span>
        <span className="text-sm font-semibold">알림 설정</span>
        <span className="text-xs text-muted-foreground ml-auto">
          새 콘텐츠 발견 시 알림 · 일 3회 요약 리포트
        </span>
      </div>
    </div>
  )
}
