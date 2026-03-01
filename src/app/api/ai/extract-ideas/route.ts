import { NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/gemini';
import { handleApiError, parseGeminiJson } from '@/lib/api-error';
import type { GeminiModel } from '@/types/content';

export async function POST(request: Request) {
  try {
    const { topic, model } = (await request.json()) as {
      topic: string;
      model?: GeminiModel;
    };

    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const gemini = getGeminiModel(model ?? 'flash');

    const prompt = `당신은 한국 네이버 블로그 마케팅 전문가입니다.
주제: "${topic}"

이 주제에 대해 아래 JSON 형식으로 아이디어를 추출해주세요:

{
  "keywords": ["SEO 키워드 6~8개 (한국어, 띄어쓰기 없는 해시태그 스타일)"],
  "angles": ["컨텐츠 앵글/접근 방향 4개 (한 줄 설명)"],
  "titles": ["네이버 블로그 제목 아이디어 3개 (클릭을 유도하는 매력적인 제목)"]
}

규칙:
- keywords는 네이버 검색 최적화를 고려하여 실제 검색량이 높을만한 키워드로 작성
- angles는 독자의 관심을 끌 수 있는 차별화된 접근 방향 제시
- titles는 네이버 블로그 C-Rank와 D.I.A+ 알고리즘에 유리한 형태로 작성
- 반드시 위 JSON 형식만 출력하세요. 다른 텍스트는 포함하지 마세요.`;

    const result = await gemini.generateContent(prompt);
    const text = result.response.text();

    const ideas = parseGeminiJson(text);
    if (!ideas) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    return NextResponse.json(ideas);
  } catch (error) {
    return handleApiError(error, 'AI idea extraction error');
  }
}
