import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Service-role client bypasses RLS — only used for public-read endpoints
// that filter explicitly to status='published' on publish_records.
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

  // Step 1: Fetch published self_hosted records for this project+lang
  // publish_records → contents (inner join for project filter)
  const { data: records, error: recErr } = await adminClient
    .from('publish_records')
    .select(`
      id, content_id, language, published_at, scheduled_at, metadata,
      contents!inner(id, title, tags, project_id)
    `)
    .eq('contents.project_id', projectId)
    .eq('channel', 'self_hosted')
    .eq('language', lang)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (recErr) {
    return Response.json({ error: recErr.message }, { status: 500 })
  }
  if (!records || records.length === 0) {
    return Response.json({ posts: [] }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    })
  }

  const contentIds = records.map((r: any) => r.content_id)

  // Step 2: Fetch blog_contents (sibling table via shared content_id)
  const { data: blogContents } = await adminClient
    .from('blog_contents')
    .select('id, content_id, seo_title, url_slug, meta_description, primary_keyword, secondary_keywords, seo_details')
    .in('content_id', contentIds)

  // Step 3: Fetch base_articles (sibling table via shared content_id)
  const { data: baseArticles } = await adminClient
    .from('base_articles')
    .select('content_id, body, body_plain_text')
    .in('content_id', contentIds)

  // Step 4: Non-Korean — fetch translations for body override
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

  // Step 5: Fetch blog_cards keyed by blog_content_id
  const blogContentIds = (blogContents || []).map((bc: any) => bc.id).filter(Boolean)
  const { data: cards } = blogContentIds.length
    ? await adminClient
        .from('blog_cards')
        .select('id, blog_content_id, card_type, content, sort_order')
        .in('blog_content_id', blogContentIds)
        .order('sort_order', { ascending: true })
    : { data: [] as any[] }

  // Build lookup maps
  const bcByContentId = Object.fromEntries((blogContents || []).map((b: any) => [b.content_id, b]))
  const baByContentId = Object.fromEntries((baseArticles || []).map((a: any) => [a.content_id, a]))

  // Build response — skip non-ko records without translation
  const result = records
    .map((r: any) => {
      const tr = lang !== 'ko' ? translations.find((t) => t.content_id === r.content_id) : null
      // Skip if non-ko and no translation (avoid leaking Korean body)
      if (lang !== 'ko' && !tr?.body) return null

      const bc = bcByContentId[r.content_id]
      const ba = baByContentId[r.content_id]
      const postCards = (cards || []).filter((c: any) => c.blog_content_id === bc?.id)

      return {
        id: r.id,
        content_id: r.content_id,
        slug: bc?.url_slug || r.content_id,
        title: tr?.title || bc?.seo_title || r.contents?.title,
        meta_description: tr?.seo_description || bc?.meta_description || '',
        primary_keyword: bc?.primary_keyword || null,
        secondary_keywords: bc?.secondary_keywords || [],
        tags: r.contents?.tags || [],
        language: r.language,
        published_at: r.published_at,
        body_html: tr?.body || ba?.body || '',
        cards: tr?.cards_json || postCards,
        global_style: bc?.seo_details?.globalStyle || null,
      }
    })
    .filter(Boolean)

  return Response.json({ posts: result }, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
  })
}
