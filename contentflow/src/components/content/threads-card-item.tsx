'use client';

import { useRef, useEffect, useState } from 'react';
import { GripVertical, Trash2, Plus, ImageIcon, Wand2, X, Loader2, ChevronDown, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ImageLightbox } from './image-lightbox';
import type { ThreadsCard } from '@/types/database';
import { cn } from '@/lib/utils';

const MAX_CHARS = 500;

interface ThreadsCardItemProps {
  card: ThreadsCard;
  index: number;
  isLast: boolean;
  onUpdate: (cardId: string, updates: Partial<ThreadsCard>) => void;
  onDelete: (cardId: string) => void;
  onGenerateImage?: (cardId: string) => void;
  isGeneratingImage?: boolean;
  generatingCardId?: string | null;
}

export function ThreadsCardItem({
  card, index, isLast, onUpdate, onDelete,
  onGenerateImage, isGeneratingImage, generatingCardId,
}: ThreadsCardItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const charCount = card.text_content?.length ?? 0;
  const isOverLimit = charCount > MAX_CHARS;
  const hasMedia = !!card.media_url;
  const isThisCardGenerating = isGeneratingImage && generatingCardId === card.id;

  const [showPrompt, setShowPrompt] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [showLightbox, setShowLightbox] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [card.text_content]);

  return (
    <div className="relative flex gap-3">
      {/* Connection line + number */}
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold shrink-0">
          {index + 1}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border mt-1" />
        )}
      </div>

      {/* Post content */}
      <div className="flex-1 pb-6 group">
        <div className="rounded-xl border border-border bg-background p-4 transition-all hover:shadow-md">
          {/* Drag handle + delete */}
          <div className="flex items-center justify-between mb-2">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-muted-foreground">
              <GripVertical size={14} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(card.id)}
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={14} />
            </Button>
          </div>

          {/* Text area */}
          <textarea
            ref={textareaRef}
            value={card.text_content ?? ''}
            onChange={(e) => onUpdate(card.id, { text_content: e.target.value })}
            placeholder="포스트 내용을 입력하세요..."
            className="w-full bg-transparent text-sm resize-none focus:outline-none min-h-[60px] placeholder:text-muted-foreground/50"
            rows={2}
          />

          {/* Media area */}
          {hasMedia && (
            <div className="relative mt-3 rounded-lg overflow-hidden border border-border group/img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.media_url!}
                alt={`포스트 ${index + 1} 이미지`}
                className="w-full max-h-48 object-cover cursor-pointer"
                onClick={() => setShowLightbox(true)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover/img:opacity-100">
                <Button variant="secondary" size="sm" onClick={() => setShowLightbox(true)} className="h-7 text-xs gap-1">
                  <ZoomIn size={12} /> 확대
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onUpdate(card.id, { media_url: null, media_type: null })} className="h-7 text-xs gap-1">
                  <X size={12} /> 삭제
                </Button>
              </div>
              <ImageLightbox open={showLightbox} onOpenChange={setShowLightbox} src={card.media_url!} alt={`포스트 ${index + 1}`} />
            </div>
          )}

          {/* Image prompt section */}
          {!hasMedia && (
            <div className="mt-3">
              <button
                onClick={() => setShowPrompt(!showPrompt)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown size={12} className={cn('transition-transform', !showPrompt && '-rotate-90')} />
                <ImageIcon size={12} />
                이미지 첨부
              </button>
              {showPrompt && (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="이미지 생성 프롬프트 (영어 권장)..."
                    className="h-16 resize-none text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!imagePrompt.trim() || isThisCardGenerating}
                    onClick={() => {
                      onUpdate(card.id, { media_type: imagePrompt });
                      onGenerateImage?.(card.id);
                    }}
                    className="gap-1.5 text-xs"
                  >
                    {isThisCardGenerating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    {isThisCardGenerating ? '생성 중...' : '이미지 생성'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Footer: char count */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
            <span className={`text-xs ${isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              {charCount}/{MAX_CHARS}
            </span>
            {hasMedia && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ImageIcon size={10} /> 이미지 첨부됨
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add post button
interface AddPostButtonProps {
  onAdd: () => void;
}

export function AddPostButton({ onAdd }: AddPostButtonProps) {
  return (
    <div className="flex justify-center py-3">
      <Button variant="outline" onClick={onAdd} className="gap-2 rounded-full px-6 text-sm">
        <Plus size={16} /> 포스트 추가
      </Button>
    </div>
  );
}
