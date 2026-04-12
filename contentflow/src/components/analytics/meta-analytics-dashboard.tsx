'use client'

import { useState, useEffect } from 'react'
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

const DEFAULT_METRICS = {
  followers: 0,
  followersGrowth: 0,
  totalReach: 0,
  reachGrowth: 0,
  totalEngagement: 0,
  engagementGrowth: 0,
  avgEngagementRate: 0,
  postsCount: 0,
}

export function MetaAnalyticsDashboard() {
  const { projects, selectedProjectId } = useProjectStore()
  const project = projects.find(p => p.id === selectedProjectId)
  const targetLanguages = project?.target_languages || ['ko']

  const [selectedCountry, setSelectedCountry] = useState('ko')
  const [selectedPlatform, setSelectedPlatform] = useState('instagram')
  const [period, setPeriod] = useState('30')
  const [loading, setLoading] = useState(false)
  const [hasCredentials, setHasCredentials] = useState(false)
  const [overviewMetrics, setOverviewMetrics] = useState(DEFAULT_METRICS)
  const [contents, setContents] = useState<ContentMetrics[]>([])

  // Filter countries based on project's target languages
  const availableCountries = COUNTRIES.filter(c => targetLanguages.includes(c.code))

  async function loadInsights() {
    const projectId = localStorage.getItem('cf_selectedProjectId')
    const metaCredsRaw = projectId ? localStorage.getItem(`meta_credentials_${projectId}`) : null
    if (!metaCredsRaw) {
      setHasCredentials(false)
      return
    }
    setHasCredentials(true)
    setLoading(true)
    try {
      const metaCreds = JSON.parse(metaCredsRaw)
      const page = metaCreds.pages?.[0]
      if (!page) return

      if (selectedPlatform === 'instagram' && page.instagram?.id) {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${page.instagram.id}?fields=followers_count,media_count,media{id,caption,media_type,permalink,timestamp,like_count,comments_count,media_url}&access_token=${page.pageAccessToken}`
        )
        const data = await res.json()

        setOverviewMetrics({
          ...DEFAULT_METRICS,
          followers: data.followers_count || 0,
          postsCount: data.media_count || 0,
        })

        const mediaItems: ContentMetrics[] = (data.media?.data || []).slice(0, 20).map((post: any) => ({
          id: post.id,
          title: (post.caption || '').substring(0, 60),
          type: post.media_type,
          date: post.timestamp ? new Date(post.timestamp).toLocaleDateString('ko-KR') : '',
          reach: 0,
          impressions: 0,
          engagement: (post.like_count || 0) + (post.comments_count || 0),
          engagementRate: 0,
          likes: post.like_count || 0,
          comments: post.comments_count || 0,
          shares: 0,
          saves: 0,
        }))
        setContents(mediaItems)

        const totalEng = mediaItems.reduce((sum, c) => sum + c.engagement, 0)
        setOverviewMetrics(prev => ({
          ...prev,
          totalEngagement: totalEng,
          avgEngagementRate: prev.followers > 0 ? parseFloat(((totalEng / (mediaItems.length || 1) / prev.followers) * 100).toFixed(1)) : 0,
        }))
      } else if (selectedPlatform === 'facebook') {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${page.id}?fields=fan_count,posts{id,message,created_time,shares,likes.summary(true),comments.summary(true)}&access_token=${page.pageAccessToken}`
        )
        const data = await res.json()

        const postItems: ContentMetrics[] = (data.posts?.data || []).slice(0, 20).map((post: any) => ({
          id: post.id,
          title: (post.message || '').substring(0, 60),
          type: 'POST',
          date: post.created_time ? new Date(post.created_time).toLocaleDateString('ko-KR') : '',
          reach: 0,
          impressions: 0,
          engagement: (post.likes?.summary?.total_count || 0) + (post.comments?.summary?.total_count || 0),
          engagementRate: 0,
          likes: post.likes?.summary?.total_count || 0,
          comments: post.comments?.summary?.total_count || 0,
          shares: post.shares?.count || 0,
          saves: 0,
        }))
        setContents(postItems)

        const totalEng = postItems.reduce((sum, c) => sum + c.engagement, 0)
        const fanCount = data.fan_count || 0
        setOverviewMetrics({
          ...DEFAULT_METRICS,
          followers: fanCount,
          postsCount: postItems.length,
          totalEngagement: totalEng,
          avgEngagementRate: fanCount > 0 ? parseFloat(((totalEng / (postItems.length || 1) / fanCount) * 100).toFixed(1)) : 0,
        })
      } else {
        // Threads — no public API yet
        setContents([])
        setOverviewMetrics(DEFAULT_METRICS)
      }
    } catch (err) {
      console.error('Meta insights error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInsights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatform, selectedCountry])

  // Best performing content
  const bestContent = [...contents].sort((a, b) => b.engagement - a.engagement).slice(0, 3)

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
        {loading ? (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
            데이터 불러오는 중...
          </div>
        ) : !hasCredentials ? (
          <div className="text-xs text-orange-500">Meta 연결 필요 — 설정 → 채널 연동</div>
        ) : (
          <div className="text-xs text-green-500">연결됨</div>
        )}
      </div>

      {!hasCredentials ? (
        <div className="bg-card border border-border rounded-lg text-center py-16 text-muted-foreground space-y-2">
          <p className="text-4xl">🔗</p>
          <p className="text-sm font-medium">Meta 계정을 연결해 주세요</p>
          <p className="text-xs">설정 → 채널 연동에서 Meta(Instagram/Facebook) 계정을 연결하면<br />실제 인사이트 데이터를 확인할 수 있습니다.</p>
        </div>
      ) : (
        <>
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

            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mb-2" />
                <p>인사이트 데이터를 불러오는 중...</p>
              </div>
            ) : contents.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-4xl mb-4">📱</p>
                <p className="text-sm">게시물이 없거나 데이터를 불러올 수 없습니다</p>
                <p className="text-xs mt-2 opacity-70">
                  {selectedPlatform === 'threads' ? 'Threads API는 아직 공개되지 않았습니다' : '게시물이 존재하는지 확인해 주세요'}
                </p>
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
                        <div className="font-medium line-clamp-1">{content.title || '(캡션 없음)'}</div>
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
              {bestContent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  데이터 연동 후 표시됩니다
                </div>
              ) : (
                <div className="space-y-2">
                  {bestContent.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                      <span className="flex-1 line-clamp-1 text-xs">{c.title || '(캡션 없음)'}</span>
                      <span className="text-xs text-muted-foreground shrink-0">❤️ {c.likes} 💬 {c.comments}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">📈 성장 트렌드</h3>
              {contents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  데이터 연동 후 표시됩니다
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">총 게시물</span>
                    <span className="font-medium">{overviewMetrics.postsCount.toLocaleString()}개</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">총 참여수</span>
                    <span className="font-medium">{overviewMetrics.totalEngagement.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">평균 참여율</span>
                    <span className="font-medium">{overviewMetrics.avgEngagementRate}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">게시물당 평균 참여</span>
                    <span className="font-medium">
                      {contents.length > 0 ? Math.round(overviewMetrics.totalEngagement / contents.length).toLocaleString() : 0}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
