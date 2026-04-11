'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type TabId = 'gap' | 'keywords' | 'serp'
const TABS: { id: TabId; label: string }[] = [
  { id: 'gap', label: '콘텐츠 갭' },
  { id: 'keywords', label: '키워드 순위' },
  { id: 'serp', label: 'SERP 분석' },
]

interface GapItem { topic: string; monthlySearch: number; competitors: string[]; difficulty: string; priority: string }
interface StrengthItem { topic: string; monthlySearch: number; note: string }

export function CompetitorsDashboard() {
  const [tab, setTab] = useState<TabId>('gap')
  const [projectUrl, setProjectUrl] = useState('')
  const [competitorUrl, setCompetitorUrl] = useState('')
  const [competitors, setCompetitors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [gaps, setGaps] = useState<GapItem[]>([])
  const [strengths, setStrengths] = useState<StrengthItem[]>([])

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
        body: JSON.stringify({ projectUrl, competitorUrls: competitors }),
      })
      const data = await res.json()
      setGaps(data.gaps || [])
      setStrengths(data.strengths || [])
    } catch { } finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex gap-1 border-b border-border pb-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-1.5 rounded-md text-sm', tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
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
                    <div className={cn('w-2 h-2 rounded-full', gap.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500')} />
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
                    <div className="w-2 h-2 rounded-full bg-green-500" />
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
        <div className="text-center py-12 text-muted-foreground text-sm">키워드 순위 비교 — DataForSEO 연동 후 표시</div>
      )}
      {tab === 'serp' && (
        <div className="text-center py-12 text-muted-foreground text-sm">SERP 분석 — DataForSEO 연동 후 표시</div>
      )}
    </div>
  )
}
