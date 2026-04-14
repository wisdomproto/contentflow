import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';
import { buildTranslationPrompt } from '@/lib/translation-prompt-builder';
import { DEFAULT_TEXT_MODEL } from '@/lib/ai-models';
import {
  jsonError,
  requireEnv,
  SSE_HEADERS,
  isTransientProviderError,
} from '@/lib/api-helpers';

const MAX_RETRIES = 2;
const RETRY_DELAY = 3000;

export async function POST(req: NextRequest) {
  const envError = requireEnv('GEMINI_API_KEY');
  if (envError) return envError;
  const apiKey = process.env.GEMINI_API_KEY!;

  try {
    const { text, sourceLanguage, targetLanguage, channelType, model, project, isNaver } =
      await req.json();

    if (!text || !targetLanguage) {
      return jsonError('text and targetLanguage required', 400);
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemPrompt = buildTranslationPrompt({
      sourceLanguage: sourceLanguage || 'ko',
      targetLanguage,
      channelType: channelType || 'blog',
      project,
      isNaver,
    });

    let result: Awaited<ReturnType<typeof ai.models.generateContentStream>> | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        result = await ai.models.generateContentStream({
          model: model || DEFAULT_TEXT_MODEL,
          contents: text,
          config: { systemInstruction: systemPrompt },
        });
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (isTransientProviderError(err) && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    if (!result) throw lastError ?? new Error('AI 스트림 시작 실패');

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result!) {
            const chunkText = chunk.text;
            if (chunkText) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: chunkText })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'AI 번역 중 오류가 발생했습니다.';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI 요청 처리 중 오류가 발생했습니다.';
    return jsonError(msg, 500);
  }
}
