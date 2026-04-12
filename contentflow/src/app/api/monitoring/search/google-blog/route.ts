import { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(req: NextRequest) {
  const { keyword, language, maxResults } = await req.json()
  if (!keyword) return Response.json({ error: 'keyword required' }, { status: 400 })

  try {
    // Use Google search with blog-focused query
    const lang = language || 'ko'
    const blogQuery = `${keyword} blog`
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(blogQuery)}&hl=${lang}&num=${maxResults || 10}`

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': lang === 'ko' ? 'ko-KR,ko;q=0.9' : 'en-US,en;q=0.9',
      },
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    const items: any[] = []

    // Google search results
    $('div.g, div[data-sokoban-container]').each((i, el) => {
      if (i >= (maxResults || 10)) return false as any
      const $el = $(el)
      const titleEl = $el.find('h3').first()
      const title = titleEl.text().trim()
      const linkEl = $el.find('a[href^="http"]').first()
      const url = linkEl.attr('href') || ''
      const snippet = $el.find('[data-sncf], .VwiC3b, [style*="-webkit-line-clamp"]').first().text().trim()
      const siteName = $el.find('cite, .NJjxre').first().text().trim()

      if (title && url && !url.includes('google.com')) {
        items.push({
          platform: 'wordpress',
          id: `gblog-${i}-${Date.now()}`,
          title: title.substring(0, 100),
          snippet: snippet.substring(0, 200),
          author: siteName || new URL(url).hostname,
          url,
          publishedAt: '',
          language: lang,
        })
      }
    })

    return Response.json({ items })
  } catch (error) {
    return Response.json({ items: [], error: String(error) })
  }
}
