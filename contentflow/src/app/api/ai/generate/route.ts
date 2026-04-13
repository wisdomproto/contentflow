import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';
import { DEFAULT_TEXT_MODEL } from '@/lib/ai-models';

// Fallback model chain: if primary fails with 503, try next
const FALLBACK_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
];

const MAX_RETRIES = 2;
const RETRY_DELAY = 3000; // 3 seconds

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다. .env.local 파일에 설정해 주세요.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { prompt, model = DEFAULT_TEXT_MODEL } = await req.json();
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: '프롬프트가 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Try primary model with retries, then fallback models
    const modelsToTry = [model, ...FALLBACK_MODELS.filter(m => m !== model)];
    let lastError: Error | null = null;

    for (const currentModel of modelsToTry) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const result = await ai.models.generateContentStream({
            model: currentModel,
            contents: prompt,
          });

          // Stream succeeded — return it
          const usedModel = currentModel !== model ? currentModel : undefined;
          const stream = new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder();
              try {
                if (usedModel) {
                  // Notify client which fallback model was used
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: `[모델: ${usedModel}] ` })}\n\n`));
                }
                for await (const chunk of result) {
                  const text = chunk.text;
                  if (text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                  }
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              } catch (err) {
                const msg = err instanceof Error ? err.message : 'AI 생성 중 오류가 발생했습니다.';
                // Check if it's a 503 during streaming
                if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `503 재시도 중... (${currentModel})` })}\n\n`));
                  throw err; // Will be caught by outer retry loop
                }
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
          lastError = err instanceof Error ? err : new Error(String(err));
          const msg = lastError.message;
          const is503 = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand') || msg.includes('overloaded');

          if (is503 && attempt < MAX_RETRIES) {
            // Retry same model after delay
            await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
            continue;
          }

          if (is503) {
            // Move to next fallback model
            break;
          }

          // Non-503 error — don't retry
          throw err;
        }
      }
    }

    // All models failed
    const msg = lastError?.message || 'All models unavailable';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI 요청 처리 중 오류가 발생했습니다.';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
