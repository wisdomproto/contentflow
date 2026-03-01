import { NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/gemini';
import { handleApiError, parseGeminiJson } from '@/lib/api-error';
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
      "imagePrompt": "이 슬라이드를 완성된 하나의 이미지로 생성하기 위한 초상세 프롬프트"
    },
    {
      "type": "body",
      "headline": "핵심 포인트 (10~20자)",
      "body": "간결한 설명 (30~60자)",
      "imagePrompt": "이 슬라이드를 완성된 하나의 이미지로 생성하기 위한 초상세 프롬프트"
    },
    {
      "type": "outro",
      "headline": "마무리/CTA (10~15자)",
      "body": "행동 유도 문구 (20~40자)",
      "imagePrompt": "이 슬라이드를 완성된 하나의 이미지로 생성하기 위한 초상세 프롬프트"
    }
  ]
}

★★★ 핵심: imagePrompt 작성 규칙 ★★★
imagePrompt는 AI 이미지 생성 모델에 직접 전달되어 "텍스트가 포함된 완성된 카드뉴스 이미지"를 만듭니다.
각 imagePrompt는 반드시 다음을 모두 포함해야 합니다:

1. 레이아웃 지시: "인스타그램 카드뉴스 슬라이드. 정사각형(1:1) 비율."
2. 배경 묘사: 주제에 맞는 배경 사진 또는 그라데이션 배경을 구체적으로 묘사
3. 텍스트 배치: headline과 body 텍스트가 이미지 안에 깔끔하게 배치되도록 지시
   - 예: "이미지 중앙에 '${'{headline}'}' 텍스트가 크고 굵은 흰색 글씨로 배치, 그 아래 작은 글씨로 '${'{body}'}'가 표시"
4. 디자인 스타일: 깔끔하고 모던한 한국 인스타그램 카드뉴스 스타일
5. 색감/분위기: 주제에 맞는 색감과 분위기

좋은 imagePrompt 예시:
"인스타그램 카드뉴스 슬라이드. 정사각형(1:1) 비율. 부드러운 크림색 배경에 미니멀한 카페 일러스트가 은은하게 깔림. 이미지 상단에 '카페 투어 꿀팁 5가지'라는 텍스트가 굵고 진한 갈색 산세리프 폰트로 크게 배치. 하단에 '당신이 몰랐던 숨은 카페 찾는 법'이라는 부제가 작은 회색 글씨로 표시. 전체적으로 깔끔하고 감성적인 한국 인스타그램 카드뉴스 디자인."

나쁜 imagePrompt 예시:
"카페 사진" (너무 짧음, 텍스트 배치 지시 없음)

기타 규칙:
- 첫 번째 슬라이드는 반드시 type: "cover"
- 마지막 슬라이드는 반드시 type: "outro"
- 나머지는 type: "body"
- headline은 짧고 임팩트 있게
- body는 1~2문장으로 핵심만 전달
- 총 ${count}장의 슬라이드를 생성하세요
- 반드시 위 JSON 형식만 출력하세요. 다른 텍스트는 포함하지 마세요.`;

    const result = await gemini.generateContent(prompt);
    const text = result.response.text();

    const data = parseGeminiJson(text) as { slides: { type: string; headline: string; body: string; imagePrompt?: string; imagePlaceholder?: string }[] } | null;
    if (!data) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const slides = data.slides.map(
      (sl) => ({
        id: nanoid(),
        type: sl.type || 'body',
        headline: sl.headline || '',
        body: sl.body || '',
        imageUrl: null,
        imagePlaceholder: sl.imagePrompt || sl.imagePlaceholder || '',
      }),
    );

    return NextResponse.json({ slides });
  } catch (error) {
    return handleApiError(error, 'AI card news generation error');
  }
}
