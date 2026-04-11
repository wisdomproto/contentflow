import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_STRATEGY_MODEL } from '@/lib/ai-models';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, { status: 400 });
  }

  try {
    const { industry, services, targetCustomer, usp } = (await req.json()) as {
      industry: string;
      services: string;
      targetCustomer?: string;
      usp?: string;
    };

    if (!industry && !services) {
      return NextResponse.json({ error: '업종 또는 서비스 정보를 입력해 주세요.' }, { status: 400 });
    }

    const prompt = `당신은 시장 조사 및 경쟁 분석 전문가입니다.

아래 비즈니스 정보를 분석하여 주요 경쟁사 5~8개를 찾아주세요.

## 비즈니스 정보
- 업종: ${industry}
- 서비스: ${services}
${targetCustomer ? `- 타겟 고객: ${targetCustomer}` : ''}
${usp ? `- 차별화: ${usp}` : ''}

## 경쟁사 탐색 기준
1. 같은 업종에서 동일한 타겟 고객을 대상으로 하는 직접 경쟁사
2. 유사 서비스를 제공하는 간접 경쟁사
3. 온라인 마케팅(네이버, 유튜브, 인스타)에서 활발히 활동하는 경쟁사 우선
4. 대형/프랜차이즈 + 중소규모 경쟁사 혼합

반드시 아래 JSON 형식으로만 응답하세요:
{
  "competitors": [
    { "name": "경쟁사명", "url": "홈페이지 URL (알면)", "type": "direct|indirect", "reason": "경쟁사인 이유 (한 줄)", "strength": "주요 강점" }
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
