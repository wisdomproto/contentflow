import { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return Response.json({ error: 'url required' }, { status: 400 })

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'ContentFlow SEO Bot/1.0' } })
    const html = await response.text()
    const $ = cheerio.load(html)

    const title = $('title').text()
    const metaDescription = $('meta[name="description"]').attr('content') || ''
    const h1s = $('h1').map((_, el) => $(el).text()).get()
    const h2s = $('h2').map((_, el) => $(el).text()).get()
    const images = $('img').map((_, el) => ({ src: $(el).attr('src'), alt: $(el).attr('alt') || '' })).get()
    const imagesWithoutAlt = images.filter(i => !i.alt).length
    const links = $('a[href]').length
    const hasSchema = $('script[type="application/ld+json"]').length > 0
    const isHttps = url.startsWith('https')
    const hasViewport = $('meta[name="viewport"]').length > 0
    const canonicalUrl = $('link[rel="canonical"]').attr('href')
    const textLength = $('body').text().replace(/\s+/g, ' ').trim().length

    const issues: Array<{ severity: string; message: string; engine: string; fix_action?: string }> = []

    // Google Score
    let google = 0
    if (title && title.length >= 30 && title.length <= 60) google += 15; else issues.push({ severity: 'warning', message: `Title: ${title.length} chars (optimal 30-60)`, engine: 'google' })
    if (metaDescription && metaDescription.length >= 120) google += 15; else issues.push({ severity: 'critical', message: 'Meta description missing or too short', engine: 'google', fix_action: 'Add meta description 120-160 chars' })
    if (h1s.length === 1) google += 10; else issues.push({ severity: 'warning', message: `${h1s.length} H1 tags`, engine: 'google' })
    if (h2s.length >= 2) google += 10
    if (imagesWithoutAlt === 0 && images.length > 0) google += 10; else if (imagesWithoutAlt > 0) issues.push({ severity: 'warning', message: `${imagesWithoutAlt} images without alt`, engine: 'google', fix_action: 'Add alt text' })
    if (isHttps) google += 10
    if (hasViewport) google += 10
    if (canonicalUrl) google += 10
    if (links > 5) google += 10

    // Naver Score
    let naver = 0
    if (title) naver += 15
    if (images.length >= 3) naver += 15; else issues.push({ severity: 'warning', message: 'Naver prefers 3+ images', engine: 'naver' })
    if (h2s.length >= 2) naver += 10
    if (textLength >= 2000) naver += 15
    if (metaDescription) naver += 10
    naver += Math.min(35, Math.floor(textLength / 200))

    // GEO Score
    let geo = 0
    if (hasSchema) geo += 25; else issues.push({ severity: 'critical', message: 'No Schema markup', engine: 'geo', fix_action: 'Add JSON-LD Schema' })
    if (html.includes('"FAQPage"')) geo += 20; else issues.push({ severity: 'warning', message: 'No FAQ Schema', engine: 'geo', fix_action: 'Add FAQ structured data' })
    if (h2s.some(h => h.includes('?'))) geo += 15
    geo += Math.min(40, Math.floor(textLength / 300))

    // Tech Score
    let tech = 0
    if (isHttps) tech += 20
    if (hasViewport) tech += 20
    if (canonicalUrl) tech += 15
    if ($('meta[name="robots"]').length > 0) tech += 10
    tech += 35

    return Response.json({
      url, title, metaDescription,
      scores: { google, naver, geo, tech },
      issues,
      meta: { h1Count: h1s.length, h2Count: h2s.length, imageCount: images.length, linkCount: links, textLength, hasSchema, isHttps }
    })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
