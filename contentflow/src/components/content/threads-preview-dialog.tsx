'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, Heart, MessageCircle, Repeat2, Send } from 'lucide-react';
import type { ThreadsCard } from '@/types/database';

interface ThreadsPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: ThreadsCard[];
}

export function ThreadsPreviewDialog({ open, onOpenChange, cards }: ThreadsPreviewDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = cards
      .map((card, i) => `[${i + 1}/${cards.length}]\n${card.text_content}`)
      .join('\n\n---\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>스레드 미리보기</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          <div className="space-y-0">
            {cards.map((card, i) => (
              <ThreadsPostPreview
                key={card.id}
                card={card}
                isLast={i === cards.length - 1}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '복사됨!' : '텍스트 복사'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThreadsPostPreview({ card, isLast }: { card: ThreadsCard; isLast: boolean }) {
  return (
    <div className="flex gap-3 px-2">
      {/* Avatar + connection line */}
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-200 dark:to-gray-400 flex items-center justify-center text-white dark:text-gray-900 text-xs font-bold shrink-0">
          @
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border my-1" />
        )}
      </div>

      {/* Post content */}
      <div className={`flex-1 ${isLast ? 'pb-4' : 'pb-2'}`}>
        {/* Username */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold">username</span>
          <span className="text-xs text-muted-foreground">방금</span>
        </div>

        {/* Body text */}
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {card.text_content}
        </p>

        {/* Media */}
        {card.media_url && card.media_type === 'image' && (
          <div className="mt-2 rounded-xl overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.media_url}
              alt="media"
              className="w-full max-h-64 object-cover"
            />
          </div>
        )}

        {/* Char count */}
        <div className="mt-1">
          <span className={`text-[10px] ${(card.text_content?.length ?? 0) > 500 ? 'text-destructive' : 'text-muted-foreground/50'}`}>
            {card.text_content?.length ?? 0}/500
          </span>
        </div>

        {/* Reaction icons */}
        <div className="flex items-center gap-5 mt-2 text-muted-foreground">
          <Heart size={16} className="cursor-pointer hover:text-red-500 transition-colors" />
          <MessageCircle size={16} className="cursor-pointer hover:text-foreground transition-colors" />
          <Repeat2 size={16} className="cursor-pointer hover:text-green-500 transition-colors" />
          <Send size={16} className="cursor-pointer hover:text-foreground transition-colors" />
        </div>
      </div>
    </div>
  );
}
