import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, getR2Bucket, getR2PublicUrl } from '@/lib/r2-client';
import { generateR2Key, isAllowedContentType, type StorageCategory } from '@/lib/r2-storage';

const VALID_CATEGORIES: StorageCategory[] = ['images', 'references', 'bgm', 'videos', 'content'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, category, fileName, contentType, contentId } = body;

    if (!projectId || !category || !fileName || !contentType) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다 (projectId, category, fileName, contentType)' },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `유효하지 않은 카테고리: ${category}` },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z]+-[a-zA-Z0-9-]+$/.test(projectId)) {
      return NextResponse.json(
        { error: '유효하지 않은 프로젝트 ID 형식입니다.' },
        { status: 400 }
      );
    }

    if (!isAllowedContentType(category, contentType)) {
      return NextResponse.json(
        { error: `${category} 카테고리에서 허용되지 않는 파일 형식입니다: ${contentType}` },
        { status: 400 }
      );
    }

    const key = generateR2Key({ projectId, category, fileName, contentId });

    const client = getR2Client();
    const bucket = getR2Bucket();
    const publicUrl = getR2PublicUrl();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    return NextResponse.json({
      presignedUrl,
      publicUrl: `${publicUrl}/${key}`,
      key,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Presigned URL 생성 중 오류가 발생했습니다.';
    console.error('[storage/presign]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
