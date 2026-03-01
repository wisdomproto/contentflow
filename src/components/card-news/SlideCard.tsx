'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { SlideControls } from './SlideControls';
import { Sparkles, Download, RefreshCw } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { useContentStore } from '@/stores/useContentStore';
import type { Slide, SlideType, CardNewsData } from '@/types/card-news';

const SLIDE_TYPE_CONFIG: Record<SlideType, { label: string; color: string }> = {
  cover: { label: '커버', color: 'bg-primary/10 text-primary' },
  body: { label: '본문', color: 'bg-muted text-muted-foreground' },
  outro: { label: '마무리', color: 'bg-accent text-accent-foreground' },
};

interface SlideCardProps {
  slide: Slide;
  index: number;
  settings: Pick<CardNewsData, 'template' | 'colorTheme' | 'font' | 'ratio'>;
  onUpdate: (data: Partial<Slide>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function SlideCard({
  slide,
  index,
  settings,
  onUpdate,
  onDelete,
  onDuplicate,
  dragHandleProps,
}: SlideCardProps) {
  const typeConfig = SLIDE_TYPE_CONFIG[slide.type];
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const activeContentId = useContentStore((s) => s.activeContentId);
  const contents = useContentStore((s) => s.contents);
  const content = activeContentId ? contents[activeContentId] : null;

  const isSquare = settings.ratio === '1:1';

  const generateSlideImage = useCallback(async () => {
    if (!content) return;
    setIsGenerating(true);
    try {
      const ratioText = isSquare ? '정사각형(1:1) 비율' : '세로형(9:16) 비율';
      const basePrompt = slide.imagePlaceholder || `인스타그램 카드뉴스 슬라이드. ${ratioText}. 헤드라인: "${slide.headline}". 본문: "${slide.body}". 깔끔하고 모던한 한국 인스타그램 카드뉴스 디자인.`;

      const prompt = basePrompt.includes('비율')
        ? basePrompt
        : `${basePrompt} ${ratioText}.`;

      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: content.imageModel ?? 'flash-image',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image generation failed');

      const blob = await fetch(
        `data:${data.mimeType};base64,${data.image}`,
      ).then((r) => r.blob());
      const url = URL.createObjectURL(blob);
      onUpdate({ imageUrl: url });
    } catch (err) {
      console.error('Slide image generation failed:', err);
      const msg = err instanceof Error ? err.message : '이미지 생성에 실패했습니다.';
      alert(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [content, slide, isSquare, onUpdate]);

  const handleDownload = useCallback(() => {
    if (!slide.imageUrl) return;
    const link = document.createElement('a');
    link.download = `cardnews-${index + 1}.png`;
    link.href = slide.imageUrl;
    link.click();
  }, [slide.imageUrl, index]);

  return (
    <div className="group relative rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
          <select
            value={slide.type}
            onChange={(e) => onUpdate({ type: e.target.value as SlideType })}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              typeConfig.color,
            )}
          >
            <option value="cover">커버</option>
            <option value="body">본문</option>
            <option value="outro">마무리</option>
          </select>
          <span className="text-xs text-muted-foreground">
            {slide.headline || '(헤드라인 없음)'}
          </span>
        </div>
        <SlideControls
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          dragHandleProps={dragHandleProps}
        />
      </div>

      <div className="p-4">
        {/* Generated Image or Generate Button */}
        <div
          className={cn(
            'relative mb-4 overflow-hidden rounded-lg border border-border bg-muted',
            isSquare ? 'aspect-square' : 'aspect-[9/16]',
          )}
        >
          {slide.imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.imageUrl}
                alt={`슬라이드 ${index + 1}`}
                className="h-full w-full object-cover"
              />
              {/* Overlay buttons */}
              <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={generateSlideImage}
                  disabled={isGenerating}
                  className="rounded-md bg-card/90 p-1.5 text-foreground shadow-sm backdrop-blur-sm hover:bg-card"
                  title="다시 생성"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={handleDownload}
                  className="rounded-md bg-card/90 p-1.5 text-foreground shadow-sm backdrop-blur-sm hover:bg-card"
                  title="다운로드"
                >
                  <Download size={14} />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={generateSlideImage}
              disabled={isGenerating}
              className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {isGenerating ? (
                <>
                  <Spinner size="md" />
                  <span className="text-xs">이미지 생성 중...</span>
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  <span className="text-xs font-medium">AI 이미지 생성</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Text fields + Prompt */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-0.5 block text-xs font-medium text-muted-foreground">헤드라인</label>
              <input
                value={slide.headline}
                onChange={(e) => onUpdate({ headline: e.target.value })}
                placeholder="시선을 사로잡는 제목..."
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm font-bold placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="mb-0.5 block text-xs font-medium text-muted-foreground">본문</label>
              <input
                value={slide.body}
                onChange={(e) => onUpdate({ body: e.target.value })}
                placeholder="간결한 설명..."
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Prompt toggle */}
          <div>
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showPrompt ? '프롬프트 접기 ▲' : '이미지 프롬프트 보기 ▼'}
            </button>
            {showPrompt && (
              <textarea
                value={slide.imagePlaceholder}
                onChange={(e) => onUpdate({ imagePlaceholder: e.target.value })}
                placeholder="AI 이미지 생성 프롬프트..."
                rows={4}
                className="mt-1 w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
