import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Service-role client bypasses RLS — only used for public-read endpoints
// that filter explicitly to status='published'.
const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const { searchParams } = new URL(req.url)
  const lang = searchParams.get('lang') || 'ko'

  if (!projectId) {
    return Response.json({ error: 'projectId required' }, { status: 400 })
  }

  const { data: posts, error: postsErr } = await adminClient
    .from('blog_contents')
    .select(`
      id, content_id, seo_title, url_slug, meta_description,
      primary_keyword, secondary_keywords, seo_details, status,
      published_at,
      contents!inner:content_id(id, title, tags, project_id, updated_at),
      base_articles:content_id(body, body_plain_text)
    `)
    .eq('contents.project_id', projectId)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (postsErr) {
    return Response.json({ error: postsErr.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return Response.json({ posts: [] }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    })
  }

  const contentIds = posts.map((p: any) => p.content_id)
  let translations: any[] = []
  if (lang !== 'ko') {
    const { data: trData } = await adminClient
      .from('translations')
      .select('content_id, language, channel_type, status, title, body, cards_json, seo_title, seo_description')
      .in('content_id', contentIds)
      .eq('language', lang)
      .eq('channel_type', 'blog')
      .eq('status', 'completed')
    translations = trData || []
  }

  const blogContentIds = posts.map((p: any) => p.id)
  const { data: cards } = await adminClient
    .from('blog_cards')
    .select('id, blog_content_id, card_type, content, sort_order')
    .in('blog_content_id', blogContentIds)
    .order('sort_order', { ascending: true })

  const result = posts.map((p: any) => {
    const tr = translations.find((t) => t.content_id === p.content_id)
    const postCards = (cards || []).filter((c: any) => c.blog_content_id === p.id)
    return {
      id: p.id,
      slug: p.url_slug,
      title: tr?.title || p.seo_title || p.contents?.title,
      meta_description: tr?.seo_description || p.meta_description,
      primary_keyword: p.primary_keyword,
      secondary_keywords: p.secondary_keywords,
      tags: p.contents?.tags || [],
      published_at: p.published_at,
      updated_at: p.contents?.updated_at,
      body_html: tr?.body || p.base_articles?.body,
      cards: tr?.cards_json || postCards,
      global_style: p.seo_details?.globalStyle || null,
    }
  })

  return Response.json({ posts: result }, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
  })
}
