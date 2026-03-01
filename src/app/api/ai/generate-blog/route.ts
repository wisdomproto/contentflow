import { NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/gemini';
import { handleApiError, parseGeminiJson } from '@/lib/api-error';
import type { GeminiModel } from '@/types/content';
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
  try {
    const { topic, keywords, insights, tone, model } = (await request.json()) as {
      topic: string;
      keywords: string[];
      insights: string;
      tone: string;
      model?: GeminiModel;
    };

    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const gemini = getGeminiModel(model ?? 'flash');

    const keywordsText = keywords.length > 0 ? `핵심 키워드: ${keywords.join(', ')}` : '';
    const insightsText = insights ? `작성자 경험 데이터: ${insights}` : '';
    const toneText = tone ? `톤앤매너: ${tone}` : '톤앤매너: 친근한 이웃';

    const prompt = `당신은 한국 네이버 블로그 전문 작가입니다.

주제: "${topic}"
${keywordsText}
${insightsText}
${toneText}

아래 JSON 형식으로 블로그 글을 생성해주세요:

{
  "title": "블로그 제목 (네이버 C-Rank 최적화, 40자 이내)",
  "sections": [
    {
      "type": "intro",
      "header": "인사/도입 소제목",
      "text": "<p>도입부 HTML (2~3문단, 독자 공감 유도)</p>",
      "imagePlaceholder": "AI 이미지 생성용 상세 묘사 (2~3문장)"
    },
    {
      "type": "body",
      "header": "본문 소제목 1",
      "text": "<p>본문 내용 HTML (구체적 정보, 경험 데이터 반영)</p>",
      "imagePlaceholder": "AI 이미지 생성용 상세 묘사 (2~3문장)"
    },
    {
      "type": "body",
      "header": "본문 소제목 2",
      "text": "<p>본문 내용 HTML</p>",
      "imagePlaceholder": "AI 이미지 생성용 상세 묘사 (2~3문장)"
    },
    {
      "type": "body",
      "header": "본문 소제목 3",
      "text": "<p>본문 내용 HTML</p>",
      "imagePlaceholder": "AI 이미지 생성용 상세 묘사 (2~3문장)"
    },
    {
      "type": "qa",
      "header": "자주 묻는 질문",
      "question": "독자가 궁금해할 질문",
      "answer": "상세한 답변"
    },
    {
      "type": "summary",
      "header": "핵심 요약",
      "points": ["요약 포인트 1", "요약 포인트 2", "요약 포인트 3"]
    }
  ],
  "tags": ["#해시태그1", "#해시태그2", "#해시태그3", "#해시태그4"]
}

규칙:
- D.I.A+ 알고리즘: 경험 데이터가 있으면 반드시 자연스럽게 본문에 포함
- C-Rank 최적화: 키워드를 제목과 소제목에 자연스럽게 배치
- 본문 텍스트는 반드시 <p> 태그로 감싸고, 필요시 <strong>, <em> 사용
- 각 섹션은 300~500자 분량
- imagePlaceholder는 AI 이미지 생성 프롬프트로 직접 사용됩니다. 반드시 2~3문장으로 구체적이고 시각적으로 묘사해주세요:
  - 나쁜 예: "카페 사진", "맛있는 음식"
  - 좋은 예: "햇살이 들어오는 통유리 카페 창가에 라떼 한 잔이 놓여있고, 옆에 오픈된 노트북과 작은 화분이 있는 아늑한 테이블. 따뜻하고 밝은 톤의 자연광 사진."
  - 장소, 피사체, 구도, 분위기, 조명, 색감 등을 구체적으로 포함할 것
- 반드시 위 JSON 형식만 출력하세요. 다른 텍스트는 포함하지 마세요.`;

    const result = await gemini.generateContent(prompt);
    const text = result.response.text();

    const blogData = parseGeminiJson(text) as {
      title: string;
      sections: { type: string; header: string; text?: string; imagePlaceholder?: string; question?: string; answer?: string; points?: string[] }[];
      tags?: string[];
    } | null;
    if (!blogData) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Fix HTML that AI may have escaped (e.g. &lt;strong&gt; → <strong>)
    const unescapeHtml = (str: string): string =>
      str
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\\</g, '<')
        .replace(/\\>/g, '>');

    // Strip HTML tags from plain-text fields (Q&A, summary)
    const stripHtml = (str: string): string =>
      unescapeHtml(str).replace(/<[^>]*>/g, '');

    // Add IDs and default fields to sections
    const sections = blogData.sections.map(
      (sec) => ({
        id: nanoid(),
        type: sec.type,
        header: stripHtml(sec.header || ''),
        imageUrl: null,
        imagePlaceholder: sec.imagePlaceholder || '',
        text: sec.text ? unescapeHtml(sec.text) : '',
        isCollapsed: false,
        ...(sec.question && { question: stripHtml(sec.question) }),
        ...(sec.answer && { answer: stripHtml(sec.answer) }),
        ...(sec.points && { points: sec.points.map(stripHtml) }),
      }),
    );

    return NextResponse.json({
      title: blogData.title,
      sections,
      tags: blogData.tags || [],
    });
  } catch (error) {
    return handleApiError(error, 'AI blog generation error');
  }
}
