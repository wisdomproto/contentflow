import { NextResponse } from 'next/server';

/**
 * Handles common Gemini API errors and returns appropriate NextResponse.
 * Used by all AI API routes for consistent error handling.
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  console.error(`${context}:`, error);
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

/**
 * Parses JSON from Gemini text response (handles markdown code blocks).
 * Returns null if no valid JSON found.
 */
export function parseGeminiJson(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
