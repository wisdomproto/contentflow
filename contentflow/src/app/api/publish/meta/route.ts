import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GRAPH_URL = 'https://graph.facebook.com/v21.0'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest) {
  const { platform, accessToken, pageId, caption, imageUrl, scheduledAt, projectId, contentId, title, language } = await req.json()

  if (!accessToken || !pageId) {
    return Response.json({ error: 'Meta access token and page ID required' }, { status: 400 })
  }

  async function saveRecord(channel: string, postId: string) {
    if (projectId) {
      await supabase.from('publish_records').insert({
        project_id: projectId, content_id: contentId || null,
        channel, status: scheduledAt ? 'scheduled' : 'published',
        title: title || caption?.substring(0, 100) || '', url: '',
        language: language || 'ko', external_id: postId,
        published_at: scheduledAt || new Date().toISOString(),
        scheduled_at: scheduledAt || null,
      })
    }
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
      await saveRecord('instagram', result.id)
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
      await saveRecord('facebook', result.id)
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
      await saveRecord('threads', result.id)
      return Response.json({ success: true, postId: result.id })
    }

    return Response.json({ error: 'Invalid platform. Use: instagram, facebook, or threads' }, { status: 400 })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
