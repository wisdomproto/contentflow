'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useProjectStore } from '@/stores/project-store'
import { AnalyticsLanguageTabs } from '@/components/analytics/language-tabs'
import { IdeaCard } from './idea-card'

async function fetchAiGenerate(prompt: string, model: string): Promise<string> {
  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model }),
  })
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No reader')
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try { const parsed = JSON.parse(data); if (parsed.text) fullText += parsed.text } catch {}
      }
    }
  }
  return fullText
}

type TabId = 'keywords' | 'trending' | 'ideas' | 'saved'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'keywords', label: '키워드 분석', icon: '🔑' },
  { id: 'trending', label: '트렌딩', icon: '📈' },
  { id: 'ideas', label: 'AI 아이디어', icon: '✨' },
  { id: 'saved', label: '보관함', icon: '📁' },
]

const PERIOD_OPTIONS = [
  { value: 'week', label: '1주' },
  { value: 'month', label: '1개월' },
  { value: 'quarter', label: '3개월' },
]

// ----- Keyword types -----
interface KeywordItem {
  keyword: string
  category: string
  searchIntent: 'informational' | 'commercial' | 'transactional' | 'navigational'
  priority: 'high' | 'medium' | 'low'
  estimatedVolume?: string
  difficulty?: string
  used?: boolean
  naverMonthly?: number
  naverPc?: number
  naverMobile?: number
  naverComp?: string
  googleVolume?: number
  googleComp?: string
  googleCpc?: number
}

interface KeywordGroup {
  category: string
  keywords: KeywordItem[]
}

// ----- Trending types -----
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

// ----- Idea types -----
interface Idea {
  channel: string
  title: string
  structure: string
  outline: string[]
}

