'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'
import { useProjectStore } from '@/stores/project-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TargetLanguagesSection } from '@/components/project/target-languages-section'
import { fetchAiGenerate } from '@/lib/sse-stream-parser'

const PLATFORMS = [
  { id: 'all', label: '전체' },
  { id: 'naver_jisikin', label: '지식인', icon: '📗' },
  { id: 'naver_blog', label: 'N블로그', icon: '📰' },
  { id: 'wordpress', label: '구글블로그', icon: '🌐' },
  { id: 'instagram', label: '인스타', icon: '📸' },
  { id: 'facebook', label: '페이스북', icon: '👤' },
  { id: 'threads', label: '스레드', icon: '💬' },
]

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  facebook: '👤',
  threads: '💬',
  naver_jisikin: '📗',
  naver_blog: '📰',
  wordpress: '🌐',
}

const LANGUAGE_INFO: Record<string, { label: string; flag: string }> = {
  ko: { label: '한국어', flag: '🇰🇷' },
  en: { label: 'English', flag: '🇺🇸' },
  th: { label: 'ไทย', flag: '🇹🇭' },
  vi: { label: 'Tiếng Việt', flag: '🇻🇳' },
  ja: { label: '日本語', flag: '🇯🇵' },
  zh: { label: '中文', flag: '🇨🇳' },
  ms: { label: 'Bahasa Melayu', flag: '🇲🇾' },
  id: { label: 'Bahasa Indonesia', flag: '🇮🇩' },
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
  const { projects, selectedProjectId } = useProjectStore()
  const project = projects.find(p => p.id === selectedProjectId)
  const rawLanguages = project?.target_languages ?? ['ko']
  const targetLanguages = rawLanguages.includes('ko')
    ? ['ko', ...rawLanguages.filter((l: string) => l !== 'ko')]
    : ['ko', ...rawLanguages]

  const [selectedLang, setSelectedLang] = useState('ko')
  const [showLangDialog, setShowLangDialog] = useState(false)
  const [keywordsPerLang, setKeywordsPerLang] = useState<Record<string, string[]>>({
    ko: ['소아성장', '성장호르몬'],
  })
  const [feedItemsPerLang, setFeedItemsPerLang] = useState<Record<string, FeedItem[]>>({})
  const [translating, setTranslating] = useState(false)

  const [platform, setPlatform] = useState('all')
  const [newKeyword, setNewKeyword] = useState('')
  const [commentLoading, setCommentLoading] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [searching, setSearching] = useState(false)

  const currentKeywords = keywordsPerLang[selectedLang] || []
  const currentFeedItems = feedItemsPerLang[selectedLang] || []

  // Naver platforms hidden for non-Korean
  const visiblePlatforms = selectedLang === 'ko'
    ? PLATFORMS
    : PLATFORMS.filter(p => !p.id.startsWith('naver'))

  function addKeyword() {
    const kw = newKeyword.trim()
    if (kw && !currentKeywords.includes(kw)) {
      setKeywordsPerLang(prev => ({
        ...prev,
        [selectedLang]: [...(prev[selectedLang] || []), kw],
      }))
      setNewKeyword('')
    }
  }

  function removeKeyword(kw: string) {
    setKeywordsPerLang(prev => ({
      ...prev,
      [selectedLang]: (prev[selectedLang] || []).filter(k => k !== kw),
    }))
  }

  async function handleTranslate() {
    const koKeywords = keywordsPerLang['ko'] || []
    if (koKeywords.length === 0) return
    setTranslating(true)
    try {
      const prompt = `Translate these Korean keywords to ${LANGUAGE_INFO[selectedLang]?.label || selectedLang}. Return ONLY a JSON array of translated strings, no explanation.\n\nKeywords: ${JSON.stringify(koKeywords)}`

      const fullText = await fetchAiGenerate(prompt, 'gemini-2.5-flash')

      const match = fullText.match(/\[[\s\S]*\]/)
      if (match) {
        const translated = JSON.parse(match[0])
        setKeywordsPerLang(prev => ({ ...prev, [selectedLang]: translated }))
      }
    } catch (err) {
      console.error('Translation error:', err)
    } finally {
      setTranslating(false)
    }
  }

  async function handleSearch() {
    const keywords = keywordsPerLang[selectedLang] || []
    if (keywords.length === 0) return
    setSearching(true)
    const allItems: FeedItem[] = []
    const isKorean = selectedLang === 'ko'

    for (const keyword of keywords) {
      // Naver searches (Korean only)
      if (isKorean) {
        try {
          const nvRes = await fetch('/api/monitoring/search/naver', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword }),
          })
          const nvData = await nvRes.json()
          allItems.push(...(nvData.items || []))
        } catch {}

        try {
          const nbRes = await fetch('/api/monitoring/search/naver-blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword }),
          })
          const nbData = await nbRes.json()
          allItems.push(...(nbData.items || []))
        } catch {}
      }

      // Google Blog search (all languages)
      try {
        const gbRes = await fetch('/api/monitoring/search/google-blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword, language: selectedLang }),
        })
        const gbData = await gbRes.json()
        allItems.push(...(gbData.items || []))
      } catch {}

      // Instagram (if connected)
      const projectId = localStorage.getItem('cf_selectedProjectId')
      const metaCredsRaw = projectId ? localStorage.getItem(`meta_credentials_${projectId}`) : null
      if (metaCredsRaw) {
        try {
          const metaCreds = JSON.parse(metaCredsRaw)
          const page = metaCreds.pages?.[0]
          if (page?.instagram?.id) {
            const igRes = await fetch('/api/monitoring/search/instagram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                keyword,
                accessToken: page.pageAccessToken,
                igUserId: page.instagram.id,
              }),
            })
            const igData = await igRes.json()
            allItems.push(...(igData.items || []))
          }
        } catch {}
      }
    }

    setFeedItemsPerLang(prev => ({ ...prev, [selectedLang]: allItems }))
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
          language: selectedLang,
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
    platform === 'all'
      ? currentFeedItems
      : currentFeedItems.filter(item => item.platform === platform)

  function formatPublished(val?: string) {
    if (!val) return ''
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
    <div className="p-6 max-w-5xl space-y-4">
      {/* Language Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {targetLanguages.map(lang => {
          const info = LANGUAGE_INFO[lang] || { label: lang, flag: '' }
          return (
            <button
              key={lang}
              onClick={() => { setSelectedLang(lang); setPlatform('all') }}
              className={cn(
                'px-4 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1',
                selectedLang === lang
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span>{info.flag}</span>
              <span>{info.label}</span>
            </button>
          )
        })}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs gap-1 text-muted-foreground border-b-2 border-transparent"
          onClick={() => setShowLangDialog(true)}
        >
          <Plus className="w-3.5 h-3.5" /> 언어 추가
        </Button>
      </div>

      {/* Language Add Dialog */}
      <Dialog open={showLangDialog} onOpenChange={setShowLangDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>타겟 언어 관리</DialogTitle>
          </DialogHeader>
          {project && (
            <TargetLanguagesSection project={project} onUpdate={(updates) => {
              useProjectStore.getState().updateProject(project.id, updates)
            }} />
          )}
        </DialogContent>
      </Dialog>

      {/* Keywords + Translate + Search */}
      <div className="flex gap-2 flex-wrap items-center">
        {currentKeywords.map(kw => (
          <span
            key={kw}
            className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs cursor-pointer hover:bg-primary/20"
            onClick={() => removeKeyword(kw)}
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
        {/* Translate button: only for non-Korean tabs */}
        {selectedLang !== 'ko' && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleTranslate}
            disabled={translating || (keywordsPerLang['ko'] || []).length === 0}
          >
            {translating ? '번역 중...' : '번역'}
          </Button>
        )}
        <Button
          size="sm"
          className="h-7 text-xs ml-1"
          onClick={handleSearch}
          disabled={searching || currentKeywords.length === 0}
        >
          {searching ? '검색 중...' : '🔍 검색'}
        </Button>
      </div>

      {/* Platform Tabs with counts */}
      <div className="flex items-center gap-1 border-b border-border">
        {visiblePlatforms.map(p => {
          const count =
            p.id === 'all'
              ? currentFeedItems.length
              : currentFeedItems.filter(f => f.platform === p.id).length
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
              {count > 0 && (
                <span className="ml-1.5 bg-muted px-1.5 py-0.5 rounded-full text-[10px]">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Feed */}
      {filteredFeed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-4">💬</p>
          <p className="text-sm">
            {currentFeedItems.length === 0
              ? '키워드를 설정하고 검색 버튼을 눌러 콘텐츠를 불러오세요'
              : `${platform} 플랫폼에 검색 결과가 없습니다`}
          </p>
          <p className="text-xs mt-2 text-muted-foreground/60">
            {selectedLang === 'ko'
              ? 'YouTube · 네이버 지식인 · 네이버 블로그 · 구글 블로그에서 실시간 검색합니다'
              : 'YouTube · 구글 블로그에서 실시간 검색합니다'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {filteredFeed.map((item, idx) => (
            <div
              key={`${item.platform}-${item.id}-${idx}`}
              className="bg-card border border-border rounded-lg p-4"
            >
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
