'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { AnalyticsLanguageTabs } from './language-tabs'
import { AnalyticsDashboard } from './analytics-dashboard'
import { SeoDashboard } from '@/components/seo/seo-dashboard'

type TabId = 'ga4' | 'seo'

export function SiteAnalysisDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('ga4')
  const [selectedLang, setSelectedLang] = useState('ko')

  return (
    <div className="p-6 max-w-6xl space-y-4">
      {/* Language Tabs */}
      <AnalyticsLanguageTabs selectedLang={selectedLang} onLangChange={setSelectedLang} />

      {/* Sub Tabs */}
      <div className="flex gap-1 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab('ga4')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors rounded-t-md',
            activeTab === 'ga4'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          GA4 트래픽
        </button>
        <button
          onClick={() => setActiveTab('seo')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors rounded-t-md',
            activeTab === 'seo'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          SEO 분석
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'ga4' && <AnalyticsDashboard />}
      {activeTab === 'seo' && <SeoDashboard />}
    </div>
  )
}
