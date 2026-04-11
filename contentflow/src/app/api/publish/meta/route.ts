import { NextRequest } from 'next/server'

const GRAPH_URL = 'https://graph.facebook.com/v21.0'

export async function POST(req: NextRequest) {
  const { platform, accessToken, pageId, caption, imageUrl, scheduledAt } = await req.json()

  if (!accessToken || !pageId) {
    return Response.json({ error: 'Meta access token and page ID required' }, { status: 400 })
  }

  try {
    if (platform === 'instagram') {
      const containerRes = await fetch(`${GRAPH_URL}/${pageId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
      })
      const container = await containerRes.json()
      if (container.error) return Response.json({ error: container.error.message }, { status: 400 })

      const publishRes = await fetch(`${GRAPH_URL}/${pageId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
      })
      const result = await publishRes.json()
      if (result.error) return Response.json({ error: result.error.message }, { status: 400 })
      return Response.json({ success: true, postId: result.id })
    }

    if (platform === 'facebook') {
      const body: Record<string, unknown> = { message: caption, access_token: accessToken }
      if (scheduledAt) {
        body.scheduled_publish_time = Math.floor(new Date(scheduledAt).getTime() / 1000)
        body.published = false
      }
      const res = await fetch(`${GRAPH_URL}/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json()
      if (result.error) return Response.json({ error: result.error.message }, { status: 400 })
      return Response.json({ success: true, postId: result.id })
    }

    if (platform === 'threads') {
      const containerRes = await fetch(`${GRAPH_URL}/${pageId}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: imageUrl ? 'IMAGE' : 'TEXT',
          text: caption,
          ...(imageUrl && { image_url: imageUrl }),
          access_token: accessToken,
        }),
      })
      const container = await containerRes.json()
      if (container.error) return Response.json({ error: container.error.message }, { status: 400 })

      const publishRes = await fetch(`${GRAPH_URL}/${pageId}/threads_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
      })
      const result = await publishRes.json()
      if (result.error) return Response.json({ error: result.error.message }, { status: 400 })
      return Response.json({ success: true, postId: result.id })
    }

    return Response.json({ error: 'Invalid platform. Use: instagram, facebook, or threads' }, { status: 400 })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
