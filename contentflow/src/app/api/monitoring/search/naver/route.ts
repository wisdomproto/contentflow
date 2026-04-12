import { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(req: NextRequest) {
  const { keyword, maxResults } = await req.json()
  if (!keyword) return Response.json({ error: 'keyword required' }, { status: 400 })

  try {
    // Use kin.naver.com search directly for more stable HTML structure
    const searchUrl = `https://kin.naver.com/search/list.naver?query=${encodeURIComponent(keyword)}&sort=date`
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    const items: any[] = []

    // 지식인 search results
    $('ul.basic1 li, .answer_area li, [class*="question"]').each((i, el) => {
      if (i >= (maxResults || 10)) return false as any
      const $el = $(el)
      const titleEl = $el.find('a.title, dt a, a[class*="title"]').first()
      const title = titleEl.text().trim()
      const url = titleEl.attr('href') || ''
      const snippet = $el.find('dd, .txt, [class*="answer"]').first().text().trim()
      const date = $el.find('.date, .time, [class*="date"]').first().text().trim()

      if (title && url && url.includes('kin.naver.com')) {
        items.push({
          platform: 'naver_jisikin',
          id: `naver-kin-${i}-${Date.now()}`,
          title,
          snippet: snippet.substring(0, 200),
          author: '지식인',
          url: url.startsWith('http') ? url : `https://kin.naver.com${url}`,
          publishedAt: date,
          language: 'ko',
        })
      }
    })

    // Alternative: try parsing question list links
    if (items.length === 0) {
      $('a').each((i, el) => {
        if (i >= 20) return false as any
        const href = $(el).attr('href') || ''
        const text = $(el).text().trim()
        if (href.includes('kin.naver.com/qna/detail') && text.length > 5) {
          items.push({
            platform: 'naver_jisikin',
            id: `naver-kin-${i}-${Date.now()}`,
            title: text.substring(0, 100),
            snippet: '',
            author: '지식인',
            url: href.startsWith('http') ? href : `https://kin.naver.com${href}`,
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
