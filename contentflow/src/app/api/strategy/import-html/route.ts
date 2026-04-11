import { NextRequest, NextResponse } from 'next/server';
import { parseStrategyHtml } from '@/lib/strategy-html-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'HTML 파일이 필요합니다' }, { status: 400 });
    }

    const html = await file.text();
    const result = parseStrategyHtml(html);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      keywordCount: result.keywords.length,
      categoryCount: result.categories.length,
      topicCount: result.categories.reduce((sum, c) => sum + c.topics.length, 0),
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '파싱 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
