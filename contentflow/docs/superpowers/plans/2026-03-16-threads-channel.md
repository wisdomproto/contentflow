# Threads Channel Completion — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Threads channel to parity with Blog/CardNews (drag handle, image support, preview dialog).

**Architecture:** Extend the existing Threads stub (`threads-panel.tsx`, `threads-card-item.tsx`) following the same patterns as Blog and CardNews. Add `reorderThreadsCards` to Zustand store, image generation support via existing `useImageGeneration` hook, and a Threads-styled preview dialog.

**Tech Stack:** React, TypeScript, Zustand, shadcn/ui, Tailwind CSS, lucide-react, Gemini API (image generation)

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/stores/project-store.ts` | Add `reorderThreadsCards` |
| Modify | `src/components/content/threads-card-item.tsx` | Add drag handle + image attachment UI |
| Modify | `src/components/content/threads-panel.tsx` | Add image generation + preview button + reorder |
| Create | `src/components/content/threads-preview-dialog.tsx` | Threads UI simulation preview |

---

## Task 1: Add `reorderThreadsCards` to Store

**Files:**
- Modify: `src/stores/project-store.ts`

- [ ] **Step 1: Add type signature**

In the store interface (around line 101, after `deleteThreadsCard`), add:

```typescript
reorderThreadsCards: (threadsContentId: string, cardIds: string[]) => void;
```

- [ ] **Step 2: Add implementation**

After `deleteThreadsCard` implementation (around line 663), add:

```typescript
reorderThreadsCards: (threadsContentId, cardIds) => {
  set((state) => ({
    threadsCards: state.threadsCards.map((card) => {
      if (card.threads_content_id !== threadsContentId) return card;
      const newOrder = cardIds.indexOf(card.id);
      return newOrder >= 0 ? { ...card, sort_order: newOrder } : card;
    }),
  }));
},
```

This follows the exact same pattern as `reorderBlogCards` (line 461) and `reorderInstagramCards` (line 565).

- [ ] **Step 3: Verify dev server compiles**

Run: `npm run dev` — no TypeScript errors expected.

---

## Task 2: Enhance `threads-card-item.tsx` — Drag Handle + Image Support

**Files:**
- Modify: `src/components/content/threads-card-item.tsx`

- [ ] **Step 1: Replace the entire file**

The current file is 89 lines. Replace with an enhanced version that adds:
- `GripVertical` drag handle (visual only, matching blog pattern)
- Image attachment area with generate/delete
- Image prompt input (collapsible)
- Image lightbox for preview

```tsx
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
          {/* Drag handle */}
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
```

- [ ] **Step 2: Verify dev server compiles**

---

## Task 3: Enhance `threads-panel.tsx` — Image Generation + Preview + Reorder

**Files:**
- Modify: `src/components/content/threads-panel.tsx`

- [ ] **Step 1: Replace the entire file**

Add image generation support (using `useImageGeneration` hook), preview button, reorder on drag, and `showImageModel={true}`.

```tsx
'use client';

import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThreadsCardItem, AddPostButton } from './threads-card-item';
import { ChannelModelSelector } from './channel-model-selector';
import { ChannelContentList } from './channel-content-list';
import { PromptEditDialog } from './prompt-edit-dialog';
import { ThreadsPreviewDialog } from './threads-preview-dialog';
import { useAiGeneration } from '@/hooks/use-ai-generation';
import { useImageGeneration } from '@/hooks/use-image-generation';
import { useProjectStore } from '@/stores/project-store';
import { buildThreadsPrompt } from '@/lib/prompt-builder';
import { Sparkles, Loader2, Copy, Check, Eye, ImageIcon } from 'lucide-react';
import type { Content, Project, ThreadsContent, ThreadsCard } from '@/types/database';
import { generateId } from '@/lib/utils';

// ─── Inner: individual threads content ────────────────────────────

interface ThreadsPanelInnerProps {
  threadsContent: ThreadsContent;
  content: Content;
  project: Project;
  hasBaseArticle: boolean;
  channelModels: { textModel: string; imageModel: string };
}

