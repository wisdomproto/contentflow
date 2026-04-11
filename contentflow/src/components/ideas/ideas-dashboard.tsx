'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TrendingFeed } from './trending-feed'
import { IdeaCard } from './idea-card'

type TabId = 'trending' | 'saved' | 'gap'
const TABS: { id: TabId; label: string }[] = [
  { id: 'trending', label: '트렌딩' },
  { id: 'saved', label: '아이디어 보관함' },
  { id: 'gap', label: '경쟁사 갭에서 가져오기' },
]

interface Idea {
  channel: string; title: string; structure: string; outline: string[]
}

export function IdeasDashboard() {
  const [tab, setTab] = useState<TabId>('trending')
  const [keywords, setKeywords] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleTrends, setGoogleTrends] = useState<Array<{ keyword: string; trend: string; change: string }>>([])
  const [naverTrends, setNaverTrends] = useState<Array<{ keyword: string; trend: string; change: string }>>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selectedTopic, setSelectedTopic] = useState('')

  async function handleSearch() {
    if (!keywords.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/ideas/trending', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keywords.split(',').map(k => k.trim()) }),
      })
      const data = await res.json()
      setGoogleTrends(data.googleTrends || [])
      setNaverTrends(data.naverTrends || [])
    } catch {} finally { setLoading(false) }
  }

  async function handleGenerateIdeas(topic: string) {
    setSelectedTopic(topic)
    setLoading(true)
    try {
      const res = await fetch('/api/ideas/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, channelTypes: ['blog', 'cardnews', 'youtube'] }),
      })
      const data = await res.json()
      setIdeas(data.ideas || [])
    } catch {} finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex gap-1 border-b border-border pb-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-1.5 rounded-md text-sm', tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'trending' && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <Input placeholder="키워드 입력 (쉼표로 구분)" value={keywords} onChange={e => setKeywords(e.target.value)} className="flex-1" />
            <Button onClick={handleSearch} disabled={loading}>{loading ? '검색 중...' : 'AI 아이디어 생성'}</Button>
          </div>

          <TrendingFeed googleTrends={googleTrends} naverTrends={naverTrends} onSelectTopic={handleGenerateIdeas} />

          {ideas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✨</span>
                <span className="text-sm font-semibold">AI 콘텐츠 아이디어</span>
                <span className="text-xs text-muted-foreground">— "{selectedTopic}" 기반</span>
              </div>
              <div className="space-y-3">
                {ideas.map((idea, i) => (
                  <IdeaCard key={i} {...idea} onGenerate={() => {}} onSave={() => {}} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'saved' && (
        <div className="text-center py-12 text-muted-foreground text-sm">저장된 아이디어가 없습니다</div>
      )}

      {tab === 'gap' && (
        <div className="text-center py-12 text-muted-foreground text-sm">경쟁사 분석 모듈에서 갭을 발견하면 여기에 표시됩니다</div>
      )}
    </div>
  )
}
