import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { keyword, accessToken, igUserId, maxResults } = await req.json()
  if (!keyword) return Response.json({ error: 'keyword required' }, { status: 400 })

  // Instagram hashtag search requires a business account token
  if (!accessToken || !igUserId) {
    return Response.json({ items: [], message: 'Instagram API requires Meta connection' })
  }

  try {
    // Step 1: Search for hashtag ID
    const hashtagRes = await fetch(
      `https://graph.facebook.com/v21.0/ig_hashtag_search?q=${encodeURIComponent(keyword)}&user_id=${igUserId}&access_token=${accessToken}`
    )
    const hashtagData = await hashtagRes.json()

    if (hashtagData.error || !hashtagData.data?.[0]?.id) {
      return Response.json({
        items: [],
        error: hashtagData.error?.message || 'Hashtag not found',
      })
    }

    const hashtagId = hashtagData.data[0].id

    // Step 2: Get recent media for this hashtag
    const mediaRes = await fetch(
      `https://graph.facebook.com/v21.0/${hashtagId}/recent_media?user_id=${igUserId}&fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&access_token=${accessToken}`
    )
    const mediaData = await mediaRes.json()

    const items = (mediaData.data || [])
      .slice(0, maxResults || 10)
      .map((post: any) => ({
        platform: 'instagram',
        id: post.id,
        title: (post.caption || '').substring(0, 100),
        snippet: post.caption || '',
        author: '',
        url: post.permalink,
        thumbnail: post.media_url,
        engagement: {
          likes: post.like_count || 0,
          comments: post.comments_count || 0,
        },
        publishedAt: post.timestamp,
        language: 'auto',
      }))

    return Response.json({ items })
  } catch (error) {
    return Response.json({ items: [], error: String(error) })
  }
}
