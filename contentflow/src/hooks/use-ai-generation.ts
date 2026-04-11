'use client';

import { useRef, useState, useCallback } from 'react';

interface UseAiGenerationOptions {
  onChunk?: (text: string, accumulated: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: string) => void;
}

export function useAiGeneration({ onChunk, onComplete, onError }: UseAiGenerationOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const accumulatedRef = useRef('');

  const generate = useCallback(
    async (prompt: string, model?: string) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      accumulatedRef.current = '';
      setIsGenerating(true);

      try {
        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, ...(model && { model }) }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('스트림을 읽을 수 없습니다.');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const payload = trimmed.slice(6);

            if (payload === '[DONE]') {
              onComplete?.(accumulatedRef.current);
              setIsGenerating(false);
              return;
            }

            try {
              const parsed = JSON.parse(payload);
              if (parsed.error) {
                onError?.(parsed.error);
                setIsGenerating(false);
                return;
              }
              if (parsed.text) {
                accumulatedRef.current += parsed.text;
                onChunk?.(parsed.text, accumulatedRef.current);
              }
            } catch {
              // skip malformed JSON
            }
          }
        }

        // If stream ended without [DONE]
        if (accumulatedRef.current) {
          onComplete?.(accumulatedRef.current);
        }
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
