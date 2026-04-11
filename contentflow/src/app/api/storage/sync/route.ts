import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2Bucket } from '@/lib/r2-client';

const SYNC_KEY = '_sync/store.json';

// GET: R2에서 스토어 데이터 로드
export async function GET() {
  try {
    const client = getR2Client();
    const bucket = getR2Bucket();

    const cmd = new GetObjectCommand({ Bucket: bucket, Key: SYNC_KEY });
    const res = await client.send(cmd);
    const body = await res.Body?.transformToString();

    if (!body) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: JSON.parse(body) });
  } catch (err: unknown) {
    // NoSuchKey = 아직 저장된 적 없음
    if ((err as { name?: string }).name === 'NoSuchKey') {
      return NextResponse.json({ data: null });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sync/GET]', msg);
    return NextResponse.json({ error: `동기화 데이터 로드 실패: ${msg}` }, { status: 500 });
  }
}

// POST: R2에 스토어 데이터 저장
export async function POST(req: NextRequest) {
  try {
    const { data } = await req.json();
    if (!data) {
      return NextResponse.json({ error: '데이터가 없습니다.' }, { status: 400 });
    }

    const client = getR2Client();
    const bucket = getR2Bucket();
    const body = JSON.stringify(data);

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: SYNC_KEY,
      Body: body,
      ContentType: 'application/json',
    });
    await client.send(cmd);

    return NextResponse.json({ ok: true, size: body.length });
  } catch (err) {
    console.error('[sync/POST]', err);
    const msg = err instanceof Error ? err.message : '동기화 저장 실패';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
