'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IdeaCard } from './idea-card'
import { AnalyticsLanguageTabs } from '@/components/analytics/language-tabs'

type TabId = 'trending' | 'saved' | 'gap'
const TABS: { id: TabId; label: string }[] = [
  { id: 'trending', label: '트렌딩' },
  { id: 'saved', label: '아이디어 보관함' },
  { id: 'gap', label: '경쟁사 갭에서 가져오기' },
]

const PERIOD_OPTIONS = [
  { value: 'week', label: '1주' },
  { value: 'month', label: '1개월' },
  { value: 'quarter', label: '3개월' },
]

interface YouTubeVideo {
  id: string
  title: string
  channelTitle: string
  thumbnail: string
  url: string
  views: string
  viewCount: number
  likes: number
  comments: number
  publishedAt: string
  keyword: string
}

interface NaverTrend {
  keyword: string
  monthlyPcQcCnt?: number
  monthlyMobileQcCnt?: number
  totalSearches: number
  compIdx?: string
  trend: string
  change?: string
}

interface GoogleTrend {
  keyword: string
  trend: string
  change: string
}

interface Idea {
  channel: string; title: string; structure: string; outline: string[]
}

export function IdeasDashboard() {
  const [tab, setTab] = useState<TabId>('trending')
  const [keywords, setKeywords] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedLang, setSelectedLang] = useState('ko')
  const [period, setPeriod] = useState('month')
  const [youtubeResults, setYoutubeResults] = useState<YouTubeVideo[]>([])
  const [naverTrends, setNaverTrends] = useState<NaverTrend[]>([])
  const [googleTrends, setGoogleTrends] = useState<GoogleTrend[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selectedTopic, setSelectedTopic] = useState('')

  async function handleSearch() {
    if (!keywords.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/ideas/trending', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keywords.split(',').map(k => k.trim()), language: selectedLang, period }),
      })
      const data = await res.json()
      setYoutubeResults(data.youtube || [])
      setNaverTrends(data.naverTrends || [])
      setGoogleTrends(data.googleTrends || [])
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
    <div className="p-6 max-w-5xl space-y-4">
      {/* Language Tabs */}
      <AnalyticsLanguageTabs selectedLang={selectedLang} onLangChange={setSelectedLang} />

      {/* Tab Bar */}
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
          {/* Search Bar + Period Selector */}
          <div className="flex gap-2">
            <Input
              placeholder="키워드 입력 (쉼표로 구분)"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <div className="flex rounded-md overflow-hidden border border-border">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={cn(
                    'px-3 py-1.5 text-sm transition-colors',
                    period === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground bg-background'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? '검색 중...' : '트렌드 검색'}
            </Button>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* YouTube Trending */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                <span className="text-red-500 font-bold text-sm">YT</span>
                <span className="text-sm font-semibold">YouTube 인기 영상</span>
                <span className="text-xs text-muted-foreground ml-auto">{youtubeResults.length > 0 ? `${youtubeResults.length}개` : ''}</span>
              </div>
              <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
                {youtubeResults.map((video) => (
                  <button key={video.id} onClick={() => handleGenerateIdeas(video.title)}
                    className="w-full flex gap-3 p-3 hover:bg-accent text-left">
                    {video.thumbnail && (
                      <img src={video.thumbnail} alt="" className="w-24 h-14 object-cover rounded shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm line-clamp-2">{video.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
                        <span>{video.channelTitle}</span>
                        <span>👁️ {video.views}</span>
                        {video.likes > 0 && <span>❤️ {video.likes.toLocaleString()}</span>}
                      </div>
                    </div>
                  </button>
                ))}
                {youtubeResults.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">키워드를 입력하고 검색하세요</div>
                )}
              </div>
            </div>

            {/* Naver Search Volume (Korean only) */}
            {selectedLang === 'ko' && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                  <span className="text-green-500 font-bold text-sm">N</span>
                  <span className="text-sm font-semibold">Naver 검색량</span>
                </div>
                <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
                  {naverTrends.map((item, i) => (
                    <button key={i} onClick={() => handleGenerateIdeas(item.keyword)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-accent text-left">
                      <span className="text-sm flex-1">{item.keyword}</span>
                      {item.totalSearches > 0 ? (
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">월 {item.totalSearches.toLocaleString()}회</div>
                          {item.compIdx && (
                            <div className="text-xs text-muted-foreground">경쟁도: {item.compIdx}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">검색량 없음</span>
                      )}
                    </button>
                  ))}
                  {naverTrends.length === 0 && (
                    <div className="p-4 text-center text-xs text-muted-foreground">키워드를 입력하고 검색하세요</div>
                  )}
                </div>
              </div>
            )}

            {/* Google Trends (non-Korean or when naverTrends not shown) */}
            {selectedLang !== 'ko' && googleTrends.length > 0 && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                  <span className="text-blue-400 font-bold text-sm">G</span>
                  <span className="text-sm font-semibold">Google Trends</span>
                </div>
                <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
                  {googleTrends.map((item, i) => (
                    <button key={i} onClick={() => handleGenerateIdeas(item.keyword)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-accent text-left">
                      <span className="text-green-400 text-xs">▲</span>
                      <span className="text-sm flex-1">{item.keyword}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Ideas Result */}
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
