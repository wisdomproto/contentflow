'use client';

import { cn } from '@/lib/utils';
import { SlideControls } from './SlideControls';
import { SectionImage } from '@/components/blog/SectionImage';
import type { Slide, SlideType } from '@/types/card-news';

const SLIDE_TYPE_CONFIG: Record<SlideType, { label: string; color: string }> = {
  cover: { label: '커버', color: 'bg-primary/10 text-primary' },
  body: { label: '본문', color: 'bg-muted text-muted-foreground' },
  outro: { label: '마무리', color: 'bg-accent text-accent-foreground' },
};

interface SlideCardProps {
  slide: Slide;
  index: number;
  onUpdate: (data: Partial<Slide>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function SlideCard({
  slide,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
  dragHandleProps,
}: SlideCardProps) {
  const typeConfig = SLIDE_TYPE_CONFIG[slide.type];

  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
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
        </div>
        <SlideControls
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          dragHandleProps={dragHandleProps}
        />
      </div>

      <div className="flex flex-col gap-3">
        <SectionImage
          imageUrl={slide.imageUrl}
          placeholder={slide.imagePlaceholder}
          onImageChange={(url) => onUpdate({ imageUrl: url })}
          sectionHeader={slide.headline}
          sectionText={slide.body}
        />

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">헤드라인</label>
            <span className={cn(
              'text-xs',
              slide.headline.length > 20 ? 'text-destructive' : 'text-muted-foreground',
            )}>
              {slide.headline.length}/20
            </span>
          </div>
          <input
            value={slide.headline}
            onChange={(e) => onUpdate({ headline: e.target.value })}
            placeholder="시선을 사로잡는 제목..."
            className="w-full bg-transparent text-base font-bold placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">본문</label>
            <span className={cn(
              'text-xs',
              slide.body.length > 60 ? 'text-destructive' : 'text-muted-foreground',
            )}>
              {slide.body.length}/60
            </span>
          </div>
          <textarea
            value={slide.body}
            onChange={(e) => onUpdate({ body: e.target.value })}
            placeholder="간결한 설명..."
            rows={2}
            className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
