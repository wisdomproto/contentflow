'use client';

import { Plus, Trash2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { YoutubeCard } from '@/types/database';

export const SECTION_TYPES = [
  { value: 'hook', label: '훅', color: 'bg-red-500', textColor: 'text-red-600' },
  { value: 'intro', label: '인트로', color: 'bg-blue-500', textColor: 'text-blue-600' },
  { value: 'main', label: '메인', color: 'bg-green-500', textColor: 'text-green-600' },
  { value: 'example', label: '사례', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  { value: 'summary', label: '요약', color: 'bg-purple-500', textColor: 'text-purple-600' },
  { value: 'cta', label: 'CTA', color: 'bg-orange-500', textColor: 'text-orange-600' },
] as const;

export function getSectionInfo(type: string | null) {
  return SECTION_TYPES.find((s) => s.value === type) ?? { value: 'main', label: '메인', color: 'bg-green-500', textColor: 'text-green-600' };
}

// ─── Timeline Thumbnail Card ─────────────────────────────────────

interface TimelineCardProps {
  card: YoutubeCard;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onDelete: (cardId: string) => void;
}

export function TimelineCard({ card, index, isSelected, onClick, onDelete }: TimelineCardProps) {
  const sectionInfo = getSectionInfo(card.section_type);
  const charCount = card.narration_text?.length ?? 0;
  const estimatedSec = Math.max(1, Math.round(charCount / (250 / 60))); // ~250자/분

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative group flex-shrink-0 w-32 cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:shadow-md',
        isSelected ? 'border-primary shadow-md' : 'border-border hover:border-primary/50'
      )}
    >
      {/* Thumbnail area (16:9) */}
      <div className="relative aspect-video bg-muted/50">
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={`씬 ${index + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={20} className="text-muted-foreground/30" />
          </div>
        )}

        {/* Section badge overlay */}
        <div className="absolute top-1 left-1">
          <span className={cn(
            'text-[9px] font-bold px-1.5 py-0.5 rounded text-white',
            sectionInfo.color
          )}>
            {sectionInfo.label}
          </span>
        </div>

        {/* Index badge */}
        <div className="absolute top-1 right-1">
          <span className="text-[9px] font-mono bg-black/50 text-white px-1 rounded">
            {index + 1}
          </span>
        </div>

        {/* Delete button (hover) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
          className="absolute bottom-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-red-500 text-white hover:text-white rounded-full"
        >
          <Trash2 size={10} />
        </Button>
      </div>

      {/* Bottom info */}
      <div className="px-1.5 py-1 bg-background">
        <p className="text-[10px] text-muted-foreground truncate">
          {card.narration_text?.slice(0, 30) || '(빈 나레이션)'}
        </p>
        <span className="text-[9px] text-muted-foreground/70">~{estimatedSec}초</span>
      </div>
    </div>
  );
}

// ─── Add Scene Button (for timeline) ─────────────────────────────

interface AddSceneButtonProps {
  onAdd: () => void;
}

export function AddSceneButton({ onAdd }: AddSceneButtonProps) {
  return (
    <button
      onClick={onAdd}
      className="flex-shrink-0 w-32 aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
    >
      <Plus size={20} />
      <span className="text-[10px]">씬 추가</span>
    </button>
  );
}
