import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_STRATEGY_MODEL } from '@/lib/ai-models';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, { status: 400 });
  }

  try {
    const { industry, services, targetCustomer, usp, crawlData } = (await req.json()) as {
      industry: string;
      services: string;
      targetCustomer?: string;
      usp?: string;
      crawlData?: { title?: string; headings?: string[]; bodyText?: string }[];
    };

    if (!industry && !services) {
      return NextResponse.json({ error: '업종 또는 서비스 정보를 입력해 주세요.' }, { status: 400 });
    }

    let crawlContext = '';
    if (crawlData?.length) {
      const texts = crawlData
        .filter((d) => d.title || d.bodyText)
        .map((d) => `제목: ${d.title || '없음'}\n헤딩: ${d.headings?.join(', ') || '없음'}\n본문: ${d.bodyText?.slice(0, 300) || '없음'}`)
        .join('\n---\n');
      if (texts) crawlContext = `\n\n## 웹사이트 분석 결과\n${texts}`;
    }

    const prompt = `당신은 네이버 SEO 및 SNS 마케팅 키워드 전문가입니다.

아래 비즈니스 정보를 분석하여 마케팅에 활용할 핵심 키워드 15~20개를 추천해주세요.

## 비즈니스 정보
- 업종: ${industry}
- 서비스: ${services}
${targetCustomer ? `- 타겟 고객: ${targetCustomer}` : ''}
${usp ? `- 차별화: ${usp}` : ''}
${crawlContext}

## 키워드 선정 기준
1. 네이버 검색에서 실제 유입이 될 수 있는 키워드
2. 업종 핵심 키워드 + 롱테일 키워드 혼합
3. 정보성 키워드 (블로그 SEO용) + 전환용 키워드 (광고용) 구분
4. 타겟 고객이 실제로 검색할 만한 자연어 키워드 포함

반드시 아래 JSON 형식으로만 응답하세요:
{
  "keywords": [
    { "keyword": "키워드", "reason": "추천 이유 (한 줄)", "type": "core|longtail|conversion|info" }
  ]
}`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: DEFAULT_STRATEGY_MODEL,
      contents: prompt,
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 응답 파싱 실패' }, { status: 500 });
    }

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: `서버 오류: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
