import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import type { CrawlResult } from '@/types/strategy';

async function crawlUrl(url: string): Promise<CrawlResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentFlow/1.0)' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { url, success: false, error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header').remove();

    const title = $('title').text().trim() || undefined;
    const description = $('meta[name="description"]').attr('content')?.trim() || undefined;
    const headings = $('h1, h2, h3').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 20);
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 2000) || undefined;

    return { url, success: true, title, description, headings, bodyText };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { url, success: false, error: message.includes('abort') ? '타임아웃 (10초)' : message };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { urls } = (await req.json()) as { urls: string[] };

    if (!urls?.length) {
      return NextResponse.json({ error: 'URL을 입력해 주세요.' }, { status: 400 });
    }

    // Max 5 URLs
    const limitedUrls = urls.slice(0, 5);
    const results = await Promise.all(limitedUrls.map(crawlUrl));

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: `서버 오류: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
