import { NextRequest, NextResponse } from 'next/server';
import { deleteObjectsByPrefix } from '@/lib/r2-storage';

export async function DELETE(req: NextRequest) {
  try {
    const { prefix } = await req.json();

    if (!prefix || typeof prefix !== 'string') {
      return NextResponse.json({ error: 'prefix가 필요합니다.' }, { status: 400 });
    }

    const deleted = await deleteObjectsByPrefix(prefix);
    return NextResponse.json({ deleted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '파일 삭제 중 오류가 발생했습니다.';
    console.error('[storage/delete-prefix]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