function ThreadsPanelInner({ threadsContent, content, project, hasBaseArticle, channelModels }: ThreadsPanelInnerProps) {
  const {
    getBaseArticle,
    getThreadsCards,
    setThreadsCardsForContent,
    updateThreadsCard,
    deleteThreadsCard,
    addThreadsCard,
    reorderThreadsCards,
  } = useProjectStore();

  const baseArticle = getBaseArticle(content.id);
  const cards = getThreadsCards(threadsContent.id);

  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatingCardId, setGeneratingCardId] = useState<string | null>(null);

  // Text generation
  const { isGenerating, generate, abort } = useAiGeneration({
    onComplete: useCallback(
      (fullText: string) => {
        try {
          const objMatch = fullText.match(/\{[\s\S]*\}/);
          if (!objMatch) throw new Error('JSON not found');
          const parsed = JSON.parse(objMatch[0]) as {
            posts: { text: string; order: number }[];
          };
          if (!parsed.posts?.length) throw new Error('No posts');

          const now = new Date().toISOString();
          const newCards: ThreadsCard[] = parsed.posts
            .sort((a, b) => a.order - b.order)
            .map((post, i) => ({
              id: generateId('tp'),
              threads_content_id: threadsContent.id,
              text_content: post.text || '',
              media_url: null,
              media_type: null,
              sort_order: i,
              created_at: now,
              updated_at: now,
            }));

          setThreadsCardsForContent(threadsContent.id, newCards);
        } catch {
          alert('스레드 포스트 파싱 실패. 다시 시도해 주세요.');
        }
      },
      [threadsContent.id, setThreadsCardsForContent]
    ),
    onError: useCallback((err: string) => {
      alert(`AI 생성 오류: ${err}`);
    }, []),
  });

  // Image generation
  const { isGenerating: isGeneratingImage, generateImages } = useImageGeneration();

  const handleGenerateCardImage = async (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    // media_type is temporarily used to store the image prompt
    const prompt = card.media_type || 'Professional photo related to the post content';
    setGeneratingCardId(cardId);
    try {
      const results = await generateImages(
        [{ slideIndex: 0, prompt, aspectRatio: '1:1' as const }],
        channelModels.imageModel
      );
      if (results[0]) {
        updateThreadsCard(cardId, {
          media_url: `data:${results[0].mimeType};base64,${results[0].base64}`,
          media_type: 'image',
        });
      }
    } catch (err) {
      alert(`이미지 생성 오류: ${(err as Error).message}`);
    } finally {
      setGeneratingCardId(null);
    }
  };

  const handleGenerate = () => {
    const prompt = buildThreadsPrompt({ project, content, baseArticle: baseArticle ?? undefined });
    setGeneratedPrompt(prompt);
    setShowPromptDialog(true);
  };

  const handleStartGeneration = (prompt: string) => {
    generate(prompt, channelModels.textModel);
  };

  const handleCardUpdate = (cardId: string, updates: Partial<ThreadsCard>) => {
    updateThreadsCard(cardId, updates);
  };

  const handleCardDelete = (cardId: string) => {
    deleteThreadsCard(cardId);
  };

  const handleAddPost = () => {
    addThreadsCard(threadsContent.id, cards.length);
  };

  const handleCopyAll = async () => {
    const allText = cards
      .map((card, i) => `[${i + 1}/${cards.length}]\n${card.text_content}`)
      .join('\n\n---\n\n');
    await navigator.clipboard.writeText(allText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {cards.length > 0 && <Badge variant="secondary" className="text-xs">{cards.length}개 포스트</Badge>}
          {isGenerating && (
            <Badge variant="outline" className="text-xs gap-1 text-gray-600">
              <Loader2 size={10} className="animate-spin" /> 생성 중...
            </Badge>
          )}
          {isGeneratingImage && (
            <Badge variant="outline" className="text-xs gap-1 text-green-600">
              <ImageIcon size={10} /> 이미지 생성 중...
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={!hasBaseArticle || isGenerating}
            size="sm"
            className="gap-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 text-white"
          >
            <Sparkles size={14} /> AI 생성
          </Button>
          {isGenerating && (
            <Button variant="destructive" size="sm" onClick={abort}>중단</Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(true)}
            disabled={cards.length === 0}
            className="gap-1.5"
          >
            <Eye size={14} /> 미리보기
          </Button>
          {cards.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-1.5">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '복사됨!' : '전체 복사'}
            </Button>
          )}
        </div>
      </div>

      {/* No base article */}
      {!hasBaseArticle && (
        <p className="text-sm text-muted-foreground">기본 글을 먼저 작성해 주세요.</p>
      )}

      {/* Thread Posts */}
      {cards.length > 0 && (
        <div className="space-y-0">
          {cards.map((card, i) => (
            <ThreadsCardItem
              key={card.id}
              card={card}
              index={i}
              isLast={i === cards.length - 1}
              onUpdate={handleCardUpdate}
              onDelete={handleCardDelete}
              onGenerateImage={handleGenerateCardImage}
              isGeneratingImage={isGeneratingImage}
              generatingCardId={generatingCardId}
            />
          ))}
        </div>
      )}

      {/* Add Post */}
      {hasBaseArticle && <AddPostButton onAdd={handleAddPost} />}

      {/* Prompt Dialog */}
      <PromptEditDialog
        open={showPromptDialog}
        onOpenChange={setShowPromptDialog}
        initialPrompt={generatedPrompt}
        isGenerating={isGenerating}
        onGenerate={handleStartGeneration}
        onAbort={abort}
      />

      {/* Preview Dialog */}
      <ThreadsPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        cards={cards}
      />
    </div>
  );
}

// ─── Outer: multi threads content list ────────────────────────────

export function ThreadsPanel() {
  const { selectedContentId, contents, selectedProjectId, projects, getBaseArticle, getThreadsContents, addThreadsContent, updateThreadsContent, deleteThreadsContent, getChannelModels, setChannelModels } = useProjectStore();
  const content = contents.find((c) => c.id === selectedContentId);
  const project = projects.find((p) => p.id === selectedProjectId);
  if (!content || !project) return null;
  const hasBaseArticle = !!getBaseArticle(content.id);
  const threadsContents = getThreadsContents(content.id);
  const channelModels = getChannelModels(project.id, 'threads');

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">스레드</h2>
      </div>

      <ChannelModelSelector
        textModel={channelModels.textModel}
        imageModel={channelModels.imageModel}
        onTextModelChange={(m) => setChannelModels(project.id, 'threads', { textModel: m })}
        onImageModelChange={(m) => setChannelModels(project.id, 'threads', { imageModel: m })}
        showImageModel={true}
      />

      <ChannelContentList<ThreadsContent>
        items={threadsContents}
        getId={(item) => item.id}
        getTitle={(item, index) => item.title || `스레드 ${index + 1}`}
        onTitleChange={(id, title) => updateThreadsContent(id, { title })}
        onAdd={() => addThreadsContent(content.id)}
        onDelete={(id) => deleteThreadsContent(id)}
        addLabel="새 스레드 추가"
        renderContent={(threadsContent) => (
          <ThreadsPanelInner
            key={threadsContent.id}
            threadsContent={threadsContent}
            content={content}
            project={project}
            hasBaseArticle={hasBaseArticle}
            channelModels={channelModels}
          />
        )}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify dev server compiles** (will fail until ThreadsPreviewDialog exists — that's next)

---

## Task 4: Create `threads-preview-dialog.tsx`

**Files:**
- Create: `src/components/content/threads-preview-dialog.tsx`

- [ ] **Step 1: Create the file**

PRD 4.6.3 Threads UI simulation: profile, post body, media, reaction icons, connection lines, copy.

```tsx
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
```

- [ ] **Step 2: Verify dev server compiles and all features work**

Run: `npm run dev` — navigate to a content's Threads tab.

- [ ] **Step 3: Test the full flow**

1. Create a project + content + write a base article
2. Go to Threads tab
3. Click "AI 생성" → confirm prompt → verify posts are generated
4. Click "미리보기" → verify Threads-styled preview renders correctly
5. On a card, expand "이미지 첨부" → enter a prompt → click "이미지 생성"
6. Verify image appears in the card and in the preview
7. Add/delete posts manually
8. Verify "전체 복사" copies all post text

---

## Summary

| Task | Files | What it does |
|------|-------|--------------|
| 1 | `project-store.ts` | Add `reorderThreadsCards` |
| 2 | `threads-card-item.tsx` | Drag handle + image UI |
| 3 | `threads-panel.tsx` | Image generation + preview + reorder |
| 4 | `threads-preview-dialog.tsx` | Threads UI simulation preview |
