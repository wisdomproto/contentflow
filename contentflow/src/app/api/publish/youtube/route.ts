import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { title, description, tags, categoryId, privacyStatus, accessToken, videoUrl, scheduledAt } = await req.json()

  if (!accessToken || !videoUrl) {
    return Response.json({ error: 'Access token and video URL required' }, { status: 400 })
  }

  try {
    const videoResponse = await fetch(videoUrl)
    const videoBlob = await videoResponse.blob()

    const metadataResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: { title, description, tags, categoryId: categoryId || '22' },
          status: {
            privacyStatus: scheduledAt ? 'private' : (privacyStatus || 'public'),
            ...(scheduledAt && { publishAt: scheduledAt }),
          },
        }),
      }
    )

    const uploadUrl = metadataResponse.headers.get('location')
    if (!uploadUrl) return Response.json({ error: 'Failed to get upload URL' }, { status: 500 })

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': videoBlob.type },
      body: videoBlob,
    })

    const result = await uploadResponse.json()
    return Response.json({ success: true, videoId: result.id, url: `https://www.youtube.com/watch?v=${result.id}` })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
