import { NextResponse } from 'next/server';
import { getKeywordStats } from '@/lib/naver-ad';

export async function POST(request: Request) {
  try {
    const { keywords } = (await request.json()) as { keywords: string[] };

    if (!keywords || keywords.length === 0) {
      return NextResponse.json({ error: 'keywords are required' }, { status: 400 });
    }

    const stats = await getKeywordStats(keywords);

    // Sort by total search volume (PC + Mobile)
    const sorted = stats.sort((a, b) => {
      const totalA = (a.monthlyPcQcCnt || 0) + (a.monthlyMobileQcCnt || 0);
      const totalB = (b.monthlyPcQcCnt || 0) + (b.monthlyMobileQcCnt || 0);
      return totalB - totalA;
    });

    return NextResponse.json({ keywords: sorted });
  } catch (error) {
    console.error('Naver keyword API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
