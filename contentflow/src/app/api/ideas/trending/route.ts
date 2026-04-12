import { NextRequest } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const { keywords, language, period } = await req.json()
  if (!keywords?.length) return Response.json({ youtube: [], naverTrends: [], googleTrends: [] })

  const results: any = { youtube: [], naverTrends: [], googleTrends: [] }

  // 1. YouTube — search trending videos for each keyword
  const youtubeApiKey = process.env.YOUTUBE_API_KEY
  if (youtubeApiKey) {
    for (const keyword of keywords.slice(0, 3)) { // limit to 3 keywords
      try {
        // Search for popular recent videos
        const publishedAfter = new Date()
        if (period === 'week') publishedAfter.setDate(publishedAfter.getDate() - 7)
        else if (period === 'month') publishedAfter.setDate(publishedAfter.getDate() - 30)
        else publishedAfter.setDate(publishedAfter.getDate() - 90)

        const searchParams = new URLSearchParams({
          part: 'snippet',
          q: keyword,
          type: 'video',
          maxResults: '5',
          order: 'viewCount',
          publishedAfter: publishedAfter.toISOString(),
          relevanceLanguage: language || 'ko',
          key: youtubeApiKey,
        })

        const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`)
        const searchData = await searchRes.json()

        if (searchData.items?.length) {
          // Get video statistics
          const videoIds = searchData.items.map((item: any) => item.id?.videoId).filter(Boolean).join(',')
          const statsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${youtubeApiKey}`
          )
          const statsData = await statsRes.json()

          for (const video of statsData.items || []) {
            const views = parseInt(video.statistics?.viewCount || '0')
            results.youtube.push({
              id: video.id,
              title: video.snippet?.title,
              channelTitle: video.snippet?.channelTitle,
              thumbnail: video.snippet?.thumbnails?.medium?.url,
              url: `https://www.youtube.com/watch?v=${video.id}`,
              views: formatViews(views),
              viewCount: views,
              likes: parseInt(video.statistics?.likeCount || '0'),
              comments: parseInt(video.statistics?.commentCount || '0'),
              publishedAt: video.snippet?.publishedAt,
              keyword,
            })
          }
        }
      } catch (err) {
        console.error('YouTube trending error:', err)
      }
    }

    // Sort by view count descending
    results.youtube.sort((a: any, b: any) => b.viewCount - a.viewCount)
  }

  // 2. Naver DataLab — search trends (Korean only)
  if (language === 'ko' || !language) {
    const naverClientId = process.env.NAVER_API_CUSTOMER_ID
    const naverSecret = process.env.NAVER_API_SECRET_KEY
    const naverLicense = process.env.NAVER_API_LICENSE_KEY

    if (naverLicense && naverSecret && naverClientId) {
      // Use Naver Search Ad API for keyword stats
      for (const keyword of keywords.slice(0, 5)) {
        try {
          const timestamp = String(Date.now())
          const method = 'GET'
          const uri = '/keywordstool'
          const hmac = crypto.createHmac('sha256', naverSecret)
          hmac.update(`${timestamp}.${method}.${uri}`)
          const signature = hmac.digest('base64')
          const apiUrl = `https://api.searchad.naver.com${uri}?hintKeywords=${encodeURIComponent(keyword)}&showDetail=1`

          const res = await fetch(apiUrl, {
            cache: 'no-store',
            headers: {
              'X-Timestamp': timestamp,
              'X-API-KEY': naverLicense,
              'X-Customer': naverClientId,
              'X-Signature': signature,
            },
          })

          if (res.ok) {
            const data = await res.json()
            const keywordList = data.keywordList || []
            for (const kw of keywordList.slice(0, 3)) {
              results.naverTrends.push({
                keyword: kw.relKeyword,
                monthlyPcQcCnt: kw.monthlyPcQcCnt,
                monthlyMobileQcCnt: kw.monthlyMobileQcCnt,
                totalSearches: (parseInt(kw.monthlyPcQcCnt) || 0) + (parseInt(kw.monthlyMobileQcCnt) || 0),
                compIdx: kw.compIdx,
                trend: 'data',
              })
            }
          }
        } catch (err) {
          console.error('Naver trend error:', err)
        }
      }
    }

    // Fallback: if no Naver API, generate estimates
    if (results.naverTrends.length === 0) {
      for (const keyword of keywords) {
        results.naverTrends.push({
          keyword,
          totalSearches: 0,
          trend: 'estimated',
          change: '',
        })
      }
    }
  }

  // 3. Google Trends — estimate using AI (no official API)
  // Just return keywords with placeholder trend data
  results.googleTrends = keywords.map((kw: string) => ({
    keyword: kw,
    trend: 'rising',
    change: '',
  }))

  return Response.json(results)
}

function formatViews(views: number): string {
  if (views >= 100000000) return `${(views / 100000000).toFixed(1)}억`
  if (views >= 10000) return `${(views / 10000).toFixed(1)}만`
  if (views >= 1000) return `${views.toLocaleString()}`
  return String(views)
}
