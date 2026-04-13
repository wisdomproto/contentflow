import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest) {
  const { title, content, status, categories, tags, siteUrl, username, applicationPassword, scheduledAt, projectId, contentId, language } = await req.json()

  if (!siteUrl || !username || !applicationPassword) {
    return Response.json({ error: 'WordPress credentials required' }, { status: 400 })
  }

  const wpApiUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`

  // Clean content: remove markdown code block wrappers and extract pure HTML
  let cleanContent = content || ''
  // Remove ```html ... ``` wrapper
  cleanContent = cleanContent.replace(/^```html\s*\n?/i, '').replace(/\n?```\s*$/i, '')
  // Remove full HTML document wrapper if present (extract body content only)
  const bodyMatch = cleanContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    cleanContent = bodyMatch[1].trim()
  }
  // Remove <!DOCTYPE>, <html>, <head> tags if still present
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

  if (scheduledAt) {
    postData.date = scheduledAt
  }

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
      return Response.json({ error: `WordPress API error: ${error}` }, { status: response.status })
    }

    const post = await response.json()

    // Save publish record to Supabase
    if (projectId) {
      await supabase.from('publish_records').insert({
        project_id: projectId,
        content_id: contentId || null,
        channel: 'wordpress',
        status: post.status === 'future' ? 'scheduled' : 'published',
        title: title || post.title?.rendered || '',
        url: post.link || '',
        language: language || 'ko',
        external_id: String(post.id),
        published_at: post.status === 'future' ? scheduledAt : new Date().toISOString(),
        scheduled_at: scheduledAt || null,
        metadata: { siteUrl, postId: post.id },
      })
    }

    return Response.json({ success: true, postId: post.id, url: post.link, status: post.status })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
