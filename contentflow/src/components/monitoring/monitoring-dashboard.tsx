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

interface FeedItem {
  id: string; platform: string; author: string; title: string; snippet: string; time: string; language: string
}

export function MonitoringDashboard() {
  const [platform, setPlatform] = useState('all')
  const [keywords, setKeywords] = useState<string[]>(['소아성장', '성장호르몬'])
  const [newKeyword, setNewKeyword] = useState('')
  const [commentLoading, setCommentLoading] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})

  // Placeholder feed data — real data comes from monitoring_feed table
  const feed: FeedItem[] = []

  function addKeyword() {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()])
      setNewKeyword('')
    }
  }

  async function generateComment(item: FeedItem) {
    setCommentLoading(item.id)
    try {
      const res = await fetch('/api/monitoring/comment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentText: item.snippet, platform: item.platform, tone: 'professional', language: item.language }),
      })
      const data = await res.json()
      setComments(prev => ({ ...prev, [item.id]: data.comment }))
    } catch {} finally { setCommentLoading(null) }
  }

  function copyComment(id: string) {
    navigator.clipboard.writeText(comments[id] || '')
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Platform Filter */}
      <div className="flex items-center gap-2">
        {PLATFORMS.map(p => (
          <button key={p.id} onClick={() => setPlatform(p.id)}
            className={cn('px-3 py-1.5 rounded-md text-xs', platform === p.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            {p.icon && <span className="mr-1">{p.icon}</span>}{p.label}
          </button>
        ))}
      </div>

      {/* Keywords */}
      <div className="flex gap-2 flex-wrap items-center">
        {keywords.map(kw => (
          <span key={kw} className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs cursor-pointer hover:bg-primary/20"
            onClick={() => setKeywords(keywords.filter(k => k !== kw))}>
            {kw} ×
          </span>
        ))}
        <div className="flex gap-1">
          <Input placeholder="키워드 추가" value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()} className="h-7 w-32 text-xs" />
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addKeyword}>+</Button>
        </div>
      </div>

      {/* Feed */}
      {feed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-4">💬</p>
          <p className="text-sm">모니터링할 키워드를 설정하면 관련 콘텐츠가 여기에 표시됩니다</p>
          <p className="text-xs mt-2">4시간 간격으로 자동 수집됩니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feed.map(item => (
            <div key={item.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold">{item.author}</span>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
              <p className="text-sm mb-3">{item.snippet}</p>

              {comments[item.id] ? (
                <div className="bg-muted rounded-md p-3 border-l-2 border-primary">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-purple-400 font-semibold">✨ AI 댓글 제안</span>
                    <Button size="sm" variant="ghost" className="h-5 text-[10px] ml-auto" onClick={() => generateComment(item)}>재생성</Button>
                  </div>
                  <p className="text-sm mb-2">{comments[item.id]}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-6 text-xs" onClick={() => copyComment(item.id)}>📋 복사</Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs">톤 조절</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => generateComment(item)}
                  disabled={commentLoading === item.id}>
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
        <span className="text-xs text-muted-foreground ml-auto">새 콘텐츠 발견 시 알림 · 일 3회 요약 리포트</span>
      </div>
    </div>
  )
}
