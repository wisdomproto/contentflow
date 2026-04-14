'use client';

import { useRef, useState, useCallback } from 'react';
import { parseSSEStream } from '@/lib/sse-stream-parser';

interface UseAiGenerationOptions {
  onChunk?: (text: string, accumulated: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: string) => void;
}

export function useAiGeneration({ onChunk, onComplete, onError }: UseAiGenerationOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (prompt: string, model?: string) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsGenerating(true);
      let accumulated = '';

      try {
        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, ...(model && { model }) }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
        }

        let streamError: string | null = null;
        await parseSSEStream(res, {
          signal: controller.signal,
          onChunk: (chunk) => {
            if (chunk.error) {
              streamError = chunk.error;
              return;
            }
            if (chunk.text) {
              accumulated += chunk.text;
              onChunk?.(chunk.text, accumulated);
            }
          },
        });

        if (streamError) throw new Error(streamError);
        onComplete?.(accumulated);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          onError?.((err as Error).message || 'AI 생성 중 오류가 발생했습니다.');
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [onChunk, onComplete, onError]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
  }, []);

  return { isGenerating, generate, abort };
}
