import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';
import { buildTranslationPrompt } from '@/lib/translation-prompt-builder';
import { DEFAULT_TEXT_MODEL } from '@/lib/ai-models';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다. .env.local 파일에 설정해 주세요.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { text, sourceLanguage, targetLanguage, channelType, model, project, isNaver } = await req.json();

    if (!text || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: 'text and targetLanguage required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemPrompt = buildTranslationPrompt({
      sourceLanguage: sourceLanguage || 'ko',
      targetLanguage,
      channelType: channelType || 'blog',
      project,
      isNaver,
    });

    const result = await ai.models.generateContentStream({
      model: model || DEFAULT_TEXT_MODEL,
      contents: text,
      config: { systemInstruction: systemPrompt },
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result) {
            const chunkText = chunk.text;
            if (chunkText) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunkText })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'AI 번역 중 오류가 발생했습니다.';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI 요청 처리 중 오류가 발생했습니다.';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
