'use client';

import { useState, useCallback, useRef } from 'react';
import { useImageGeneration, type ImageGenerationProgress } from './use-image-generation';
import { base64ToBlob } from './use-r2-upload';
import type { AspectRatio } from '@/lib/ai/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CardImageConfig {
  /** 카드에서 이미지 프롬프트를 추출/생성하는 함수 */
  getPrompt: (card: any) => string;
  /** 카드에서 기존 이미지 URL을 추출 (재생성 시 referenceImage로 전달) */
  getExistingImage: (card: any) => string | null;
  /** 생성 결과를 저장하는 함수 */
  saveResult: (cardId: string, dataUrl: string, prompt: string) => void;
  /** 배치 생성 시 스킵 조건 (기존 이미지가 있으면 true) */
  shouldSkip?: (card: any) => boolean;
  /** 이미지 모델 ID */
  imageModel: string;
  /** 이미지 비율 (예: '16:9', '1:1') */
  aspectRatio: string;
  /** 이미지 스타일 (예: 'realistic') */
  imageStyle: string;
  /** 패널 레벨 참조 이미지 (카드뉴스 등) */
  referenceImage?: string;
  /** R2 업로드 경로 구성을 위한 프로젝트 ID */
  projectId: string;
}

export interface UseCardImageGenerationReturn {
  isGeneratingImage: boolean;
  generatingCardId: string | null;
  imageProgress: ImageGenerationProgress;
  generateCardImage: (cardId: string, cards: any[], isBatch?: boolean) => Promise<void>;
  generateAllImages: (cards: any[]) => Promise<void>;
  abort: () => void;
}

export function useCardImageGeneration(config: CardImageConfig): UseCardImageGenerationReturn {
  const { isGenerating: isGeneratingImage, generateImages, abort: abortGeneration } = useImageGeneration();
  const [generatingCardId, setGeneratingCardId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<ImageGenerationProgress>({ current: 0, total: 0 });
  const configRef = useRef(config);
  configRef.current = config;

  const generateCardImage = useCallback(
    async (cardId: string, cards: any[], isBatch = false) => {
      const cfg = configRef.current;
      const card = cards.find((c: any) => c.id === cardId);
      if (!card) return;

      const prompt = cfg.getPrompt(card);

      // 재생성 시 이전 이미지를 참조 이미지로 전달
      const existingImage = cfg.getExistingImage(card);
      // 패널 레벨 참조 이미지가 있으면 우선, 없으면 기존 이미지 사용
      const refImage = cfg.referenceImage || existingImage || undefined;

      setGeneratingCardId(cardId);
      try {
        const results = await generateImages(
          [{
            slideIndex: 0,
            prompt,
            aspectRatio: cfg.aspectRatio as AspectRatio,
            referenceImage: refImage,
          }],
          cfg.imageModel
        );
        if (results[0]) {
          const blob = base64ToBlob(results[0].base64, results[0].mimeType);
          let savedUrl: string;
          try {
            const presignRes = await fetch('/api/storage/presign', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: cfg.projectId,
                category: 'images',
                fileName: `${cardId}.${results[0].mimeType.split('/')[1] || 'png'}`,
                contentType: results[0].mimeType,
                contentId: cardId,
              }),
            });
            if (presignRes.ok) {
              const { presignedUrl, publicUrl } = await presignRes.json();
              const uploadRes = await fetch(presignedUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'Content-Type': results[0].mimeType },
              });
              savedUrl = uploadRes.ok ? publicUrl : `data:${results[0].mimeType};base64,${results[0].base64}`;
            } else {
              savedUrl = `data:${results[0].mimeType};base64,${results[0].base64}`;
            }
          } catch {
            savedUrl = `data:${results[0].mimeType};base64,${results[0].base64}`;
          }
          cfg.saveResult(cardId, savedUrl, prompt);
        }
      } catch (err) {
        if (!isBatch) alert(`이미지 생성 오류: ${(err as Error).message}`);
        throw err;
      } finally {
        setGeneratingCardId(null);
      }
    },
    [generateImages]
  );

  const generateAllImages = useCallback(
    async (cards: any[]) => {
      if (cards.length === 0) return;
      const cfg = configRef.current;
      const targets = cards.filter(c => !cfg.shouldSkip?.(c));
      const total = targets.length;
      if (total === 0) return;
      const failed: number[] = [];
      setBatchProgress({ current: 0, total });
      for (let i = 0; i < targets.length; i++) {
        setBatchProgress({ current: i, total });
        try {
          await generateCardImage(targets[i].id, cards, true);
        } catch {
          failed.push(i + 1);
        }
        setBatchProgress({ current: i + 1, total });
      }
      if (failed.length > 0) {
        alert(`이미지 생성 완료 (${total - failed.length}/${total} 성공)\n실패한 씬: ${failed.join(', ')}번`);
      }
    },
    [generateCardImage]
  );

  const abort = useCallback(() => {
    abortGeneration();
    setGeneratingCardId(null);
  }, [abortGeneration]);

  return {
    isGeneratingImage,
    generatingCardId,
    imageProgress: batchProgress.total > 0 ? batchProgress : { current: 0, total: 1 },
    generateCardImage,
    generateAllImages,
    abort,
  };
}
