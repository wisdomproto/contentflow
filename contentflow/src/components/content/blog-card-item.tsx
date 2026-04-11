'use client';

import { useState, useRef, useEffect } from 'react';
import { GripVertical, Trash2, Plus, ChevronDown, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageCardWidget } from './image-card-widget';
import { ImageStyleSelector } from './image-style-selector';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TipTapImage from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import type { BlogCard } from '@/types/database';
import { cn } from '@/lib/utils';

// 통합 섹션 content 타입
export interface SectionContent {
  text?: string;
  url?: string;
  alt?: string;
  caption?: string;
  image_prompt?: string;
  image_style?: string;
}

interface BlogCardItemProps {
  card: BlogCard;
  index: number;
  onUpdate: (cardId: string, content: Record<string, unknown>) => void;
  onDelete: (cardId: string) => void;
  onGenerateImage?: (cardId: string) => void;
  onAbortImage?: () => void;
  isGeneratingImage?: boolean;
  generatingCardId?: string | null;
}

// --- Section Text Editor (TipTap) ---
function SectionTextEditor({
  content,
  onTextChange,
}: {
  content: SectionContent;
  onTextChange: (html: string) => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TipTapImage,
      Placeholder.configure({ placeholder: '이 섹션의 본문을 작성하세요...' }),
    ],
    content: content.text || '',
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-sm dark:prose-invert max-w-none px-4 py-3 focus:outline-none min-h-[80px]',
      },
    },
    onUpdate: ({ editor: e }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onTextChange(e.getHTML());
      }, 300);
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div>
      {editor && (
        <div className="flex gap-1 flex-wrap px-4 py-2 bg-muted/30 border-y border-border/50">
          {[
            { label: 'B', cmd: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
            { label: 'I', cmd: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
            { label: 'H2', cmd: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
            { label: 'H3', cmd: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
            { label: '•', cmd: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
            { label: '1.', cmd: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
          ].map((btn) => (
            <button
              key={btn.label}
              onMouseDown={(e) => { e.preventDefault(); btn.cmd(); }}
              className={cn(
                'px-2 py-1 text-xs rounded-md hover:bg-muted transition-colors font-medium',
                btn.active && 'bg-primary text-primary-foreground shadow-sm'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

// --- Section Image Area ---
function SectionImageArea({
  content,
  onUpdate,
  onGenerateImage,
  onAbortImage,
  isGenerating,
}: {
  content: SectionContent;
  onUpdate: (updates: Partial<SectionContent>) => void;
  onGenerateImage?: () => void;
  onAbortImage?: () => void;
  isGenerating: boolean;
}) {
  const [showPrompt, setShowPrompt] = useState(!content.url);
  const [imageHistory, setImageHistory] = useState<string[]>([]);

  return (
    <div className="p-4 space-y-3">
      <ImageCardWidget
        src={content.url || null}
        alt={content.alt || '블로그 이미지'}
        history={imageHistory}
        aspectClass="aspect-[4/3]"
        isGenerating={isGenerating}
        onRegenerate={onGenerateImage}
        onAbort={onAbortImage}
        onDelete={() => {
          if (content.url) setImageHistory(prev => [content.url!, ...prev].slice(0, 10));
          onUpdate({ url: '' });
        }}
        onUpload={(file) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (content.url) setImageHistory(prev => [content.url!, ...prev].slice(0, 10));
            onUpdate({ url: reader.result as string });
          };
          reader.readAsDataURL(file);
        }}
        onRestore={(url) => onUpdate({ url })}
        placeholder="이미지 생성 또는 업로드"
      />

      {/* 프롬프트 설정 */}
      <div className="rounded-md border border-border/50 overflow-hidden">
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <ChevronDown size={12} className={cn('transition-transform', !showPrompt && '-rotate-90')} />
          <span className="font-medium">이미지 프롬프트 설정</span>
        </button>
        {showPrompt && (
          <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
            <ImageStyleSelector
              value={content.image_style ?? ''}
              onChange={(style) => onUpdate({ image_style: style })}
              compact
            />
            <Textarea
              value={content.image_prompt ?? ''}
              onChange={(e) => onUpdate({ image_prompt: e.target.value })}
              placeholder="이미지 생성 프롬프트 (영어 권장)..."
              className="h-20 resize-none overflow-y-auto text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Alt 텍스트</Label>
                <Input
                  value={content.alt ?? ''}
                  onChange={(e) => onUpdate({ alt: e.target.value })}
                  placeholder="이미지 설명"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">캡션</Label>
                <Input
                  value={content.caption ?? ''}
                  onChange={(e) => onUpdate({ caption: e.target.value })}
                  placeholder="이미지 캡션"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main BlogCardItem (통합 섹션) ---
export function BlogCardItem({ card, index, onUpdate, onDelete, onGenerateImage, onAbortImage, isGeneratingImage, generatingCardId }: BlogCardItemProps) {
  const content = card.content as SectionContent;
  const isThisCardGenerating = isGeneratingImage && generatingCardId === card.id;

  const handleContentUpdate = (updates: Partial<SectionContent>) => {
    onUpdate(card.id, { ...content, ...updates });
  };

  return (
    <div className="group relative rounded-xl border border-border overflow-hidden transition-all hover:shadow-md bg-background">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-muted/60 to-muted/30 border-b border-border">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-muted-foreground">
          <GripVertical size={14} />
        </div>

        {/* 섹션 번호 */}
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
          {index + 1}
        </div>

        <span className="text-sm font-semibold text-foreground">섹션 {index + 1}</span>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(card.id)}
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {/* ① 이미지 영역 */}
      <SectionImageArea
        content={content}
        onUpdate={handleContentUpdate}
        onGenerateImage={onGenerateImage ? () => onGenerateImage(card.id) : undefined}
        onAbortImage={isThisCardGenerating ? onAbortImage : undefined}
        isGenerating={isThisCardGenerating ?? false}
      />

      {/* 구분선 */}
      <div className="mx-4 border-t border-dashed border-border" />

      {/* ② 텍스트 영역 */}
      <SectionTextEditor
        content={content}
        onTextChange={(html) => handleContentUpdate({ text: html })}
      />
    </div>
  );
}

// --- 섹션 추가 버튼 ---
interface AddCardButtonProps {
  onAdd: () => void;
}

export function AddCardButton({ onAdd }: AddCardButtonProps) {
  return (
    <div className="flex justify-center py-3">
      <Button variant="outline" onClick={onAdd} className="gap-2 rounded-full px-6 text-sm">
        <Plus size={16} /> 섹션 추가
      </Button>
    </div>
  );
}
