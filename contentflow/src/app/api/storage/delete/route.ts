import { NextRequest, NextResponse } from 'next/server';
import { deleteObjects } from '@/lib/r2-storage';

export async function DELETE(req: NextRequest) {
  try {
    const { keys } = await req.json();

    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: 'keys 배열이 필요합니다.' }, { status: 400 });
    }

    if (keys.length > 100) {
      return NextResponse.json({ error: '한 번에 최대 100개의 키만 삭제할 수 있습니다.' }, { status: 400 });
    }

    const invalidKeys = keys.filter((k: string) => !k.includes('/'));
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `유효하지 않은 키 형식: ${invalidKeys[0]}` },
        { status: 400 }
      );
    }

    await deleteObjects(keys);
    return NextResponse.json({ deleted: keys.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '파일 삭제 중 오류가 발생했습니다.';
    console.error('[storage/delete]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
