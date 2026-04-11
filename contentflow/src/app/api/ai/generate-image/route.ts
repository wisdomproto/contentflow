import { NextRequest, NextResponse } from 'next/server';
import { createImageGenerator } from '@/lib/ai/image-generator';
import { DEFAULT_IMAGE_MODEL } from '@/lib/ai-models';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  try {
    const { prompt, model = DEFAULT_IMAGE_MODEL, referenceImage, aspectRatio, imageSize } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: '프롬프트가 필요합니다.' }, { status: 400 });
    }

    const generator = createImageGenerator(model, apiKey);
    const result = await generator.generate({ prompt, referenceImage, aspectRatio, imageSize });

    return NextResponse.json({
      image: result.base64,
      mimeType: result.mimeType,
    });
  } catch (err) {
    console.error('[generate-image] Error:', err);
    const msg = err instanceof Error ? err.message : '이미지 생성 중 오류가 발생했습니다.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
