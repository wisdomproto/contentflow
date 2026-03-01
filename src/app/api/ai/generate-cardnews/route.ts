import { NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/gemini';
import type { GeminiModel } from '@/types/content';
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
  try {
    const { topic, blogTitle, blogSections, keywords, tone, slideCount, model } =
      (await request.json()) as {
        topic: string;
        blogTitle: string;
        blogSections: { type: string; header: string; text: string }[];
        keywords: string[];
        tone: string;
        slideCount?: number;
        model?: GeminiModel;
      };

    if (!topic && !blogTitle) {
      return NextResponse.json({ error: 'topic or blogTitle is required' }, { status: 400 });
    }

    const gemini = getGeminiModel(model ?? 'flash');
    const count = slideCount ?? 7;

    const blogContent = blogSections
      .map((sec) => {
        const plainText = sec.text.replace(/<[^>]*>/g, '');
        return `[${sec.header}]\n${plainText}`;
      })
      .join('\n\n');

    const keywordsText = keywords.length > 0 ? `키워드: ${keywords.join(', ')}` : '';

    const prompt = `당신은 한국 인스타그램 카드뉴스 전문 디자이너입니다.

아래 블로그 글을 ${count}장의 인스타그램 카드뉴스 슬라이드로 변환해주세요.

블로그 제목: "${blogTitle}"
주제: "${topic}"
${keywordsText}
톤앤매너: ${tone || '친근한 이웃'}

블로그 본문:
${blogContent}

아래 JSON 형식으로 슬라이드를 생성해주세요:

{
  "slides": [
    {
      "type": "cover",
      "headline": "시선을 사로잡는 제목 (15~20자)",
      "body": "호기심 유발 부제목 (30~50자)",
      "imagePlaceholder": "AI 이미지 생성용 상세 묘사 (2~3문장)"
    },
    {
      "type": "body",
      "headline": "핵심 포인트 (10~20자)",
      "body": "간결한 설명 (30~60자)",
      "imagePlaceholder": "AI 이미지 생성용 상세 묘사 (2~3문장)"
    },
    {
      "type": "outro",
      "headline": "마무리/CTA (10~15자)",
      "body": "행동 유도 문구 (20~40자)",
      "imagePlaceholder": "AI 이미지 생성용 상세 묘사 (2~3문장)"
    }
  ]
}

규칙:
- 첫 번째 슬라이드는 반드시 type: "cover" (시선 끄는 제목 + 호기심 유발)
- 마지막 슬라이드는 반드시 type: "outro" (요약, CTA, 팔로우 유도)
- 나머지는 type: "body" (블로그 핵심 내용을 카드뉴스에 맞게 압축)
- headline은 짧고 임팩트 있게 (한 줄에 보일 수 있는 길이)
- body는 1~2문장으로 핵심만 전달 (스와이프하며 빠르게 읽을 수 있게)
- imagePlaceholder는 AI 이미지 생성에 직접 사용됩니다. 반드시 2~3문장으로 구체적으로 묘사:
  - 장소, 피사체, 구도, 분위기, 조명, 색감 포함
  - 인스타그램 카드뉴스에 어울리는 깔끔하고 세련된 스타일
- 총 ${count}장의 슬라이드를 생성하세요
- 반드시 위 JSON 형식만 출력하세요. 다른 텍스트는 포함하지 마세요.`;

    const result = await gemini.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const data = JSON.parse(jsonMatch[0]);

    const slides = data.slides.map(
      (sl: { type: string; headline: string; body: string; imagePlaceholder?: string }) => ({
        id: nanoid(),
        type: sl.type || 'body',
        headline: sl.headline || '',
        body: sl.body || '',
        imageUrl: null,
        imagePlaceholder: sl.imagePlaceholder || '',
      }),
    );

    return NextResponse.json({ slides });
  } catch (error) {
    console.error('AI card news generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('503') || message.includes('Service Unavailable')) {
      return NextResponse.json(
        { error: '현재 선택한 AI 모델이 과부하 상태입니다. 잠시 후 다시 시도하거나 다른 모델을 선택해주세요.' },
        { status: 503 },
      );
    }
    if (message.includes('404') || message.includes('not found')) {
      return NextResponse.json(
        { error: '선택한 AI 모델을 찾을 수 없습니다. 다른 모델을 선택해주세요.' },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
