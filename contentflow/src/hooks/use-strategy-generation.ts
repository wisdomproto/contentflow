'use client';

import { useCallback, useRef, useState } from 'react';
import type { StrategyTab, StrategySSEEvent, StrategyInput, KeywordItem, CrawlResult } from '@/types/strategy';

interface UseStrategyGenerationOptions {
  onTabStart?: (tab: StrategyTab) => void;
  onTabComplete?: (tab: StrategyTab, data: unknown) => void;
  onTabError?: (tab: StrategyTab, error: string) => void;
  onComplete?: () => void;
}

export function useStrategyGeneration({
  onTabStart,
  onTabComplete,
  onTabError,
  onComplete,
}: UseStrategyGenerationOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTab, setCurrentTab] = useState<StrategyTab | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (input: StrategyInput, keywordData?: KeywordItem[], crawlData?: CrawlResult[]) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsGenerating(true);

      try {
        const res = await fetch('/api/ai/strategy/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input, keywordData, crawlData }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const error = await res.json();
          onTabError?.('overview', error.error || '생성 실패');
          setIsGenerating(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) return;

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
            try {
              const event: StrategySSEEvent = JSON.parse(trimmed.slice(6));
              switch (event.type) {
                case 'tab_start':
                  setCurrentTab(event.tab);
                  onTabStart?.(event.tab);
                  break;
                case 'tab_complete':
                  onTabComplete?.(event.tab, event.data);
                  break;
                case 'tab_error':
                  onTabError?.(event.tab, event.error);
                  break;
                case 'complete':
                  onComplete?.();
                  break;
              }
            } catch {
              // skip malformed
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          onTabError?.('overview', (err as Error).message);
        }
      } finally {
        setIsGenerating(false);
        setCurrentTab(null);
      }
    },
    [onTabStart, onTabComplete, onTabError, onComplete]
  );

  const regenerateTab = useCallback(
    async (tab: StrategyTab, instruction: string, input: StrategyInput, keywordData?: KeywordItem[]) => {
      setIsGenerating(true);
      setCurrentTab(tab);

      try {
        const res = await fetch('/api/ai/strategy/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tab, instruction, input, keywordData }),
        });

        if (!res.ok) {
          const error = await res.json();
          onTabError?.(tab, error.error || '재생성 실패');
          setIsGenerating(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) return;

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
            try {
              const event: StrategySSEEvent = JSON.parse(trimmed.slice(6));
              if (event.type === 'tab_complete') onTabComplete?.(event.tab, event.data);
              if (event.type === 'tab_error') onTabError?.(event.tab, event.error);
            } catch {
              // skip
            }
          }
        }
      } catch (err) {
        onTabError?.(tab, (err as Error).message);
      } finally {
        setIsGenerating(false);
        setCurrentTab(null);
      }
    },
    [onTabComplete, onTabError]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setCurrentTab(null);
  }, []);

  return { isGenerating, currentTab, generate, regenerateTab, abort };
}
