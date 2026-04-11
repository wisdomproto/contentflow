'use client';

import { useRef, useState, useCallback } from 'react';
import type { AspectRatio, ImageSize } from '@/lib/ai/types';

export interface ImagePrompt {
  slideIndex: number;
  prompt: string;
  referenceImage?: string; // base64 data URL
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
}

export interface GeneratedImage {
  slideIndex: number;
  base64: string;
  mimeType: string;
}

export interface ImageGenerationProgress {
  current: number;
  total: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000]; // exponential backoff

async function fetchImageWithRetry(
  prompt: ImagePrompt,
  model: string | undefined,
  signal: AbortSignal
): Promise<{ image: string; mimeType: string } | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.prompt,
          ...(model && { model }),
          ...(prompt.referenceImage && { referenceImage: prompt.referenceImage }),
          ...(prompt.aspectRatio && { aspectRatio: prompt.aspectRatio }),
          ...(prompt.imageSize && { imageSize: prompt.imageSize }),
        }),
        signal,
      });

      if (res.ok) {
        return await res.json();
      }

      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      lastError = new Error(data.error || `이미지 생성 실패 (HTTP ${res.status})`);

      // 503 (서버 과부하) or 429 (rate limit) → retry
      if ((res.status === 503 || res.status === 429) && attempt < MAX_RETRIES) {
        console.warn(`[image-gen] ${res.status} error, retry ${attempt + 1}/${MAX_RETRIES} in ${RETRY_DELAYS[attempt]}ms`);
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }

      // Other errors → no retry
      throw lastError;
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      lastError = err as Error;
      if (attempt < MAX_RETRIES) {
        console.warn(`[image-gen] Error, retry ${attempt + 1}/${MAX_RETRIES}:`, (err as Error).message);
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw lastError;
    }
  }

  return null;
}

export function useImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ImageGenerationProgress>({ current: 0, total: 0 });
  const abortRef = useRef<AbortController | null>(null);

  const generateImages = useCallback(
    async (prompts: ImagePrompt[], model?: string): Promise<GeneratedImage[]> => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsGenerating(true);
      setProgress({ current: 0, total: prompts.length });

      const results: GeneratedImage[] = [];

      try {
        for (let i = 0; i < prompts.length; i++) {
          if (controller.signal.aborted) break;

          setProgress({ current: i + 1, total: prompts.length });

          const data = await fetchImageWithRetry(prompts[i], model, controller.signal);
          if (data) {
            results.push({
              slideIndex: prompts[i].slideIndex,
              base64: data.image,
              mimeType: data.mimeType,
            });
          }
        }

        return results;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return results;
        }
        throw err;
      } finally {
        setIsGenerating(false);
        setProgress({ current: 0, total: 0 });
      }
    },
    []
  );

  const generateSingleImage = useCallback(
    async (prompt: string, model?: string, aspectRatio?: AspectRatio): Promise<GeneratedImage> => {
      const results = await generateImages(
        [{ slideIndex: 0, prompt, aspectRatio }],
        model
      );
      return results[0];
    },
    [generateImages]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setProgress({ current: 0, total: 0 });
  }, []);

  return { isGenerating, progress, generateImages, generateSingleImage, abort };
}