export function IdeasDashboard() {
  const { projects, selectedProjectId, contents } = useProjectStore()
  const project = projects.find(p => p.id === selectedProjectId)

  const [tab, setTab] = useState<TabId>('keywords')
  const [selectedLang, setSelectedLang] = useState('ko')

  // --- Keywords tab state ---
  const [generating, setGenerating] = useState(false)
  const [keywordGroups, setKeywordGroups] = useState<KeywordGroup[]>([])
  const [seedKeyword, setSeedKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  type SortCol = 'volume' | 'naver' | 'google' | 'difficulty' | 'priority' | 'competition'
  const [sortCols, setSortCols] = useState<{ col: SortCol; dir: 'asc' | 'desc' }[]>([])

  // --- Saved/pinned keywords ---
  const [savedKeywords, setSavedKeywords] = useState<KeywordItem[]>([])
  const [goldenLoading, setGoldenLoading] = useState(false)
  const [goldenStrategy, setGoldenStrategy] = useState('')

  function togglePin(kw: KeywordItem) {
    setSavedKeywords(prev => {
      const exists = prev.some(s => s.keyword === kw.keyword)
      if (exists) return prev.filter(s => s.keyword !== kw.keyword)
      return [...prev, kw]
    })
  }

  function isPinned(keyword: string) {
    return savedKeywords.some(s => s.keyword === keyword)
  }

  // --- Trending tab state ---
  const [trendKeywords, setTrendKeywords] = useState('')
  const [trendLoading, setTrendLoading] = useState(false)
  const [period, setPeriod] = useState('month')
  const [youtubeResults, setYoutubeResults] = useState<YouTubeVideo[]>([])
  const [naverTrends, setNaverTrends] = useState<NaverTrend[]>([])
  const [googleTrends, setGoogleTrends] = useState<GoogleTrend[]>([])

  // --- Ideas tab state ---
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selectedTopic, setSelectedTopic] = useState('')
  const [ideaTopic, setIdeaTopic] = useState('')
  const [ideaLoading, setIdeaLoading] = useState(false)

  // ===== Keywords tab logic =====
  async function generateKeywords() {
    if (!project) return
    setGenerating(true)
    try {
      const langMap: Record<string, string> = {
        ko: 'Korean', en: 'English', th: 'Thai', vi: 'Vietnamese',
        ja: 'Japanese', zh: 'Chinese', ms: 'Malay', id: 'Indonesian',
      }
      const langLabel = langMap[selectedLang] || selectedLang.toUpperCase()
      const volumeLabel = selectedLang === 'ko' ? '높음/중간/낮음' : 'High/Medium/Low'
      const diffLabel = selectedLang === 'ko' ? '쉬움/보통/어려움' : 'Easy/Medium/Hard'

      const prompt = `You are a Google SEO keyword strategist. Analyze this project and generate a comprehensive keyword map.

Project: ${project.name}
Industry: ${project.industry || 'Not specified'}
Brand: ${project.brand_name || project.name}
Description: ${project.brand_description || ''}
Target audience: ${JSON.stringify(project.target_audience) || ''}
USP: ${project.usp || ''}
${seedKeyword ? `Seed keyword: ${seedKeyword}` : ''}
Existing content count: ${contents.filter(c => c.project_id === selectedProjectId).length}
Language: ${langLabel}

Generate 30-50 keywords in ${langLabel} grouped by category. All keywords must be written in ${langLabel}. Return ONLY valid JSON:
{
  "groups": [
    {
      "category": "Category name in ${langLabel}",
      "keywords": [
        {
          "keyword": "keyword in ${langLabel}",
          "searchIntent": "informational",
          "priority": "high",
          "estimatedVolume": "${volumeLabel}",
          "difficulty": "${diffLabel}"
        }
      ]
    }
  ]
}`

      const fullText = await fetchAiGenerate(prompt, 'gemini-2.5-flash')
      const jsonMatch = fullText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        let groups = parsed.groups || []

        // Korean: fetch real Naver search volume for each keyword
        if (selectedLang === 'ko' && groups.length > 0) {
          const allKws = groups.flatMap((g: any) => g.keywords.map((k: any) => k.keyword))
          try {
            // Naver API accepts max ~5 hintKeywords per request; batch with delay
            let allNaverKws: any[] = []
            for (let i = 0; i < allKws.length; i += 5) {
              const batch = allKws.slice(i, i + 5)
              if (i > 0) await new Promise(r => setTimeout(r, 300))
              try {
                const res = await fetch('/api/naver/keywords', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ keywords: batch }),
                })
                const d = await res.json()
                if (d.keywords?.length) allNaverKws = allNaverKws.concat(d.keywords)
              } catch {}
            }
            const naverData = { keywords: allNaverKws }
            const naverMap = new Map<string, { pc: number; mobile: number; comp: string }>(
              (naverData.keywords || []).map((nk: any) => [
                nk.keyword,
                {
                  pc: nk.pcSearchVolume || 0,
                  mobile: nk.mobileSearchVolume || 0,
                  comp: nk.competition || '',
                },
              ])
            )

            // Merge Naver data into keywords (try exact match, then stripped match)
            groups = groups.map((g: any) => ({
              ...g,
              keywords: g.keywords.map((k: any) => {
                const naver = naverMap.get(k.keyword) || naverMap.get(k.keyword.replace(/\s+/g, ''))
                if (naver) {
                  const total = naver.pc + naver.mobile
                  return {
                    ...k,
                    naverMonthly: total,
                    naverPc: naver.pc,
                    naverMobile: naver.mobile,
                    naverComp: naver.comp,
                    estimatedVolume: total > 5000 ? '높음' : total > 1000 ? '중간' : total > 0 ? '낮음' : k.estimatedVolume,
                  }
                }
                return k
              }),
            }))
          } catch (err) {
            console.error('Naver keyword fetch error:', err)
          }
        }

        // Google search volume via DataForSEO (all keywords in one request)
        try {
          const allKwList = groups.flatMap((g: any) => g.keywords.map((k: any) => k.keyword))
          const googleRes = await fetch('/api/google/keywords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords: allKwList }),
          })
          const googleData = await googleRes.json()
          if (googleData.keywords?.length) {
            const googleMap = new Map(
              googleData.keywords.map((gk: any) => [gk.keyword, { vol: gk.searchVolume, comp: gk.competition, cpc: gk.cpc }])
            )
            groups = groups.map((g: any) => ({
              ...g,
              keywords: g.keywords.map((k: any) => {
                const gd = googleMap.get(k.keyword) || googleMap.get(k.keyword.replace(/\s+/g, ''))
                return gd ? { ...k, googleVolume: gd.vol, googleComp: gd.comp, googleCpc: gd.cpc } : k
              }),
            }))
          }
        } catch {}

        setKeywordGroups(groups)
      }
    } catch (err) {
      console.error('Keyword generation error:', err)
    } finally {
      setGenerating(false)
    }
  }

  // ===== Golden keyword discovery =====
  async function discoverGoldenKeywords() {
    if (!project) return
    setGoldenLoading(true)
    try {
      // 1. AI generates seed keywords from project info
      const seedPrompt = `Based on this business, generate 8 seed keywords for Naver search volume research.
Business: ${project.name}
Industry: ${project.industry || ''}
Brand: ${project.brand_name || project.name}
Description: ${project.brand_description || ''}
${seedKeyword ? `Focus area: ${seedKeyword}` : ''}

Return ONLY a JSON array of 8 Korean seed keywords (single words or short phrases, no spaces):
["키워드1","키워드2",...]`

      const seedText = await fetchAiGenerate(seedPrompt, 'gemini-2.5-flash')
      const seedMatch = seedText.match(/\[[\s\S]*?\]/)
      const seeds: string[] = seedMatch ? JSON.parse(seedMatch[0]) : ['성장클리닉', '키성장', '성장호르몬', '성장판검사', '아이키']

      // 2. Call Naver API for each seed (with delay)
      const allResults = new Map<string, { keyword: string; vol: number; comp: string; pc: number; mob: number }>()
      for (const seed of seeds) {
        try {
          const res = await fetch('/api/naver/keywords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords: [seed] }),
          })
          const data = await res.json()
          for (const nk of (data.keywords || [])) {
            const vol = (nk.pcSearchVolume || 0) + (nk.mobileSearchVolume || 0)
            if (!allResults.has(nk.keyword) || (allResults.get(nk.keyword)?.vol ?? 0) < vol) {
              allResults.set(nk.keyword, { keyword: nk.keyword, vol, comp: nk.competition || '?', pc: nk.pcSearchVolume || 0, mob: nk.mobileSearchVolume || 0 })
            }
          }
        } catch {}
        await new Promise(r => setTimeout(r, 400))
      }

      // 3. Filter: volume >= 300 AND competition is 낮음 or 중간
      const candidates = [...allResults.values()]
        .filter(r => r.vol >= 300 && (r.comp === '낮음' || r.comp === '중간'))
        .sort((a, b) => b.vol - a.vol)

      // 3.5 AI relevance filter — remove keywords unrelated to the business
      let golden = candidates
      if (candidates.length > 0) {
        const kwList = candidates.slice(0, 100).map(c => c.keyword).join(', ')
        const filterPrompt = `You are a keyword relevance filter. Given a business and a list of keywords, return ONLY the keywords that are directly relevant to the business. Remove any unrelated keywords.

Business: ${project.name}
Industry: ${project.industry || ''}
Description: ${project.brand_description || ''}
${seedKeyword ? `Focus: ${seedKeyword}` : ''}

Keywords to filter:
${kwList}

Return ONLY a JSON array of relevant keywords (exact spelling):
["키워드1","키워드2",...]`

        try {
          const filterText = await fetchAiGenerate(filterPrompt, 'gemini-2.5-flash')
          const filterMatch = filterText.match(/\[[\s\S]*?\]/)
          if (filterMatch) {
            const relevant = new Set<string>(JSON.parse(filterMatch[0]))
            golden = candidates.filter(c => relevant.has(c.keyword))
          }
        } catch {}
      }

      // 4. Convert to KeywordGroup format — group by competition level
      function toItem(g: typeof golden[0], cat: string): KeywordItem {
        return {
          keyword: g.keyword, category: cat,
          searchIntent: g.vol > 5000 ? 'commercial' as const : 'informational' as const,
          priority: g.comp === '낮음' ? 'high' as const : g.vol > 3000 ? 'high' as const : g.vol > 1000 ? 'medium' as const : 'low' as const,
          estimatedVolume: g.vol > 5000 ? '높음' : g.vol > 1000 ? '중간' : '낮음',
          difficulty: g.comp === '낮음' ? '쉬움' : '보통',
          naverMonthly: g.vol, naverPc: g.pc, naverMobile: g.mob, naverComp: g.comp,
        }
      }
      // Classify: 🏆 황금 = volume 1000+ & comp 낮음, 🥇 유망 = comp 낮음 or (volume 3000+ & comp 중간), 🥈 일반
      const goldTier = golden.filter(g => g.vol >= 1000 && g.comp === '낮음')
      const silverTier = golden.filter(g => !goldTier.includes(g) && (g.comp === '낮음' || (g.vol >= 3000 && g.comp === '중간')))
      const bronzeTier = golden.filter(g => !goldTier.includes(g) && !silverTier.includes(g))
      const groups: KeywordGroup[] = []
      if (goldTier.length > 0) groups.push({ category: '🏆 황금 키워드', keywords: goldTier.map(g => toItem(g, '🏆 황금 키워드')) })
      if (silverTier.length > 0) groups.push({ category: '🥇 유망 키워드', keywords: silverTier.map(g => toItem(g, '🥇 유망 키워드')) })
      if (bronzeTier.length > 0) groups.push({ category: '🥈 일반 키워드', keywords: bronzeTier.map(g => toItem(g, '🥈 일반 키워드')) })

      // 4.5 Fetch Google search volume for golden keywords
      try {
        const allGoldenKws = groups.flatMap(g => g.keywords.map(k => k.keyword))
        const gRes = await fetch('/api/google/keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: allGoldenKws }),
        })
        const gData = await gRes.json()
        if (gData.keywords?.length) {
          const gMap = new Map(gData.keywords.map((gk: any) => [gk.keyword, { vol: gk.searchVolume, comp: gk.competition, cpc: gk.cpc }]))
          for (const group of groups) {
            group.keywords = group.keywords.map(k => {
              const gd: any = gMap.get(k.keyword) || gMap.get(k.keyword.replace(/\s+/g, ''))
              return gd ? { ...k, googleVolume: gd.vol, googleComp: gd.comp, googleCpc: gd.cpc } : k
            })
          }
        }
      } catch {}

      const goldenItems = [...(groups[0]?.keywords || []), ...(groups[1]?.keywords || [])]
      setKeywordGroups(groups)
      setSelectedCategory(null)

      // 5. AI strategy recommendation based on golden keywords
      // Separate low-competition gems from medium
      const lowComp = goldenItems.filter(g => g.naverComp === '낮음').slice(0, 10)
      const midComp = goldenItems.filter(g => g.naverComp === '중간').slice(0, 15)
      const lowList = lowComp.map(g => `- ${g.keyword} (${g.naverMonthly?.toLocaleString()}/월, 경쟁:낮음)`).join('\n')
      const midList = midComp.map(g => `- ${g.keyword} (${g.naverMonthly?.toLocaleString()}/월, 경쟁:중간)`).join('\n')

      const strategyPrompt = `You are a Korean SEO/content marketing strategist. Analyze these golden keywords and create a concrete, actionable strategy.

Business: ${project.name} (${project.industry || ''})
Brand: ${project.brand_name || project.name}
Description: ${project.brand_description || ''}

=== 🥇 경쟁 낮음 키워드 (최우선 공략 대상) ===
${lowList || '(없음)'}

=== 🥈 경쟁 중간 키워드 (검색량 높은 순) ===
${midList || '(없음)'}

IMPORTANT: 경쟁 "낮음" 키워드는 반드시 전략에 포함하세요. 이들이 가장 빠르게 상위 노출할 수 있는 핵심 기회입니다.

Respond in Korean. Return strategy:
1. **핵심 전략 요약** (2-3문장, 비즈니스에 맞춤)
2. **즉시 공략 키워드** — 경쟁 낮음 키워드 전부 분석. 각각 왜 공략해야 하는지, 어떤 콘텐츠를 만들지
3. **콘텐츠 퍼널 설계** — 정보형(유입) → 상업형(전환) 키워드 연결 구조. 구체적 키워드 매핑
4. **추천 콘텐츠 주제** (7개) — 블로그 제목 예시 (경쟁 낮음 키워드 우선 활용)
5. **3개월 실행 로드맵** — 월별 구체적 액션 플랜`

      setGoldenStrategy('')
      try {
        const strategy = await fetchAiGenerate(strategyPrompt, 'gemini-2.5-flash')
        setGoldenStrategy(strategy)
      } catch {}
    } catch (err) {
      console.error('Golden keyword error:', err)
    } finally {
      setGoldenLoading(false)
    }
  }

  const allKeywords = keywordGroups.flatMap(g => g.keywords.map(k => ({ ...k, category: g.category })))
  const filteredKeywords = selectedCategory
    ? allKeywords.filter(k => k.category === selectedCategory)
    : allKeywords

  // Multi-column sort
  const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }
  const difficultyOrder: Record<string, number> = { '어려움': 3, 'Hard': 3, '보통': 2, 'Medium': 2, '쉬움': 1, 'Easy': 1 }
  const volumeOrder: Record<string, number> = { '높음': 3, 'High': 3, '중간': 2, 'Medium': 2, '낮음': 1, 'Low': 1 }
  const compOrder: Record<string, number> = { '높음': 3, '중간': 2, '낮음': 1 }

  function colValue(kw: KeywordItem, col: SortCol): number {
    if (col === 'naver') return kw.naverMonthly ?? -1
    if (col === 'google') return kw.googleVolume ?? -1
    if (col === 'volume') return volumeOrder[kw.estimatedVolume || ''] ?? 0
    if (col === 'priority') return priorityOrder[kw.priority] ?? 0
    if (col === 'difficulty') return difficultyOrder[kw.difficulty || ''] ?? 0
    if (col === 'competition') return compOrder[kw.naverComp || ''] ?? 0
    return 0
  }

  const sortedKeywords = sortCols.length === 0 ? filteredKeywords : [...filteredKeywords].sort((a, b) => {
    for (const { col, dir } of sortCols) {
      const av = colValue(a, col), bv = colValue(b, col)
      if (av !== bv) return dir === 'desc' ? bv - av : av - bv
    }
    return 0
  })

  // Click: replace with single sort. Shift+click: add/toggle multi-sort.
  function toggleSort(col: SortCol, shift: boolean) {
    setSortCols(prev => {
      const idx = prev.findIndex(s => s.col === col)
      if (idx >= 0) {
        // Already sorted by this column — toggle direction or remove
        const cur = prev[idx]
        if (cur.dir === 'desc') return prev.map((s, i) => i === idx ? { ...s, dir: 'asc' as const } : s)
        // Was asc → remove
        return prev.filter((_, i) => i !== idx)
      }
      // Add new column
      if (shift) return [...prev, { col, dir: 'desc' as const }]
      return [{ col, dir: 'desc' as const }]
    })
  }

  function sortIcon(col: SortCol) {
    const entry = sortCols.find(s => s.col === col)
    if (!entry) return ' ↕'
    const idx = sortCols.indexOf(entry)
    const num = sortCols.length > 1 ? `${idx + 1}` : ''
    return entry.dir === 'desc' ? ` ${num}↓` : ` ${num}↑`
  }

  const intentColors: Record<string, string> = {
    informational: 'bg-blue-500/10 text-blue-500',
    commercial: 'bg-purple-500/10 text-purple-500',
    transactional: 'bg-green-500/10 text-green-500',
    navigational: 'bg-orange-500/10 text-orange-500',
  }
  const intentLabels: Record<string, string> = {
    informational: '정보형',
    commercial: '상업형',
    transactional: '거래형',
    navigational: '탐색형',
  }
  const priorityColors: Record<string, string> = {
    high: 'bg-red-500/10 text-red-500',
    medium: 'bg-yellow-500/10 text-yellow-500',
    low: 'bg-gray-500/10 text-gray-500',
  }

  const seedPlaceholder = selectedLang === 'ko'
    ? '시드 키워드 입력 (선택사항, 예: 성장클리닉)'
    : selectedLang === 'en'
    ? 'Enter seed keyword (optional, e.g. growth clinic)'
    : selectedLang === 'ja'
    ? 'シードキーワードを入力（任意）'
    : selectedLang === 'zh'
    ? '输入种子关键词（可选）'
    : selectedLang === 'th'
    ? 'ใส่คำสำคัญเริ่มต้น (ไม่บังคับ)'
    : selectedLang === 'vi'
    ? 'Nhập từ khóa hạt giống (tùy chọn)'
    : selectedLang === 'id'
    ? 'Masukkan kata kunci awal (opsional)'
    : selectedLang === 'ms'
    ? 'Masukkan kata kunci permulaan (pilihan)'
    : 'Enter seed keyword (optional)'

  // ===== Trending tab logic =====
  async function handleTrendSearch() {
    if (!trendKeywords.trim()) return
    setTrendLoading(true)
    try {
      const res = await fetch('/api/ideas/trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: trendKeywords.split(',').map(k => k.trim()), language: selectedLang, period }),
      })
      const data = await res.json()
      setYoutubeResults(data.youtube || [])
      setNaverTrends(data.naverTrends || [])
      setGoogleTrends(data.googleTrends || [])
    } catch {} finally { setTrendLoading(false) }
  }

  // ===== Ideas tab logic =====
  async function handleGenerateIdeas(topic: string) {
    const t = topic || ideaTopic
    if (!t.trim()) return
    setSelectedTopic(t)
    setIdeaLoading(true)
    // Switch to ideas tab if called from trending
    setTab('ideas')
    try {
      const res = await fetch('/api/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t, channelTypes: ['blog', 'cardnews', 'youtube'] }),
      })
      const data = await res.json()
      setIdeas(data.ideas || [])
    } catch {} finally { setIdeaLoading(false) }
  }

  return (
    <div className="p-6 max-w-6xl space-y-4">
      {/* Language Tabs */}
      <AnalyticsLanguageTabs selectedLang={selectedLang} onLangChange={setSelectedLang} />

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border pb-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm transition-colors',
              tab === t.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.id === 'saved' && savedKeywords.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 text-[10px] font-bold">{savedKeywords.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ===== TAB 1: 키워드 분석 ===== */}
      {tab === 'keywords' && (
        <div className="space-y-6">
          {/* Generation Controls */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              {/* Help button */}
              <div className="relative group">
                <button className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold hover:bg-primary/10 hover:text-primary">?</button>
                <div className="absolute left-0 top-7 z-50 w-72 bg-card border border-border rounded-lg p-3 shadow-lg hidden group-hover:block">
                  <h4 className="text-xs font-semibold mb-2">키워드 분석 안내</h4>
                  <div className="text-[11px] text-muted-foreground space-y-1.5">
                    <p><strong>검색량</strong> — {selectedLang === 'ko' ? '네이버 검색광고 API 기준 월간 검색량 (PC + 모바일)' : 'Google 추정 기준 (AI 분석)'}</p>
                    <p><strong>예상 볼륨</strong> — AI가 추정한 검색량 등급 (높음/중간/낮음)</p>
                    <p><strong>난이도</strong> — 해당 키워드로 상위 노출하기 위한 경쟁 난이도</p>
                    <p><strong>검색 의도</strong> — 정보형(~란?), 상업형(~추천), 거래형(~예약), 탐색형(브랜드)</p>
                    {selectedLang === 'ko' && <p><strong>네이버 검색량</strong> — 네이버 검색광고 API 실제 데이터. 경쟁은 광고 입찰 경쟁도.</p>}
                  </div>
                </div>
              </div>
              <Input
                value={seedKeyword}
                onChange={e => setSeedKeyword(e.target.value)}
                placeholder={seedPlaceholder}
                onKeyDown={e => e.key === 'Enter' && generateKeywords()}
                className="flex-1 text-sm"
              />
              <Button onClick={generateKeywords} disabled={generating || goldenLoading}>
                {generating ? '분석 중...' : '✨ AI 키워드 분석'}
              </Button>
              {selectedLang === 'ko' && (
                <Button onClick={discoverGoldenKeywords} disabled={generating || goldenLoading} variant="outline" className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10">
                  {goldenLoading ? '발굴 중...' : '🏆 황금 키워드'}
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              프로젝트 설정(업종, 브랜드, 타겟 고객)을 기반으로 30~50개 키워드를 카테고리별로 분석합니다.
              시드 키워드를 입력하면 해당 키워드 중심으로 확장합니다.
            </p>
          </div>

          {/* Results */}
          {keywordGroups.length > 0 && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{allKeywords.length}</div>
                  <div className="text-xs text-muted-foreground">총 키워드</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{keywordGroups.length}</div>
                  <div className="text-xs text-muted-foreground">카테고리</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-500">{allKeywords.filter(k => k.priority === 'high').length}</div>
                  <div className="text-xs text-muted-foreground">높은 우선순위</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-500">{allKeywords.filter(k => k.searchIntent === 'informational').length}</div>
                  <div className="text-xs text-muted-foreground">정보형 키워드</div>
                </div>
              </div>

              {/* Golden Strategy */}
              {goldenStrategy && (
                <div className="bg-gradient-to-r from-yellow-500/5 to-orange-500/5 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">🏆 AI 추천 전략</h3>
                    <button onClick={() => setGoldenStrategy('')} className="text-xs text-muted-foreground hover:text-foreground">접기</button>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: goldenStrategy.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
                  />
                </div>
              )}
              {goldenLoading && !goldenStrategy && keywordGroups.length > 0 && (
                <div className="bg-gradient-to-r from-yellow-500/5 to-orange-500/5 border border-yellow-500/20 rounded-lg p-4 text-center text-sm text-muted-foreground">
                  🏆 AI 전략 분석 중...
                </div>
              )}

              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn('px-3 py-1.5 rounded-md text-xs transition-colors',
                    !selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  전체 ({allKeywords.length})
                </button>
                {keywordGroups.map(group => (
                  <button
                    key={group.category}
                    onClick={() => setSelectedCategory(group.category)}
                    className={cn('px-3 py-1.5 rounded-md text-xs transition-colors',
                      selectedCategory === group.category ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {group.category} ({group.keywords.length})
                  </button>
                ))}
              </div>

              {/* Keyword Table */}
              {sortCols.length > 0 && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>정렬:</span>
                  {sortCols.map((s, i) => (
                    <span key={s.col} className="bg-muted px-2 py-0.5 rounded">
                      {s.col === 'priority' ? '우선순위' : s.col === 'volume' ? '예상 볼륨' : s.col === 'naver' ? '네이버 검색량' : s.col === 'google' ? 'Google 검색량' : s.col === 'competition' ? '경쟁도' : '난이도'}
                      {s.dir === 'desc' ? ' ↓' : ' ↑'}
                      {i < sortCols.length - 1 && <span className="ml-1">→</span>}
                    </span>
                  ))}
                  <button onClick={() => setSortCols([])} className="text-muted-foreground hover:text-foreground ml-1">✕ 초기화</button>
                </div>
              )}
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="w-8 px-2 py-2.5"></th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">키워드</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">카테고리</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">검색 의도</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={e => toggleSort('priority', e.shiftKey)}>우선순위{sortIcon('priority')}</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={e => toggleSort('volume', e.shiftKey)}>예상 볼륨{sortIcon('volume')}</th>
                      {selectedLang === 'ko' && (
                        <>
                          <th className="text-center px-4 py-2.5 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={e => toggleSort('naver', e.shiftKey)}>네이버{sortIcon('naver')}</th>
                          <th className="text-center px-4 py-2.5 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={e => toggleSort('competition', e.shiftKey)}>경쟁도{sortIcon('competition')}</th>
                        </>
                      )}
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={e => toggleSort('google', e.shiftKey)}>Google{sortIcon('google')}</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={e => toggleSort('difficulty', e.shiftKey)}>난이도{sortIcon('difficulty')}</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedKeywords.map((kw, i) => (
                      <tr key={i} className={cn('border-b border-border hover:bg-muted/30', isPinned(kw.keyword) && 'bg-yellow-500/5')}>
                        <td className="px-2 py-2.5 text-center">
                          <button onClick={() => togglePin(kw)} className="text-base hover:scale-125 transition-transform">
                            {isPinned(kw.keyword) ? '★' : '☆'}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 font-medium">{kw.keyword}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{kw.category}</td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant="outline" className={cn('text-[10px]', intentColors[kw.searchIntent])}>
                            {intentLabels[kw.searchIntent] || kw.searchIntent}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant="outline" className={cn('text-[10px]', priorityColors[kw.priority])}>
                            {kw.priority === 'high' ? '높음' : kw.priority === 'medium' ? '보통' : '낮음'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">{kw.estimatedVolume || '-'}</td>
                        {selectedLang === 'ko' && (
                          <>
                            <td className="px-4 py-2.5 text-center text-xs">
                              {kw.naverMonthly != null ? (
                                <div>
                                  <span className="font-medium">{kw.naverMonthly.toLocaleString()}</span>
                                  <span className="text-muted-foreground text-[10px] ml-1">/ 월</span>
                                </div>
                              ) : <span className="text-muted-foreground">-</span>}
                            </td>
                            <td className="px-4 py-2.5 text-center text-xs">
                              {kw.naverComp ? (
                                <Badge variant="outline" className={cn('text-[10px]',
                                  kw.naverComp === '낮음' ? 'bg-green-500/10 text-green-500' :
                                  kw.naverComp === '중간' ? 'bg-yellow-500/10 text-yellow-500' :
                                  'bg-red-500/10 text-red-500'
                                )}>{kw.naverComp}</Badge>
                              ) : <span className="text-muted-foreground">-</span>}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-2.5 text-center text-xs">
                          {kw.googleVolume != null && kw.googleVolume > 0 ? (
                            <div>
                              <span className="font-medium">{kw.googleVolume.toLocaleString()}</span>
                              <span className="text-muted-foreground text-[10px] ml-1">/ 월</span>
                            </div>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">{kw.difficulty || '-'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px]"
                            onClick={() => { setIdeaTopic(kw.keyword); handleGenerateIdeas(kw.keyword) }}
                          >
                            콘텐츠 만들기
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Empty state */}
          {keywordGroups.length === 0 && !generating && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-4xl mb-4">🔑</p>
              <p className="text-sm">프로젝트 정보를 기반으로 키워드를 분석합니다</p>
              <p className="text-xs mt-2">프로젝트 설정에서 업종, 브랜드 정보를 먼저 입력하면 더 정확한 결과를 얻을 수 있습니다</p>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB 2: 트렌딩 ===== */}
      {tab === 'trending' && (
        <div className="space-y-6">
          {/* Search Bar + Period Selector */}
          <div className="flex gap-2">
            <Input
              placeholder="키워드 입력 (쉼표로 구분)"
              value={trendKeywords}
              onChange={e => setTrendKeywords(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTrendSearch()}
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
            <Button onClick={handleTrendSearch} disabled={trendLoading}>
              {trendLoading ? '검색 중...' : '트렌드 검색'}
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

            {/* Google Trends (non-Korean) */}
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
        </div>
      )}

      {/* ===== TAB 3: AI 아이디어 ===== */}
      {tab === 'ideas' && (
        <div className="space-y-6">
          {/* Topic Input */}
          <div className="flex gap-2">
            <Input
              placeholder="주제를 입력하세요 (예: 다이어트 식단 관리)"
              value={ideaTopic}
              onChange={e => setIdeaTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerateIdeas(ideaTopic)}
              className="flex-1"
            />
            <Button onClick={() => handleGenerateIdeas(ideaTopic)} disabled={ideaLoading}>
              {ideaLoading ? '생성 중...' : '✨ AI 아이디어 생성'}
            </Button>
          </div>

          {selectedTopic && (
            <div className="text-xs text-muted-foreground">
              주제: <span className="font-medium text-foreground">"{selectedTopic}"</span>
            </div>
          )}

          {/* Ideas List */}
          {ideas.length > 0 && (
            <div className="space-y-3">
              {ideas.map((idea, i) => (
                <IdeaCard key={i} {...idea} onGenerate={() => {}} onSave={() => {}} />
              ))}
            </div>
          )}

          {ideas.length === 0 && !ideaLoading && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-4xl mb-4">✨</p>
              <p className="text-sm">주제를 입력하거나 트렌딩/키워드 탭에서 항목을 클릭하세요</p>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB 4: 보관함 ===== */}
      {tab === 'saved' && (
        <div className="space-y-4">
          {savedKeywords.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">고정된 키워드 <span className="font-bold text-foreground">{savedKeywords.length}</span>개</p>
                <Button variant="ghost" size="sm" className="text-xs text-red-400 hover:text-red-500" onClick={() => setSavedKeywords([])}>전체 삭제</Button>
              </div>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="w-8 px-2 py-2.5"></th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">키워드</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">카테고리</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">검색 의도</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">우선순위</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">예상 볼륨</th>
                      {selectedLang === 'ko' && (
                        <>
                          <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">네이버</th>
                          <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">경쟁도</th>
                        </>
                      )}
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Google</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">난이도</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedKeywords.map((kw, i) => (
                      <tr key={i} className="border-b border-border hover:bg-muted/30 bg-yellow-500/5">
                        <td className="px-2 py-2.5 text-center">
                          <button onClick={() => togglePin(kw)} className="text-base hover:scale-125 transition-transform">★</button>
                        </td>
                        <td className="px-4 py-2.5 font-medium">{kw.keyword}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{kw.category}</td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant="outline" className={cn('text-[10px]', intentColors[kw.searchIntent])}>
                            {intentLabels[kw.searchIntent] || kw.searchIntent}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant="outline" className={cn('text-[10px]', priorityColors[kw.priority])}>
                            {kw.priority === 'high' ? '높음' : kw.priority === 'medium' ? '보통' : '낮음'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">{kw.estimatedVolume || '-'}</td>
                        {selectedLang === 'ko' && (
                          <>
                            <td className="px-4 py-2.5 text-center text-xs">
                              {kw.naverMonthly != null ? (
                                <div>
                                  <span className="font-medium">{kw.naverMonthly.toLocaleString()}</span>
                                  <span className="text-muted-foreground text-[10px] ml-1">/ 월</span>
                                </div>
                            ) : <span className="text-muted-foreground">-</span>}
                            </td>
                            <td className="px-4 py-2.5 text-center text-xs">
                              {kw.naverComp ? (
                                <Badge variant="outline" className={cn('text-[10px]',
                                  kw.naverComp === '낮음' ? 'bg-green-500/10 text-green-500' :
                                  kw.naverComp === '중간' ? 'bg-yellow-500/10 text-yellow-500' :
                                  'bg-red-500/10 text-red-500'
                                )}>{kw.naverComp}</Badge>
                              ) : <span className="text-muted-foreground">-</span>}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-2.5 text-center text-xs">
                          {kw.googleVolume != null && kw.googleVolume > 0 ? (
                            <div>
                              <span className="font-medium">{kw.googleVolume.toLocaleString()}</span>
                              <span className="text-muted-foreground text-[10px] ml-1">/ 월</span>
                            </div>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">{kw.difficulty || '-'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setIdeaTopic(kw.keyword); handleGenerateIdeas(kw.keyword) }}>
                            콘텐츠 만들기
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {savedKeywords.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-4xl mb-4">📁</p>
              <p className="text-sm">고정된 키워드가 없습니다</p>
              <p className="text-xs mt-2">키워드 분석 또는 황금 키워드 결과에서 ☆를 클릭하여 고정하세요</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
