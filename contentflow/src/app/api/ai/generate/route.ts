import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';
import { DEFAULT_TEXT_MODEL } from '@/lib/ai-models';
import {
  jsonError,
  requireEnv,
  SSE_HEADERS,
  isTransientProviderError,
} from '@/lib/api-helpers';

const FALLBACK_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
];

const MAX_RETRIES = 2;
const RETRY_DELAY = 3000;

export async function POST(req: NextRequest) {
  const envError = requireEnv('GEMINI_API_KEY');
  if (envError) return envError;
  const apiKey = process.env.GEMINI_API_KEY!;

  try {
    const { prompt, model = DEFAULT_TEXT_MODEL } = await req.json();
    if (!prompt) return jsonError('프롬프트가 필요합니다.', 400);

    const ai = new GoogleGenAI({ apiKey });

    const modelsToTry = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];
    let lastError: Error | null = null;

    for (const currentModel of modelsToTry) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const result = await ai.models.generateContentStream({
            model: currentModel,
            contents: prompt,
          });

          const usedModel = currentModel !== model ? currentModel : undefined;
          const stream = new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder();
              try {
                if (usedModel) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text: `[모델: ${usedModel}] ` })}\n\n`)
                  );
                }
                for await (const chunk of result) {
                  const text = chunk.text;
                  if (text) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                    );
                  }
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              } catch (err) {
                const msg = err instanceof Error ? err.message : 'AI 생성 중 오류가 발생했습니다.';
                if (isTransientProviderError(err)) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ error: `503 재시도 중... (${currentModel})` })}\n\n`
                    )
                  );
                  throw err;
                }
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
          lastError = err instanceof Error ? err : new Error(String(err));
          if (isTransientProviderError(err)) {
            if (attempt < MAX_RETRIES) {
              await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)));
              continue;
            }
            break; // move to next fallback model
          }
          throw err;
        }
      }
    }

    return jsonError(lastError?.message || 'All models unavailable', 503);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI 요청 처리 중 오류가 발생했습니다.';
    return jsonError(msg, 500);
  }
}
