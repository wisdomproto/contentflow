import { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(req: NextRequest) {
  const { keyword, maxResults } = await req.json()
  if (!keyword) return Response.json({ error: 'keyword required' }, { status: 400 })

  try {
    const searchUrl = `https://search.naver.com/search.naver?where=kin&query=${encodeURIComponent(keyword)}&sm=tab_opt&sort=date`
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    const items: any[] = []

    // Parse 지식인 search results
    $('ul.lst_total li.bx').each((i, el) => {
      if (i >= (maxResults || 10)) return false as any
      const $el = $(el)
      const titleEl = $el.find('.total_tit a, .question_text')
      const title = titleEl.text().trim()
      const url = titleEl.attr('href') || ''
      const snippet = $el.find('.total_dsc, .answer_text').text().trim()
      const date = $el.find('.sub_time, .answer_info .data').text().trim()
      const author = $el.find('.total_sub .name, .questioner').text().trim()

      if (title) {
        const fullUrl = url.startsWith('http') ? url : `https://search.naver.com${url}`
        // Only include actual 지식인 results, skip YouTube/blog/other embeds
        if (fullUrl.includes('kin.naver.com') || fullUrl.includes('search.naver.com') || !fullUrl.includes('youtube.com')) {
          items.push({
            platform: 'naver_jisikin',
            id: `naver-${i}-${Date.now()}`,
            title,
            snippet: snippet.substring(0, 200),
            author: author || '익명',
            url: fullUrl,
            publishedAt: date,
            language: 'ko',
          })
        }
      }
    })

    // Fallback for newer Naver layout
    if (items.length === 0) {
      $('[class*="kin"] a, .api_txt_lines').each((i, el) => {
        if (i >= (maxResults || 10)) return false as any
        const $el = $(el)
        const title = $el.text().trim()
        const url = $el.attr('href') || ''
        if (title && url) {
          items.push({
            platform: 'naver_jisikin',
            id: url,
            title: title.substring(0, 100),
            snippet: '',
            author: '익명',
            url: url.startsWith('http') ? url : `https://search.naver.com${url}`,
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
