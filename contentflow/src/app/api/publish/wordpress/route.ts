import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest) {
  const { mode, title, content, status, categories, tags, siteUrl, username, applicationPassword, scheduledAt, projectId, contentId, language, recordId } = await req.json()

  // Mode: 'queue' = save to publish_records only, 'publish' = actually publish to WP
  if (mode === 'queue') {
    if (!projectId || !contentId) {
      return Response.json({ error: 'projectId and contentId required' }, { status: 400 })
    }
    const { data, error } = await supabase.from('publish_records').insert({
      project_id: projectId,
      content_id: contentId,
      channel: 'wordpress',
      status: 'scheduled',
      language: language || 'ko',
      scheduled_at: scheduledAt || null,
      metadata: { title, siteUrl, content: content?.substring(0, 500) },
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true, recordId: data.id, status: 'scheduled' })
  }

  // Mode: 'publish' (default) — actually publish to WordPress
  if (!siteUrl || !username || !applicationPassword) {
    return Response.json({ error: 'WordPress credentials required' }, { status: 400 })
  }

  const wpApiUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`

  let cleanContent = content || ''
  cleanContent = cleanContent.replace(/^```html\s*\n?/i, '').replace(/\n?```\s*$/i, '')
  const bodyMatch = cleanContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) cleanContent = bodyMatch[1].trim()
  cleanContent = cleanContent.replace(/<!DOCTYPE[^>]*>/gi, '')
  cleanContent = cleanContent.replace(/<\/?html[^>]*>/gi, '')
  cleanContent = cleanContent.replace(/<head>[\s\S]*?<\/head>/gi, '')
  cleanContent = cleanContent.replace(/<\/?body[^>]*>/gi, '')
  cleanContent = cleanContent.trim()

  const postData: Record<string, unknown> = {
    title,
    content: cleanContent,
    status: scheduledAt ? 'future' : (status || 'publish'),
    categories,
    tags,
  }
  if (scheduledAt) postData.date = scheduledAt

  try {
    const response = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${username}:${applicationPassword}`).toString('base64')}`,
      },
      body: JSON.stringify(postData),
    })

    if (!response.ok) {
      const error = await response.text()
      // Update record status to failed if we have a recordId
      if (recordId) {
        await supabase.from('publish_records').update({ status: 'failed', error_message: error }).eq('id', recordId)
      }
      return Response.json({ error: `WordPress API error: ${error}` }, { status: response.status })
    }

    const post = await response.json()

    // Update existing record or create new one
    if (recordId) {
      await supabase.from('publish_records').update({
        status: 'published',
        published_at: new Date().toISOString(),
        published_url: post.link || '',
        platform_post_id: String(post.id),
      }).eq('id', recordId)
    } else if (projectId && contentId) {
      await supabase.from('publish_records').insert({
        project_id: projectId,
        content_id: contentId,
        channel: 'wordpress',
        status: 'published',
        language: language || 'ko',
        published_at: new Date().toISOString(),
        published_url: post.link || '',
        platform_post_id: String(post.id),
        metadata: { siteUrl, postId: post.id },
      })
    }

    return Response.json({ success: true, postId: post.id, url: post.link, status: post.status })
  } catch (error) {
    if (recordId) {
      await supabase.from('publish_records').update({ status: 'failed', error_message: String(error) }).eq('id', recordId)
    }
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
