import { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(req: NextRequest) {
  const { keyword, maxResults } = await req.json()
  if (!keyword) return Response.json({ error: 'keyword required' }, { status: 400 })

  try {
    const searchUrl = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(keyword)}&sm=tab_opt&sort=sim`
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    const items: any[] = []

    // Naver blog search results - multiple selector strategies
    // Strategy 1: Standard blog results
    $('li.bx, .api_txt_lines, [class*="blog"] li').each((i, el) => {
      if (i >= (maxResults || 10)) return false as any
      const $el = $(el)

      // Try multiple title selectors
      const titleEl = $el.find('a.api_txt_lines, a[class*="title"], .title_area a, .total_tit a').first()
      const title = titleEl.text().trim()
      const url = titleEl.attr('href') || ''

      // Try multiple snippet selectors
      const snippet = $el.find('.api_txt_lines.dsc_txt, .total_dsc, .dsc_area, [class*="dsc"]').first().text().trim()
      const author = $el.find('.sub_txt, .name, [class*="writer"], [class*="author"]').first().text().trim()
      const date = $el.find('.sub_time, .date, [class*="date"]').first().text().trim()
      const thumbnail = $el.find('img').first().attr('src') || ''

      if (title && url && (url.includes('blog.naver.com') || url.includes('m.blog'))) {
        items.push({
          platform: 'naver_blog',
          id: `nblog-${i}-${Date.now()}`,
          title: title.substring(0, 100),
          snippet: snippet.substring(0, 200),
          author: author || '블로거',
          url,
          thumbnail: thumbnail.startsWith('http') ? thumbnail : '',
          publishedAt: date,
          language: 'ko',
        })
      }
    })

    // Strategy 2: Try finding blog links directly
    if (items.length === 0) {
      $('a[href*="blog.naver.com"]').each((i, el) => {
        if (i >= (maxResults || 10)) return false as any
        const href = $(el).attr('href') || ''
        const text = $(el).text().trim()
        if (text.length > 5 && href.includes('blog.naver.com')) {
          items.push({
            platform: 'naver_blog',
            id: `nblog-${i}-${Date.now()}`,
            title: text.substring(0, 100),
            snippet: '',
            author: '블로거',
            url: href,
            language: 'ko',
          })
        }
      })
    }

    return Response.json({ items })
  } catch (error) {
    return Response.json({ items: [], error: String(error) })
  }
}
