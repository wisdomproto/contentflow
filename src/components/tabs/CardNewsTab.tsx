'use client';

import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { ImageIcon, Sparkles, LayoutGrid } from 'lucide-react';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ImageModelSelector } from '@/components/ui/ImageModelSelector';
import { Spinner } from '@/components/ui/Spinner';
import { useContentStore } from '@/stores/useContentStore';
import { CardNewsEditor } from '@/components/card-news/CardNewsEditor';
import type { CardNewsData } from '@/types/card-news';

export function CardNewsTab() {
  const activeContentId = useContentStore((s) => s.activeContentId);
  const contents = useContentStore((s) => s.contents);
  const setCardNewsData = useContentStore((s) => s.setCardNewsData);
  const content = activeContentId ? contents[activeContentId] : null;

  const [isGenerating, setIsGenerating] = useState(false);

  const hasBlog = content
    ? content.blog.title || content.blog.sections.some((s) => s.text)
    : false;
  const hasCardNews = content?.cardnews && content.cardnews.slides.length > 0;

  const handleGenerate = useCallback(async () => {
    if (!activeContentId || !content) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-cardnews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: content.source.topic,
          blogTitle: content.blog.title,
          blogSections: content.blog.sections.map((s) => ({
            type: s.type,
            header: s.header,
            text: s.text,
          })),
          keywords: content.source.keywords,
          tone: content.source.tone,
          model: content.modelSettings?.cardnews ?? 'flash',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API error');

      const cardNewsData: CardNewsData = {
        slides: data.slides,
        template: 'minimal',
        colorTheme: 'white',
        font: 'pretendard',
        ratio: '1:1',
      };
      setCardNewsData(activeContentId, cardNewsData);
    } catch (err) {
      console.error('Card news generation failed:', err);
      const msg = err instanceof Error ? err.message : '카드뉴스 생성에 실패했습니다.';
      alert(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [activeContentId, content, setCardNewsData]);

  const handleStartEmpty = useCallback(() => {
    if (!activeContentId) return;
    const cardNewsData: CardNewsData = {
      slides: [
        { id: nanoid(), type: 'cover', headline: '', body: '', imageUrl: null, imagePlaceholder: '' },
        { id: nanoid(), type: 'body', headline: '', body: '', imageUrl: null, imagePlaceholder: '' },
        { id: nanoid(), type: 'body', headline: '', body: '', imageUrl: null, imagePlaceholder: '' },
        { id: nanoid(), type: 'outro', headline: '', body: '', imageUrl: null, imagePlaceholder: '' },
      ],
      template: 'minimal',
      colorTheme: 'white',
      font: 'pretendard',
      ratio: '1:1',
    };
    setCardNewsData(activeContentId, cardNewsData);
  }, [activeContentId, setCardNewsData]);

  // No content selected
  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 text-4xl">📝</div>
        <h2 className="mb-2 text-lg font-semibold">컨텐츠를 선택해주세요</h2>
        <p className="text-sm text-muted-foreground">
          사이드바에서 컨텐츠를 선택하거나
          <br />
          기본 설정 탭에서 AI 초안을 생성하세요
        </p>
      </div>
    );
  }

  // No card news yet — show generation options
  if (!hasCardNews) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        {content && (
          <div className="mb-6 self-end px-6">
            <ModelSelector
              tab="cardnews"
              contentId={content.id}
              currentModel={content.modelSettings?.cardnews ?? 'flash'}
              compact
            />
          </div>
        )}

        <div className="mb-4 rounded-full bg-muted p-4">
          <ImageIcon size={32} className="text-muted-foreground" />
        </div>

        {hasBlog ? (
          <>
            <h2 className="mb-2 text-lg font-semibold">카드뉴스를 만들어보세요</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              블로그 본문을 인스타그램 최적화 카드뉴스로
              <br />
              자동 변환합니다
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Spinner size="sm" />
                    AI 카드뉴스 생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    AI 카드뉴스 생성
                  </>
                )}
              </button>
              <button
                onClick={handleStartEmpty}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                <LayoutGrid size={16} />
                빈 슬라이드부터 시작
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-2 text-lg font-semibold">블로그 초안을 먼저 생성해주세요</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              기본 설정 탭에서 AI 블로그 초안을 만들면
              <br />
              카드뉴스로 자동 변환할 수 있습니다
            </p>
            <button
              onClick={handleStartEmpty}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              <LayoutGrid size={16} />
              빈 슬라이드부터 시작
            </button>
          </>
        )}
      </div>
    );
  }

  // Card news exists — show editor
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-end gap-3 rounded-lg border border-border bg-card px-4 py-2 shadow-sm">
        <span className="text-xs text-muted-foreground">텍스트</span>
        <ModelSelector
          tab="cardnews"
          contentId={content.id}
          currentModel={content.modelSettings?.cardnews ?? 'flash'}
          compact
        />
        <div className="h-4 w-px bg-border" />
        <span className="text-xs text-muted-foreground">이미지</span>
        <ImageModelSelector
          contentId={content.id}
          currentModel={content.imageModel ?? 'flash-image'}
        />
      </div>
      <CardNewsEditor />
    </div>
  );
}
