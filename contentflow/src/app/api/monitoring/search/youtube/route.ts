import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { keyword, language, maxResults } = await req.json()
  if (!keyword) return Response.json({ error: 'keyword required' }, { status: 400 })

  const params = new URLSearchParams({
    part: 'snippet',
    q: keyword,
    type: 'video',
    maxResults: String(maxResults || 10),
    order: 'relevance',
    relevanceLanguage: language || 'ko',
  })

  const youtubeApiKey = process.env.YOUTUBE_API_KEY
  if (youtubeApiKey) {
    params.set('key', youtubeApiKey)
  }

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
    const data = await res.json()

    if (data.error) {
      return await fallbackYoutubeSearch(keyword, language)
    }

    const items = (data.items || []).map((item: any) => ({
      platform: 'youtube',
      id: item.id?.videoId,
      title: item.snippet?.title,
      snippet: item.snippet?.description,
      author: item.snippet?.channelTitle,
      url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
      thumbnail: item.snippet?.thumbnails?.medium?.url,
      publishedAt: item.snippet?.publishedAt,
      language: language || 'ko',
    }))

    return Response.json({ items })
  } catch {
    return await fallbackYoutubeSearch(keyword, language)
  }
}

async function fallbackYoutubeSearch(keyword: string, language: string) {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`
    const res = await fetch(searchUrl, {
      headers: { 'Accept-Language': language === 'ko' ? 'ko-KR,ko' : 'en-US,en' },
    })
    const html = await res.text()

    const match = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/)
    if (!match) return Response.json({ items: [], fallback: true })

    const data = JSON.parse(match[1])
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || []

    const items = contents
      .filter((c: any) => c.videoRenderer)
      .slice(0, 10)
      .map((c: any) => {
        const v = c.videoRenderer
        return {
          platform: 'youtube',
          id: v.videoId,
          title: v.title?.runs?.[0]?.text,
          snippet: v.descriptionSnippet?.runs?.map((r: any) => r.text).join('') || '',
          author: v.ownerText?.runs?.[0]?.text,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          thumbnail: v.thumbnail?.thumbnails?.[0]?.url,
          views: v.viewCountText?.simpleText,
          publishedAt: v.publishedTimeText?.simpleText,
          language: language || 'ko',
        }
      })

    return Response.json({ items, fallback: true })
  } catch {
    return Response.json({ items: [], error: 'YouTube search failed' })
  }
}
