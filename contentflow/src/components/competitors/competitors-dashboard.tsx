'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProjectStore } from '@/stores/project-store'
import { AnalyticsLanguageTabs } from '@/components/analytics/language-tabs'

type TabId = 'gap' | 'keywords' | 'serp'
const TABS: { id: TabId; label: string }[] = [
  { id: 'gap', label: '콘텐츠 갭' },
  { id: 'keywords', label: '키워드 순위' },
  { id: 'serp', label: 'SERP 분석' },
]

interface GapItem { topic: string; monthlySearch: number; competitors: string[]; difficulty: string; priority: string }
interface StrengthItem { topic: string; monthlySearch: number; note: string }

interface KeywordRankingItem {
  keyword: string
  myRank: number | null
  competitors: { name: string; rank: number | null }[]
}

interface SerpResult {
  id: string
  title: string
  url: string
  snippet: string
  author: string
}

export function CompetitorsDashboard() {
  const { projects, selectedProjectId } = useProjectStore()
  const project = projects.find(p => p.id === selectedProjectId)

  const [tab, setTab] = useState<TabId>('gap')
  const [selectedLang, setSelectedLang] = useState('ko')
  const [projectUrl, setProjectUrl] = useState(project?.funnel_config?.websiteUrl || '')
  const [competitorUrl, setCompetitorUrl] = useState('')
  const [competitors, setCompetitors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [gaps, setGaps] = useState<GapItem[]>([])
  const [strengths, setStrengths] = useState<StrengthItem[]>([])

  // Keywords tab state
  const [keywordRankings, setKeywordRankings] = useState<KeywordRankingItem[]>([])
  const [kwLoading, setKwLoading] = useState(false)

  // SERP tab state
  const [serpKeyword, setSerpKeyword] = useState('')
  const [serpResults, setSerpResults] = useState<SerpResult[]>([])
  const [serpLoading, setSerpLoading] = useState(false)

  function addCompetitor() {
    if (competitorUrl.trim() && !competitors.includes(competitorUrl.trim())) {
      setCompetitors([...competitors, competitorUrl.trim()])
      setCompetitorUrl('')
    }
  }

  async function runAnalysis() {
    if (!projectUrl || !competitors.length) return
    setLoading(true)
    try {
      const res = await fetch('/api/competitors/gap-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectUrl, competitorUrls: competitors, language: selectedLang }),
      })
      const data = await res.json()
      setGaps(data.gaps || [])
      setStrengths(data.strengths || [])
    } catch { } finally { setLoading(false) }
  }

  async function analyzeKeywordRankings() {
    if (!projectUrl && !competitors.length) return
    setKwLoading(true)
    try {
      // Pull keywords from imported strategy
      const importedKws: string[] = (project as any)?.imported_strategy?.keywords?.slice(0, 10) || []
      const keywordsToAnalyze = [...new Set(importedKws.slice(0, 10))]

      if (keywordsToAnalyze.length === 0) {
        // Use project industry as hint for generic keywords
        keywordsToAnalyze.push(project?.industry || '브랜드 마케팅', '콘텐츠 마케팅', 'SNS 마케팅')
      }

      const res = await fetch('/api/competitors/keyword-rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectUrl: projectUrl || '',
          competitorUrls: competitors,
          keywords: keywordsToAnalyze,
          language: selectedLang,
        }),
      })
      const data = await res.json()
      setKeywordRankings(data.rankings || [])
    } catch (err) {
      console.error('Keyword ranking analysis error:', err)
    } finally {
      setKwLoading(false)
    }
  }

  async function analyzeSERP() {
    if (!serpKeyword.trim()) return
    setSerpLoading(true)
    try {
      const res = await fetch('/api/monitoring/search/google-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: serpKeyword, language: 'ko', maxResults: 10 }),
      })
      const data = await res.json()
      setSerpResults(data.items || [])
    } catch (err) {
      console.error('SERP analysis error:', err)
    } finally {
      setSerpLoading(false)
    }
  }

  function getRankBadge(rank: number | null) {
    if (rank === null) return <span className="text-xs text-muted-foreground">-</span>
    const color = rank <= 3 ? 'text-green-500' : rank <= 10 ? 'text-blue-500' : rank <= 30 ? 'text-yellow-500' : 'text-muted-foreground'
    return <span className={cn('text-xs font-medium', color)}>{rank}위</span>
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Language Tabs */}
      <AnalyticsLanguageTabs selectedLang={selectedLang} onLangChange={setSelectedLang} />

      <div className="flex gap-1 border-b border-border pb-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-1.5 rounded-md text-sm', tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'gap' && (
        <div className="space-y-6">
          {/* Input */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="우리 사이트 URL" value={projectUrl} onChange={e => setProjectUrl(e.target.value)} className="flex-1" />
            </div>
            <div className="flex gap-2">
              <Input placeholder="경쟁사 URL 추가" value={competitorUrl} onChange={e => setCompetitorUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCompetitor()} className="flex-1" />
              <Button variant="outline" onClick={addCompetitor}>추가</Button>
            </div>
            {competitors.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {competitors.map((c, i) => (
                  <span key={i} className="bg-muted px-3 py-1 rounded-full text-xs cursor-pointer hover:bg-destructive/20"
                    onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))}>
                    {c} ×
                  </span>
                ))}
              </div>
            )}
            <Button onClick={runAnalysis} disabled={loading || !projectUrl || !competitors.length}>
              {loading ? '분석 중...' : '갭 분석 실행'}
            </Button>
          </div>

          {/* Results */}
          {gaps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">경쟁사가 다루지만 우리가 안 다루는 주제</h3>
              <div className="space-y-2">
                {gaps.map((gap, i) => (
                  <div key={i} className="bg-card border border-border rounded-md px-3 py-2.5 flex items-center gap-3">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', gap.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500')} />
                    <span className="text-sm flex-1">{gap.topic}</span>
                    <span className="text-xs text-muted-foreground">월검색 {gap.monthlySearch.toLocaleString()}</span>
                    <div className="flex gap-1">
                      {gap.competitors.map(c => (
                        <span key={c} className="bg-muted px-2 py-0.5 rounded text-[10px]">{c}</span>
                      ))}
                    </div>
                    <Button size="sm" className="h-6 text-xs">콘텐츠 만들기 →</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {strengths.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">우리만 다루는 주제 (차별화)</h3>
              <div className="space-y-2">
                {strengths.map((s, i) => (
                  <div key={i} className="bg-card border border-border rounded-md px-3 py-2.5 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-sm flex-1">{s.topic}</span>
                    <span className="text-xs text-muted-foreground">월검색 {s.monthlySearch.toLocaleString()}</span>
                    <span className="text-xs text-green-400">독점</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'keywords' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                AI가 우리 사이트와 경쟁사의 키워드 순위를 추정합니다. 갭 분석 탭에서 URL을 먼저 입력하세요.
              </p>
            </div>
            <Button onClick={analyzeKeywordRankings} disabled={kwLoading || (!projectUrl && !competitors.length)}>
              {kwLoading ? '분석 중...' : '순위 분석'}
            </Button>
          </div>

          {kwLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mb-2" />
              <p>AI가 키워드 순위를 추정하는 중...</p>
            </div>
          ) : keywordRankings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <p className="text-3xl mb-3">🔍</p>
              <p>키워드 순위 분석을 실행하면 결과가 표시됩니다</p>
              <p className="text-xs mt-1 opacity-70">전략의 키워드 또는 AI 추천 키워드를 기반으로 분석합니다</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">키워드</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">우리</th>
                    {competitors.slice(0, 3).map(c => (
                      <th key={c} className="text-center px-4 py-2 font-medium text-muted-foreground truncate max-w-[120px]">
                        {new URL(c.startsWith('http') ? c : 'https://' + c).hostname.replace('www.', '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keywordRankings.map((row, i) => (
                    <tr key={i} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{row.keyword}</td>
                      <td className="text-center px-4 py-3">{getRankBadge(row.myRank)}</td>
                      {competitors.slice(0, 3).map((_, ci) => (
                        <td key={ci} className="text-center px-4 py-3">
                          {getRankBadge(row.competitors[ci]?.rank ?? null)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
                * AI 추정 순위입니다. 실제 순위와 다를 수 있습니다.
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'serp' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="분석할 키워드 입력 (예: 모공 치료)"
              value={serpKeyword}
              onChange={e => setSerpKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyzeSERP()}
              className="flex-1"
            />
            <Button onClick={analyzeSERP} disabled={serpLoading || !serpKeyword.trim()}>
              {serpLoading ? '검색 중...' : 'SERP 분석'}
            </Button>
          </div>

          {serpLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mb-2" />
              <p>Google 검색 결과를 분석하는 중...</p>
            </div>
          ) : serpResults.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <p className="text-3xl mb-3">📊</p>
              <p>키워드를 입력하고 SERP 분석을 실행하세요</p>
              <p className="text-xs mt-1 opacity-70">Google 상위 10개 결과를 크롤링하여 분석합니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">"{serpKeyword}" 검색 결과 TOP {serpResults.length}</p>
              {serpResults.map((result, i) => (
                <div key={result.id} className="bg-card border border-border rounded-lg p-3 flex gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-6 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <a href={result.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-500 hover:underline line-clamp-1">
                      {result.title}
                    </a>
                    <div className="text-xs text-green-600 mt-0.5 truncate">{result.author}</div>
                    {result.snippet && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.snippet}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
