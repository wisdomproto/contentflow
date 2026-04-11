'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ScoreGauge } from './score-gauge'
import { AuditForm } from './audit-form'
import { IssuesList } from './issues-list'

type TabId = 'audit' | 'content' | 'keywords' | 'schema'

const TABS: { id: TabId; label: string }[] = [
  { id: 'audit', label: '사이트 감사' },
  { id: 'content', label: '콘텐츠 SEO' },
  { id: 'keywords', label: '키워드 트래킹' },
  { id: 'schema', label: 'Schema 마크업' },
]

interface AuditResult {
  url: string
  scores: { google: number; naver: number; geo: number; tech: number }
  issues: Array<{ severity: string; message: string; engine: string; fix_action?: string }>
  meta: Record<string, unknown>
}

export function SeoDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('audit')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)

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

  return (
    <div className="p-6 max-w-5xl space-y-6">
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

      {activeTab === 'content' && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          콘텐츠를 선택하면 개별 SEO 점수를 확인할 수 있습니다
        </div>
      )}

      {activeTab === 'keywords' && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          키워드 순위 트래킹 — 데이터 수집 후 표시됩니다
        </div>
      )}

      {activeTab === 'schema' && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          콘텐츠를 선택하면 Schema 마크업을 자동 생성할 수 있습니다
        </div>
      )}
    </div>
  )
}
