'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/stores/project-store'

const COUNTRIES = [
  { code: 'ko', flag: '🇰🇷', name: '한국' },
  { code: 'en', flag: '🇺🇸', name: '미국' },
  { code: 'th', flag: '🇹🇭', name: '태국' },
  { code: 'vi', flag: '🇻🇳', name: '베트남' },
]

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸', color: 'from-[#f09433] to-[#dc2743]' },
  { id: 'facebook', label: 'Facebook', icon: '👤', color: 'from-[#1877f2] to-[#1877f2]' },
  { id: 'threads', label: 'Threads', icon: '💬', color: 'from-[#000] to-[#333]' },
]

interface ContentMetrics {
  id: string
  title: string
  type: string
  date: string
  reach: number
  impressions: number
  engagement: number
  engagementRate: number
  likes: number
  comments: number
  shares: number
  saves: number
}

export function MetaAnalyticsDashboard() {
  const { projects, selectedProjectId } = useProjectStore()
  const project = projects.find(p => p.id === selectedProjectId)
  const targetLanguages = project?.target_languages || ['ko']

  const [selectedCountry, setSelectedCountry] = useState('ko')
  const [selectedPlatform, setSelectedPlatform] = useState('instagram')
  const [period, setPeriod] = useState('30')

  // Filter countries based on project's target languages
  const availableCountries = COUNTRIES.filter(c => targetLanguages.includes(c.code))

  // Placeholder metrics
  const overviewMetrics = {
    followers: 0,
    followersGrowth: 0,
    totalReach: 0,
    reachGrowth: 0,
    totalEngagement: 0,
    engagementGrowth: 0,
    avgEngagementRate: 0,
    postsCount: 0,
  }

  // Placeholder content list
  const contents: ContentMetrics[] = []

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Country Tabs */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1">
          {availableCountries.map(country => (
            <button
              key={country.code}
              onClick={() => setSelectedCountry(country.code)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-colors',
                selectedCountry === country.code
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              )}
            >
              {country.flag} {country.name}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="bg-muted text-sm rounded-md px-3 py-1.5 border border-border"
          >
            <option value="7">최근 7일</option>
            <option value="30">최근 30일</option>
            <option value="90">최근 90일</option>
          </select>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-2">
        {PLATFORMS.map(platform => (
          <button
            key={platform.id}
            onClick={() => setSelectedPlatform(platform.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
              selectedPlatform === platform.id
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="text-lg">{platform.icon}</span>
            {platform.label}
          </button>
        ))}
      </div>

      {/* Account Info */}
      <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-[#f09433] to-[#dc2743] rounded-full flex items-center justify-center text-white text-lg">
          {selectedPlatform === 'instagram' ? '📸' : selectedPlatform === 'facebook' ? '👤' : '💬'}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">
            {selectedPlatform === 'instagram' ? '@' : ''}
            {selectedCountry === 'ko' ? '연세새봄의원' : selectedCountry === 'en' ? 'yonsei_growth' : 'yonsei_' + selectedCountry}
          </div>
          <div className="text-xs text-muted-foreground">
            {PLATFORMS.find(p => p.id === selectedPlatform)?.label} · {COUNTRIES.find(c => c.code === selectedCountry)?.name}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Meta Graph API 연결 필요</div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '팔로워', value: overviewMetrics.followers, growth: overviewMetrics.followersGrowth },
          { label: '도달', value: overviewMetrics.totalReach, growth: overviewMetrics.reachGrowth },
          { label: '참여', value: overviewMetrics.totalEngagement, growth: overviewMetrics.engagementGrowth },
          { label: '참여율', value: overviewMetrics.avgEngagementRate, growth: 0, suffix: '%' },
        ].map(metric => (
          <div key={metric.label} className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">{metric.label}</div>
            <div className="text-2xl font-bold">
              {metric.value.toLocaleString()}{metric.suffix || ''}
            </div>
            <div className={cn('text-xs', metric.growth >= 0 ? 'text-green-500' : 'text-red-500')}>
              {metric.growth >= 0 ? '▲' : '▼'} {Math.abs(metric.growth)}%
            </div>
          </div>
        ))}
      </div>

      {/* Content Performance Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">콘텐츠별 성과</h3>
          <span className="text-xs text-muted-foreground">{contents.length}개 게시물</span>
        </div>

        {contents.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-4">📱</p>
            <p className="text-sm">Meta 채널을 연결하면 콘텐츠별 성과를 분석할 수 있습니다</p>
            <p className="text-xs mt-2">설정 → 채널 연동에서 Meta 계정을 연결하세요</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">콘텐츠</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">도달</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">노출</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">참여</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">참여율</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">❤️</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">💬</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">🔄</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">🔖</th>
              </tr>
            </thead>
            <tbody>
              {contents.map(content => (
                <tr key={content.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{content.title}</div>
                    <div className="text-xs text-muted-foreground">{content.type} · {content.date}</div>
                  </td>
                  <td className="text-right px-4 py-3">{content.reach.toLocaleString()}</td>
                  <td className="text-right px-4 py-3">{content.impressions.toLocaleString()}</td>
                  <td className="text-right px-4 py-3">{content.engagement.toLocaleString()}</td>
                  <td className="text-right px-4 py-3">{content.engagementRate.toFixed(1)}%</td>
                  <td className="text-right px-4 py-3">{content.likes.toLocaleString()}</td>
                  <td className="text-right px-4 py-3">{content.comments.toLocaleString()}</td>
                  <td className="text-right px-4 py-3">{content.shares.toLocaleString()}</td>
                  <td className="text-right px-4 py-3">{content.saves.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Best Performing Content */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">🏆 최고 성과 콘텐츠</h3>
          <div className="text-center py-8 text-muted-foreground text-xs">
            데이터 연동 후 표시됩니다
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">📈 성장 트렌드</h3>
          <div className="text-center py-8 text-muted-foreground text-xs">
            데이터 연동 후 표시됩니다
          </div>
        </div>
      </div>
    </div>
  )
}
