'use client';

import { useCallback } from 'react';
import { DndContext } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Download } from 'lucide-react';
import { useContentStore } from '@/stores/useContentStore';
import { useDragReorder } from '@/hooks/useDragReorder';
import { CardNewsToolbar } from './CardNewsToolbar';
import { SlideCard } from './SlideCard';
import { AddSlideButton } from './AddSlideButton';
import { toast } from '@/components/ui/Toast';
import type { Slide, CardNewsData } from '@/types/card-news';

function SortableSlide({
  slide,
  index,
  contentId,
  settings,
}: {
  slide: Slide;
  index: number;
  contentId: string;
  settings: Pick<CardNewsData, 'template' | 'colorTheme' | 'font' | 'ratio'>;
}) {
  const updateSlide = useContentStore((s) => s.updateSlide);
  const deleteSlide = useContentStore((s) => s.deleteSlide);
  const duplicateSlide = useContentStore((s) => s.duplicateSlide);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = () => {
    deleteSlide(contentId, slide.id);
    toast('슬라이드가 삭제되었습니다', 'info');
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SlideCard
        slide={slide}
        index={index}
        settings={settings}
        onUpdate={(data) => updateSlide(contentId, slide.id, data)}
        onDelete={handleDelete}
        onDuplicate={() => duplicateSlide(contentId, slide.id)}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function CardNewsEditor() {
  const activeContentId = useContentStore((s) => s.activeContentId);
  const contents = useContentStore((s) => s.contents);
  const addSlide = useContentStore((s) => s.addSlide);
  const reorderSlides = useContentStore((s) => s.reorderSlides);
  const updateCardNewsSettings = useContentStore((s) => s.updateCardNewsSettings);

  const content = activeContentId ? contents[activeContentId] : null;
  const cardnews = content?.cardnews;

  const { sensors, handleDragEnd, closestCenter } = useDragReorder(
    cardnews?.slides ?? [],
    (ids) => content && reorderSlides(content.id, ids),
  );

  const handleDownloadAll = useCallback(async () => {
    if (!cardnews) return;
    const slidesWithImages = cardnews.slides.filter((s) => s.imageUrl);
    if (slidesWithImages.length === 0) {
      toast('다운로드할 이미지가 없습니다. 먼저 슬라이드 이미지를 생성해주세요.', 'info');
      return;
    }

    for (let i = 0; i < cardnews.slides.length; i++) {
      const slide = cardnews.slides[i];
      if (!slide.imageUrl) continue;
      const link = document.createElement('a');
      link.download = `cardnews-${i + 1}.png`;
      link.href = slide.imageUrl;
      link.click();
      await new Promise((r) => setTimeout(r, 300));
    }
    toast('전체 슬라이드 다운로드 완료', 'success');
  }, [cardnews]);

  if (!content || !cardnews) return null;

  const settings = {
    template: cardnews.template,
    colorTheme: cardnews.colorTheme,
    font: cardnews.font,
    ratio: cardnews.ratio,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <CardNewsToolbar
          settings={settings}
          onUpdate={(s) => updateCardNewsSettings(content.id, s)}
        />
        <button
          onClick={handleDownloadAll}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="전체 슬라이드 다운로드"
        >
          <Download size={14} />
          전체 다운로드
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={cardnews.slides.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {cardnews.slides.map((slide, index) => (
              <SortableSlide
                key={slide.id}
                slide={slide}
                index={index}
                contentId={content.id}
                settings={settings}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AddSlideButton onClick={() => addSlide(content.id)} />
    </div>
  );
}
