import { NextResponse } from 'next/server';
import { getGeminiImageModel } from '@/lib/gemini';
import type { ImageModel } from '@/types/content';

interface ImageContext {
  blogTitle?: string;
  topic?: string;
  keywords?: string[];
  sectionHeader?: string;
  sectionText?: string;
  imagePlaceholder?: string;
}

function buildImagePrompt(userPrompt: string, context?: ImageContext): string {
  // If user typed a custom prompt, use it as primary but still add style guidance
  if (!context) {
    return `블로그 포스트에 사용할 고품질 사진을 생성해주세요.

주제: "${userPrompt}"

스타일 가이드:
- 실제 사진처럼 자연스럽고 사실적인 이미지
- 한국 블로그에 적합한 깔끔하고 밝은 톤
- 텍스트, 글자, 워터마크 절대 포함하지 않기
- 16:9 비율`;
  }

  const parts: string[] = [];

  // Blog context
  if (context.topic || context.blogTitle) {
    parts.push(`블로그 주제: "${context.topic || context.blogTitle}"`);
  }

  // Section context
  if (context.sectionHeader) {
    parts.push(`현재 섹션 제목: "${context.sectionHeader}"`);
  }

  // Section body text for deeper context
  if (context.sectionText && context.sectionText.length > 10) {
    parts.push(`섹션 본문 내용:\n${context.sectionText}`);
  }

  // Image placeholder suggestion from AI blog generation
  if (context.imagePlaceholder) {
    parts.push(`추천 이미지 설명: "${context.imagePlaceholder}"`);
  }

  // Keywords
  if (context.keywords && context.keywords.length > 0) {
    parts.push(`관련 키워드: ${context.keywords.join(', ')}`);
  }

  // User's custom prompt takes priority
  const hasCustomPrompt = userPrompt !== context.sectionHeader &&
    userPrompt !== context.imagePlaceholder &&
    userPrompt !== '블로그 이미지';

  if (hasCustomPrompt) {
    parts.push(`사용자 요청: "${userPrompt}"`);
  }

  return `당신은 한국 네이버 블로그에 사용할 이미지를 생성하는 전문가입니다.

아래 블로그 문맥을 참고하여, 이 섹션에 가장 어울리는 사진을 생성해주세요.

${parts.join('\n\n')}

이미지 생성 규칙:
1. 블로그 본문 내용과 직접적으로 관련된 장면을 촬영한 것처럼 사실적으로 생성
2. 한국 블로그 독자가 기대하는 스타일 — 밝고 깨끗한 톤, 자연광 느낌
3. 텍스트, 글자, 로고, 워터마크는 절대 포함하지 않기
4. 음식/카페/장소 관련이면 실제 방문 사진처럼 자연스러운 앵글
5. 제품/리뷰 관련이면 깔끔한 제품 사진 스타일
6. 16:9 비율, 고해상도`;
}

export async function POST(request: Request) {
  try {
    const { prompt, model, context } = (await request.json()) as {
      prompt: string;
      model?: ImageModel;
      context?: ImageContext;
    };

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const gemini = getGeminiImageModel(model ?? 'flash-image');
    const fullPrompt = buildImagePrompt(prompt, context);

    const result = await gemini.generateContent(fullPrompt);
    const response = result.response;

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const parts = candidates[0].content.parts;
    for (const part of parts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inlineData = (part as any).inlineData;
      if (inlineData) {
        return NextResponse.json({
          image: inlineData.data,
          mimeType: inlineData.mimeType || 'image/png',
        });
      }
    }

    return NextResponse.json(
      { error: '이미지를 생성할 수 없습니다. 다른 모델을 시도해보세요.' },
      { status: 500 },
    );
  } catch (error) {
    console.error('AI image generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
