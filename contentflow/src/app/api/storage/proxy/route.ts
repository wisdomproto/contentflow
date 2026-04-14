import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  // Only allow R2 public URLs
  if (!url.includes('r2.dev/')) {
    return NextResponse.json({ error: 'invalid url' }, { status: 403 });
  }

  const res = await fetch(url);
  if (!res.ok) return NextResponse.json({ error: `fetch failed: ${res.status}` }, { status: res.status });

  const text = await res.text();
  return new NextResponse(text, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
