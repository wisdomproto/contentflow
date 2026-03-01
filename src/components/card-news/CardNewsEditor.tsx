'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useContentStore } from '@/stores/useContentStore';
import { CardNewsToolbar } from './CardNewsToolbar';
import { SlideCard } from './SlideCard';
import { AddSlideButton } from './AddSlideButton';
import { toast } from '@/components/ui/Toast';
import type { Slide } from '@/types/card-news';

function SortableSlide({
  slide,
  index,
  contentId,
}: {
  slide: Slide;
  index: number;
  contentId: string;
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!content || !cardnews) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = cardnews.slides.findIndex((s) => s.id === active.id);
      const newIndex = cardnews.slides.findIndex((s) => s.id === over.id);
      const newOrder = [...cardnews.slides];
      const [moved] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, moved);
      reorderSlides(content.id, newOrder.map((s) => s.id));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <CardNewsToolbar
        settings={{
          template: cardnews.template,
          colorTheme: cardnews.colorTheme,
          font: cardnews.font,
          ratio: cardnews.ratio,
        }}
        onUpdate={(settings) => updateCardNewsSettings(content.id, settings)}
      />

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
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AddSlideButton onClick={() => addSlide(content.id)} />
    </div>
  );
}
