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
  { id: 'youtube', label: 'YouTube', icon: '🎬', color: 'from-[#ff0000] to-[#cc0000]' },
  { id: 'website', label: '웹사이트', icon: '🌐', color: 'from-[#4285f4] to-[#34a853]' },
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

function formatNumber(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`
  if (n >= 1000) return n.toLocaleString()
  return String(n)
}

async function ytApi(action: string, params: Record<string, string | number>) {
  const res = await fetch('/api/analytics/youtube-channel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  })
  return res.json()
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

  // YouTube state
  const [ytChannelInput, setYtChannelInput] = useState('')
  const [ytChannel, setYtChannel] = useState<any>(null)
  const [ytVideos, setYtVideos] = useState<any[]>([])
  const [ytLoading, setYtLoading] = useState(false)

  // Website SEO state
  const [siteUrl, setSiteUrl] = useState('')
  const [siteResult, setSiteResult] = useState<any>(null)
  const [siteLoading, setSiteLoading] = useState(false)

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
    if (selectedPlatform !== 'youtube' && selectedPlatform !== 'website') {
      loadInsights()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatform, selectedCountry])

  async function analyzeYoutubeChannel() {
    if (!ytChannelInput.trim()) return
    setYtLoading(true)
    setYtChannel(null)
    setYtVideos([])

    try {
      let channelId = ''
      const input = ytChannelInput.trim()

      // Extract handle from URL
      if (input.includes('youtube.com')) {
        const handleMatch = input.match(/@([\w-]+)/)
        const idMatch = input.match(/channel\/(UC[\w-]+)/)
        const query = idMatch?.[1] || handleMatch?.[1] || input
        const searchData = await ytApi('searchChannel', { query })
        channelId = searchData.items?.[0]?.id?.channelId || searchData.items?.[0]?.snippet?.channelId || ''
      }

      if (!channelId) {
        const searchData = await ytApi('searchChannel', { query: input })
        channelId = searchData.items?.[0]?.id?.channelId || searchData.items?.[0]?.snippet?.channelId || ''
      }

      if (!channelId) {
        alert('채널을 찾을 수 없습니다')
        return
      }

      // Get channel details
      const channelData = await ytApi('getChannel', { channelId })
      const ch = channelData.items?.[0]
      if (!ch) {
        alert('채널 정보를 가져올 수 없습니다')
        return
      }

      const subscribers = parseInt(ch.statistics?.subscriberCount || '0')
      const viewCount = parseInt(ch.statistics?.viewCount || '0')
      const videoCount = parseInt(ch.statistics?.videoCount || '0')

      setYtChannel({
        id: channelId,
        title: ch.snippet?.title,
        description: ch.snippet?.description,
        thumbnail: ch.snippet?.thumbnails?.default?.url,
        subscribers,
        viewCount,
        videoCount,
        avgViews: videoCount > 0 ? Math.round(viewCount / videoCount) : 0,
      })

      // Get recent videos
      const videosData = await ytApi('getVideos', { channelId, maxResults: 20 })

      if (videosData.items?.length) {
        const videoIds = videosData.items.map((v: any) => v.id?.videoId).filter(Boolean).join(',')
        const statsData = await ytApi('getVideoStats', { videoIds })
        const statsMap = new Map(statsData.items?.map((s: any) => [s.id, s.statistics]) || [])

        setYtVideos(videosData.items.map((v: any) => {
          const stats = statsMap.get(v.id?.videoId) as any || {}
          return {
            id: v.id?.videoId,
            title: v.snippet?.title,
            thumbnail: v.snippet?.thumbnails?.medium?.url,
            url: `https://www.youtube.com/watch?v=${v.id?.videoId}`,
            views: parseInt(stats.viewCount || '0'),
            likes: parseInt(stats.likeCount || '0'),
            comments: parseInt(stats.commentCount || '0'),
            publishedAt: v.snippet?.publishedAt ? new Date(v.snippet.publishedAt).toLocaleDateString('ko-KR') : '',
          }
        }))
      }
    } catch (err) {
      console.error('YouTube analysis error:', err)
      alert('YouTube 분석 오류: ' + String(err))
    } finally {
      setYtLoading(false)
    }
  }

  async function analyzeSite() {
    if (!siteUrl.trim()) return
    setSiteLoading(true)
    try {
      const res = await fetch('/api/seo/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: siteUrl }),
      })
      const data = await res.json()
      setSiteResult(data)
    } catch (err) {
      alert('사이트 분석 오류: ' + String(err))
    } finally {
      setSiteLoading(false)
    }
  }

  // Best performing content
  const bestContent = [...contents].sort((a, b) => b.engagement - a.engagement).slice(0, 3)

  const isMetaPlatform = selectedPlatform === 'instagram' || selectedPlatform === 'facebook' || selectedPlatform === 'threads'

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Country Tabs — only for Meta platforms */}
      {isMetaPlatform && (
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
      )}

      {/* Platform Tabs */}
      <div className="flex gap-2 flex-wrap">
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

      {/* YouTube Tab */}
      {selectedPlatform === 'youtube' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="YouTube 채널 URL 또는 채널 이름"
              value={ytChannelInput}
              onChange={e => setYtChannelInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyzeYoutubeChannel()}
              className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={analyzeYoutubeChannel}
              disabled={ytLoading}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {ytLoading ? '분석 중...' : '채널 분석'}
            </button>
          </div>

          {ytLoading && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mb-2" />
              <p>YouTube 채널 분석 중...</p>
            </div>
          )}

          {ytChannel && !ytLoading && (
            <>
              {/* Channel info card */}
              <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
                {ytChannel.thumbnail && (
                  <img src={ytChannel.thumbnail} alt={ytChannel.title} className="w-16 h-16 rounded-full shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{ytChannel.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {ytChannel.description?.substring(0, 120)}
                  </div>
                </div>
                <div className="ml-auto text-right shrink-0">
                  <div className="text-sm font-bold">{formatNumber(ytChannel.subscribers)} 구독자</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatNumber(ytChannel.videoCount)} 동영상 · {formatNumber(ytChannel.viewCount)} 조회
                  </div>
                </div>
              </div>

              {/* Overview metrics */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: '구독자', value: ytChannel.subscribers },
                  { label: '총 조회수', value: ytChannel.viewCount },
                  { label: '동영상', value: ytChannel.videoCount },
                  { label: '평균 조회수', value: ytChannel.avgViews },
                ].map(m => (
                  <div key={m.label} className="bg-card border border-border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold">{formatNumber(m.value)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent videos */}
              {ytVideos.length > 0 && (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-border font-semibold text-sm">
                    최근 동영상 ({ytVideos.length}개)
                  </div>
                  <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
                    {ytVideos.map(v => (
                      <a
                        key={v.id}
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-3 p-3 hover:bg-accent transition-colors"
                      >
                        {v.thumbnail && (
                          <img src={v.thumbnail} alt={v.title} className="w-28 h-16 object-cover rounded shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm line-clamp-2 font-medium">{v.title}</div>
                          <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                            <span>👁️ {formatNumber(v.views)}</span>
                            <span>❤️ {formatNumber(v.likes)}</span>
                            <span>💬 {formatNumber(v.comments)}</span>
                            <span>{v.publishedAt}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!ytChannel && !ytLoading && (
            <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-lg">
              <p className="text-4xl mb-4">🎬</p>
              <p className="text-sm font-medium">YouTube 채널 URL 또는 이름을 입력하세요</p>
              <p className="text-xs mt-1 opacity-70">구독자, 조회수, 최근 영상 성과를 분석합니다</p>
            </div>
          )}
        </div>
      )}

      {/* Website SEO Tab */}
      {selectedPlatform === 'website' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com"
              value={siteUrl}
              onChange={e => setSiteUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyzeSite()}
              className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={analyzeSite}
              disabled={siteLoading}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {siteLoading ? '분석 중...' : '사이트 분석'}
            </button>
          </div>

          {siteLoading && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mb-2" />
              <p>웹사이트 분석 중...</p>
            </div>
          )}

          {siteResult && !siteLoading && (
            <>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Google SEO', score: siteResult.scores?.google ?? siteResult.googleScore ?? 0 },
                  { label: 'Naver SEO', score: siteResult.scores?.naver ?? siteResult.naverScore ?? 0 },
                  { label: 'GEO', score: siteResult.scores?.geo ?? siteResult.geoScore ?? 0 },
                  { label: '기술 SEO', score: siteResult.scores?.tech ?? siteResult.techScore ?? 0 },
                ].map(s => (
                  <div key={s.label} className="bg-card border border-border rounded-lg p-4 text-center">
                    <div className={cn(
                      'text-2xl font-bold',
                      s.score >= 75 ? 'text-green-500' : s.score >= 50 ? 'text-yellow-500' : 'text-red-500'
                    )}>
                      {s.score}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {(siteResult.issues?.length > 0) && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-3">이슈 목록 ({siteResult.issues.length}개)</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {siteResult.issues.map((issue: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <div className={cn(
                          'w-2 h-2 rounded-full mt-1.5 shrink-0',
                          issue.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                        )} />
                        <span className="flex-1">{issue.message}</span>
                        {issue.engine && (
                          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded shrink-0">
                            {issue.engine}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!siteResult && !siteLoading && (
            <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-lg">
              <p className="text-4xl mb-4">🌐</p>
              <p className="text-sm font-medium">웹사이트 URL을 입력하세요</p>
              <p className="text-xs mt-1 opacity-70">SEO 점수, 기술 분석, 개선 제안을 확인합니다</p>
            </div>
          )}
        </div>
      )}

      {/* Meta Platforms (Instagram / Facebook / Threads) */}
      {isMetaPlatform && (
        <>
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
        </>
      )}
    </div>
  )
}
