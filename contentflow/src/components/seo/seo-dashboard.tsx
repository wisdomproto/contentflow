'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScoreGauge } from './score-gauge'
import { AuditForm } from './audit-form'
import { IssuesList } from './issues-list'
import { useProjectStore } from '@/stores/project-store'
import { calculateNaverSeoScore } from '@/lib/seo-scorer'
import { AnalyticsLanguageTabs } from '@/components/analytics/language-tabs'

type TabId = 'audit' | 'content' | 'geo' | 'schema'

const TABS: { id: TabId; label: string }[] = [
  { id: 'audit', label: '사이트 감사' },
  { id: 'content', label: '콘텐츠 SEO' },
  { id: 'geo', label: 'GEO 분석' },
  { id: 'schema', label: 'Schema 마크업' },
]

interface AuditResult {
  url: string
  scores: { google: number; naver: number; geo: number; tech: number }
  issues: Array<{ severity: string; message: string; engine: string; fix_action?: string }>
  meta: Record<string, unknown>
}

interface ContentSeoRow {
  id: string
  title: string
  seoTitle: string
  score: number
  issues: string[]
}

export function SeoDashboard() {
  const { selectedProjectId, blogContents, blogCards, getBlogCards } = useProjectStore()
  const [activeTab, setActiveTab] = useState<TabId>('audit')
  const [selectedLang, setSelectedLang] = useState('ko')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)

  // --- Content SEO tab ---
  const [contentRows, setContentRows] = useState<ContentSeoRow[]>([])
  const [contentLoading, setContentLoading] = useState(false)

  // --- GEO tab ---
  const [geoUrl, setGeoUrl] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoResult, setGeoResult] = useState('')

  // --- Schema tab ---
  const [schemaContent, setSchemaContent] = useState('')
  const [schemaType, setSchemaType] = useState('Article')
  const [schemaResult, setSchemaResult] = useState('')
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [schemaCopied, setSchemaCopied] = useState(false)

  async function handleAudit(url: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/seo/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // --- Content SEO: analyze blog contents ---
  useEffect(() => {
    if (activeTab !== 'content') return
    analyzeContentSeo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, blogContents])

  function analyzeContentSeo() {
    if (!blogContents.length) {
      setContentRows([])
      return
    }
    setContentLoading(true)
    const rows: ContentSeoRow[] = []
    for (const bc of blogContents) {
      const cards = getBlogCards(bc.id)
      const naverKeywords = bc.naver_keywords
        ? {
            primary: (bc.naver_keywords as any).primary || bc.primary_keyword || '',
            secondary: (bc.naver_keywords as any).secondary || bc.secondary_keywords || [],
          }
        : { primary: bc.primary_keyword || '', secondary: bc.secondary_keywords || [] }

      const { score, details } = calculateNaverSeoScore(bc.seo_title || bc.title || '', cards, naverKeywords)
      const issueDetails = details.filter(d => d.score < d.maxScore * 0.6).map(d => d.message)

      rows.push({
        id: bc.id,
        title: bc.title || bc.seo_title || '(제목 없음)',
        seoTitle: bc.seo_title || '',
        score,
        issues: issueDetails.slice(0, 3),
      })
    }
    setContentRows(rows.sort((a, b) => a.score - b.score))
    setContentLoading(false)
  }

  // --- GEO analysis ---
  async function analyzeGeo() {
    if (!geoUrl.trim()) return
    setGeoLoading(true)
    setGeoResult('')
    try {
      // Crawl and analyze with AI
      const res = await fetch('/api/ai/strategy/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: geoUrl }),
      })
      const crawlData = await res.json()
      const pageContent = crawlData.analysis || crawlData.text || ''

      const prompt = `You are a GEO (Generative Engine Optimization) expert. Analyze this web page for AI search engine citation readiness.

URL: ${geoUrl}
Page content summary: ${pageContent.substring(0, 3000)}

Analyze and provide scores + actionable recommendations in Korean:

1. **GEO 종합 점수** (0-100) — AI 검색엔진 인용 가능성
2. **구조화 데이터 분석** — Schema.org 마크업 존재 여부, 추천 타입
3. **인용 적합성** — 질문-답변 구조, 명확한 정의문, 간결한 요약문 존재 여부
4. **E-E-A-T 신호** — 저자 정보, 전문성 근거, 출처 인용, 날짜 표시
5. **콘텐츠 구조** — 헤딩 계층, 리스트, 테이블, 통계 활용도
6. **경쟁 분석** — 이 주제에서 AI Overview에 인용될 가능성 vs 경쟁 콘텐츠
7. **즉시 개선 항목** (5개) — 구체적 액션 아이템`

      const streamRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: 'gemini-2.5-flash' }),
      })
      const reader = streamRes.body?.getReader()
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
      setGeoResult(fullText)
    } catch (err) {
      console.error('GEO analysis error:', err)
      setGeoResult('GEO 분석 중 오류가 발생했습니다: ' + (err as Error).message)
    } finally {
      setGeoLoading(false)
    }
  }

  // --- Schema markup generation ---
  async function generateSchema() {
    if (!schemaContent.trim()) return
    setSchemaLoading(true)
    setSchemaResult('')
    try {
      const res = await fetch('/api/seo/schema-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: schemaContent, schemaType, language: selectedLang }),
      })
      const data = await res.json()
      setSchemaResult(data.schema || '')
    } catch (err) {
      console.error('Schema generation error:', err)
    } finally {
      setSchemaLoading(false)
    }
  }

  async function copySchema() {
    if (!schemaResult) return
    await navigator.clipboard.writeText(schemaResult)
    setSchemaCopied(true)
    setTimeout(() => setSchemaCopied(false), 2000)
  }

  function getScoreColor(score: number) {
    if (score >= 75) return 'text-green-500'
    if (score >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  function getScoreBg(score: number) {
    if (score >= 75) return 'bg-green-500/10 border-green-500/30'
    if (score >= 50) return 'bg-yellow-500/10 border-yellow-500/30'
    return 'bg-red-500/10 border-red-500/30'
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Language Tabs */}
      <AnalyticsLanguageTabs selectedLang={selectedLang} onLangChange={setSelectedLang} />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm transition-colors',
              activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 사이트 감사 ── */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <AuditForm onAudit={handleAudit} loading={loading} />

          {result && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-lg p-4 flex justify-center">
                  <ScoreGauge score={result.scores.google} label="Google SEO" sublabel={result.scores.google >= 75 ? '양호' : '개선 필요'} />
                </div>
                <div className="bg-card border border-border rounded-lg p-4 flex justify-center">
                  <ScoreGauge score={result.scores.naver} label="Naver SEO" sublabel={result.scores.naver >= 75 ? '양호' : '개선 필요'} />
                </div>
                <div className="bg-card border border-border rounded-lg p-4 flex justify-center">
                  <ScoreGauge score={result.scores.geo} label="GEO 점수" sublabel={result.scores.geo >= 75 ? '양호' : '보통'} />
                </div>
                <div className="bg-card border border-border rounded-lg p-4 flex justify-center">
                  <ScoreGauge score={result.scores.tech} label="기술 SEO" sublabel={result.scores.tech >= 75 ? '양호' : '개선 필요'} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">이슈 목록</h3>
                <IssuesList issues={result.issues} />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 콘텐츠 SEO ── */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              프로젝트의 블로그 콘텐츠별 네이버 SEO 점수를 분석합니다.
            </p>
            <Button variant="outline" size="sm" onClick={analyzeContentSeo} disabled={contentLoading}>
              {contentLoading ? '분석 중...' : '새로고침'}
            </Button>
          </div>

          {contentLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mb-2" />
              <p>SEO 점수 계산 중...</p>
            </div>
          ) : contentRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-3xl mb-3">📝</p>
              <p className="text-sm">블로그 콘텐츠가 없습니다</p>
              <p className="text-xs mt-1 opacity-70">콘텐츠를 생성하면 SEO 점수를 확인할 수 있습니다</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">콘텐츠</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground w-24">SEO 점수</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">주요 이슈</th>
                  </tr>
                </thead>
                <tbody>
                  {contentRows.map(row => (
                    <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium line-clamp-1">{row.title}</div>
                        {row.seoTitle && row.seoTitle !== row.title && (
                          <div className="text-xs text-muted-foreground truncate">SEO: {row.seoTitle}</div>
                        )}
                      </td>
                      <td className="text-center px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center justify-center w-12 h-12 rounded-full border text-sm font-bold',
                          getScoreBg(row.score)
                        )}>
                          <span className={getScoreColor(row.score)}>{row.score}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.issues.length === 0 ? (
                          <span className="text-xs text-green-500">이슈 없음</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {row.issues.map((issue, i) => (
                              <li key={i} className="text-xs text-muted-foreground">• {issue}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── GEO 분석 ── */}
      {activeTab === 'geo' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2">🌐 GEO (Generative Engine Optimization)</h3>
            <p className="text-xs text-muted-foreground">AI 검색엔진(Google AI Overview, ChatGPT, Perplexity)에서 콘텐츠가 인용되도록 최적화합니다.</p>
          </div>

          <div className="flex gap-2">
            <input
              value={geoUrl}
              onChange={e => setGeoUrl(e.target.value)}
              placeholder="분석할 URL 입력 (예: https://example.com/blog/post)"
              className="flex-1 bg-muted border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={e => e.key === 'Enter' && analyzeGeo()}
            />
            <Button onClick={analyzeGeo} disabled={geoLoading || !geoUrl.trim()}>
              {geoLoading ? '분석 중...' : 'GEO 분석'}
            </Button>
          </div>

          {geoLoading && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mb-2" />
              <p>AI 인용 최적화 분석 중...</p>
            </div>
          )}

          {geoResult && !geoLoading && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: geoResult.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
              />
            </div>
          )}

          {!geoResult && !geoLoading && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">GEO 체크리스트</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { title: '구조화된 데이터', desc: 'Schema.org JSON-LD (FAQ, HowTo, Article)', icon: '📋' },
                  { title: '인용 가능한 문장', desc: '명확한 정의/답변 형태의 문장 (2-3줄)', icon: '💬' },
                  { title: 'E-E-A-T 신호', desc: '전문성, 경험, 권위성, 신뢰성 요소', icon: '🏆' },
                  { title: '질문-답변 구조', desc: 'H2/H3에 질문, 바로 아래 간결한 답변', icon: '❓' },
                  { title: '통계/수치 포함', desc: '구체적 데이터, 연구 결과, 비율', icon: '📊' },
                  { title: '최신성', desc: '날짜 표시, 주기적 업데이트, 최신 정보', icon: '🕐' },
                ].map((item, i) => (
                  <div key={i} className="bg-muted/50 border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{item.icon}</span>
                      <span className="text-sm font-medium">{item.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Schema 마크업 ── */}
      {activeTab === 'schema' && (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <label className="text-sm text-muted-foreground shrink-0">Schema 타입:</label>
            <select
              value={schemaType}
              onChange={e => setSchemaType(e.target.value)}
              className="bg-muted text-sm rounded-md px-3 py-1.5 border border-border"
            >
              <option value="Article">Article</option>
              <option value="BlogPosting">BlogPosting</option>
              <option value="MedicalWebPage">MedicalWebPage</option>
              <option value="FAQPage">FAQPage</option>
              <option value="HowTo">HowTo</option>
              <option value="LocalBusiness">LocalBusiness</option>
              <option value="Product">Product</option>
            </select>
          </div>

          <textarea
            value={schemaContent}
            onChange={e => setSchemaContent(e.target.value)}
            placeholder="Schema 마크업을 생성할 콘텐츠를 입력하세요 (제목, 본문 내용 등)..."
            className="w-full h-40 bg-muted border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <div className="flex gap-2">
            <Button onClick={generateSchema} disabled={schemaLoading || !schemaContent.trim()}>
              {schemaLoading ? 'Schema 생성 중...' : 'Schema 생성'}
            </Button>
            {schemaResult && (
              <Button variant="outline" onClick={copySchema}>
                {schemaCopied ? '복사됨!' : '복사'}
              </Button>
            )}
          </div>

          {schemaLoading && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mb-2" />
              <p>JSON-LD Schema 생성 중...</p>
            </div>
          )}

          {schemaResult && !schemaLoading && (
            <div className="relative">
              <div className="bg-muted border border-border rounded-lg p-4 overflow-auto max-h-80">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">{schemaResult}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
