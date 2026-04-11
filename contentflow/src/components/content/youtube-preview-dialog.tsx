'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Clock } from 'lucide-react';
import type { YoutubeCard } from '@/types/database';

const SECTION_COLORS: Record<string, string> = {
  hook: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  intro: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  main: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  example: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  summary: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  cta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

function estimateReadingTime(cards: YoutubeCard[]): string {
  const totalChars = cards.reduce((sum, c) => sum + (c.narration_text?.length ?? 0), 0);
  // 한국어 평균 말하기 속도: ~250자/분
  const minutes = totalChars / 250;
  if (minutes < 1) return '1분 미만';
  return `약 ${Math.round(minutes)}분`;
}

interface YoutubePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: YoutubeCard[];
  videoTitle?: string | null;
}

export function YoutubePreviewDialog({ open, onOpenChange, cards, videoTitle }: YoutubePreviewDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const text = cards
      .map((card, i) => {
        const lines: string[] = [];
        lines.push(`[${i + 1}] ${(card.section_type ?? 'main').toUpperCase()}`);
        if (card.narration_text) lines.push(`나레이션: ${card.narration_text}`);
        if (card.screen_direction) lines.push(`화면: ${card.screen_direction}`);
        if (card.subtitle_text) lines.push(`자막: ${card.subtitle_text}`);
        return lines.join('\n');
      })
      .join('\n\n---\n\n');

    const fullText = videoTitle ? `# ${videoTitle}\n\n${text}` : text;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">대본 미리보기</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 text-xs">
                <Clock size={12} />
                {estimateReadingTime(cards)}
              </Badge>
              <Badge variant="secondary" className="text-xs">{cards.length}개 섹션</Badge>
              <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-1.5">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '복사됨!' : '전체 복사'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {videoTitle && (
          <h2 className="text-xl font-bold mt-2">{videoTitle}</h2>
        )}

        <div className="space-y-4 mt-4">
          {cards.map((card, i) => {
            const colorClass = SECTION_COLORS[card.section_type ?? 'main'] ?? SECTION_COLORS.main;
            return (
              <div key={card.id} className="rounded-lg border border-border overflow-hidden">
                {/* Section header */}
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border">
                  <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                  <Badge className={`text-[10px] ${colorClass} border-0`}>
                    {(card.section_type ?? 'main').toUpperCase()}
                  </Badge>
                </div>

                {/* Two-column layout: narration + direction */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  {/* Narration */}
                  <div className="p-4">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">나레이션</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {card.narration_text || <span className="text-muted-foreground italic">(비어 있음)</span>}
                    </p>
                  </div>

                  {/* Screen direction */}
                  <div className="p-4 bg-muted/10">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">화면 디렉션</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {card.screen_direction || <span className="italic">(비어 있음)</span>}
                    </p>
                    {card.subtitle_text && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">자막</p>
                        <p className="text-xs font-medium">{card.subtitle_text}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
