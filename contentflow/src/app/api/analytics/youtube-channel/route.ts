import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { action, params } = await req.json()
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return Response.json({ error: 'YouTube API key not configured' }, { status: 500 })

  try {
    let url = ''
    if (action === 'searchChannel') {
      url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(params.query)}&type=channel&maxResults=1&key=${apiKey}`
    } else if (action === 'getChannel') {
      url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${params.channelId}&key=${apiKey}`
    } else if (action === 'getVideos') {
      url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${params.channelId}&order=date&maxResults=${params.maxResults || 20}&type=video&key=${apiKey}`
    } else if (action === 'getVideoStats') {
      url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${params.videoIds}&key=${apiKey}`
    } else {
      return Response.json({ error: 'Unknown action' }, { status: 400 })
    }

    const res = await fetch(url)
    const data = await res.json()
    return Response.json(data)
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
