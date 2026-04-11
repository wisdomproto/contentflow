'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import type { BlogCard } from '@/types/database';
import type { SectionContent } from './blog-card-item';

interface BlogPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: BlogCard[];
  seoTitle: string;
}

function buildBlogHTML(cards: BlogCard[], seoTitle: string): string {
  const parts: string[] = [];
  if (seoTitle) parts.push(`<h1>${seoTitle}</h1>`);

  for (const card of cards) {
    const c = card.content as SectionContent;
    // 이미지 먼저
    if (c.url) {
      parts.push(`<figure><img src="${c.url}" alt="${c.alt || ''}" style="max-width:100%;border-radius:8px;" />${c.caption ? `<figcaption>${c.caption}</figcaption>` : ''}</figure>`);
    }
    // 텍스트
    if (c.text) {
      parts.push(c.text);
    }
  }

  return parts.join('\n\n');
}

export function BlogPreviewDialog({ open, onOpenChange, cards, seoTitle }: BlogPreviewDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyHTML = async () => {
    const html = buildBlogHTML(cards, seoTitle);
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>블로그 미리보기</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-2">
          <article className="prose prose-sm dark:prose-invert max-w-none">
            {seoTitle && <h1>{seoTitle}</h1>}
            {cards.map((card) => {
              const c = card.content as SectionContent;
              return (
                <section key={card.id} className="mb-8">
                  {/* 이미지 먼저 */}
                  {c.url && (
                    <figure>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.url} alt={c.alt || ''} className="rounded-lg max-w-full" />
                      {c.caption && <figcaption className="text-center text-sm text-muted-foreground mt-1">{c.caption}</figcaption>}
                    </figure>
                  )}
                  {/* 텍스트 */}
                  {c.text && (
                    <div dangerouslySetInnerHTML={{ __html: c.text }} />
                  )}
                </section>
              );
            })}
          </article>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCopyHTML} className="gap-1.5">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '복사됨!' : 'HTML 복사'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
