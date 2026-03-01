'use client';

import { useContentStore } from '@/stores/useContentStore';
import { SlidePreview } from './SlidePreview';

export function CardNewsPreviewPanel() {
  const activeContentId = useContentStore((s) => s.activeContentId);
  const contents = useContentStore((s) => s.contents);
  const content = activeContentId ? contents[activeContentId] : null;
  const cardnews = content?.cardnews;

  if (!cardnews || cardnews.slides.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        카드뉴스를 생성하면 미리보기가 표시됩니다
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">카드뉴스 미리보기</h3>
        <span className="text-xs text-muted-foreground">
          {cardnews.slides.length}장
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {cardnews.slides.map((slide, index) => (
          <div key={slide.id} className="flex items-start gap-2">
            <span className="mt-1 shrink-0 text-xs font-medium text-muted-foreground">
              {index + 1}
            </span>
            <div className="flex-1">
              <SlidePreview
                slide={slide}
                settings={{
                  template: cardnews.template,
                  colorTheme: cardnews.colorTheme,
                  font: cardnews.font,
                  ratio: cardnews.ratio,
                }}
                size="sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
