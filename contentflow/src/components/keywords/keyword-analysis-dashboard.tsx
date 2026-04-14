'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useProjectStore } from '@/stores/project-store'
import { AnalyticsLanguageTabs } from '@/components/analytics/language-tabs'
import { fetchAiGenerate } from '@/lib/sse-stream-parser'

interface KeywordItem {
  keyword: string
  category: string
  searchIntent: 'informational' | 'commercial' | 'transactional' | 'navigational'
  priority: 'high' | 'medium' | 'low'
  estimatedVolume?: string
  difficulty?: string
  used?: boolean  // already used in content
}

interface KeywordGroup {
  category: string
  keywords: KeywordItem[]
}

export function KeywordAnalysisDashboard() {
  const { projects, selectedProjectId, contents } = useProjectStore()
  const project = projects.find(p => p.id === selectedProjectId)

  const [generating, setGenerating] = useState(false)
  const [keywordGroups, setKeywordGroups] = useState<KeywordGroup[]>([])
  const [seedKeyword, setSeedKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedLang, setSelectedLang] = useState('ko')

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
        setKeywordGroups(parsed.groups || [])
      }
    } catch (err) {
      console.error('Keyword generation error:', err)
    } finally {
      setGenerating(false)
    }
  }

  const allKeywords = keywordGroups.flatMap(g => g.keywords.map(k => ({ ...k, category: g.category })))
  const filteredKeywords = selectedCategory
    ? allKeywords.filter(k => k.category === selectedCategory)
    : allKeywords

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

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Language Tabs */}
      <AnalyticsLanguageTabs selectedLang={selectedLang} onLangChange={setSelectedLang} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">키워드 분석</h2>
          <p className="text-xs text-muted-foreground mt-1">
            프로젝트 정보를 기반으로 SEO 키워드를 분석하고 관리합니다
          </p>
        </div>
      </div>

      {/* Generation Controls */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Input
            value={seedKeyword}
            onChange={e => setSeedKeyword(e.target.value)}
            placeholder={seedPlaceholder}
            className="flex-1 text-sm"
          />
          <Button onClick={generateKeywords} disabled={generating}>
            {generating ? '분석 중...' : '✨ AI 키워드 분석'}
          </Button>
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
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">키워드</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">카테고리</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">검색 의도</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">우선순위</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">예상 볼륨</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">난이도</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeywords.map((kw, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30">
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
                    <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">{kw.difficulty || '-'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]">
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
  )
}
