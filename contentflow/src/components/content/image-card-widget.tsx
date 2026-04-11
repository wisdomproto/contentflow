'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, Download, Upload, Loader2, ZoomIn, ChevronLeft, ChevronRight, Wand2, X } from 'lucide-react';
import { ImageLightbox } from './image-lightbox';
import { cn } from '@/lib/utils';

export interface ImageCardWidgetProps {
  /** Current image URL */
  src: string | null;
  alt?: string;
  /** Previous image versions (newest first) */
  history?: string[];
  /** Aspect ratio class, e.g. 'aspect-[4/3]', 'aspect-video' */
  aspectClass?: string;
  /** Called when regenerate button is clicked */
  onRegenerate?: () => void;
  /** Called when generation is aborted */
  onAbort?: () => void;
  /** Called when image is deleted */
  onDelete?: () => void;
  /** Called when a new image file is uploaded (drag & drop or click) */
  onUpload?: (file: File) => void;
  /** Called when a history image is restored */
  onRestore?: (url: string) => void;
  /** Is this card currently generating? */
  isGenerating?: boolean;
  /** Placeholder when no image */
  placeholder?: string;
  /** Hide bottom action buttons (for inline/compact usage) */
  hideBottomActions?: boolean;
  className?: string;
}

export function ImageCardWidget({
  src,
  alt = '이미지',
  history = [],
  aspectClass = 'aspect-[4/3]',
  onRegenerate,
  onAbort,
  onDelete,
  onUpload,
  onRestore,
  isGenerating = false,
  placeholder = '이미지가 없습니다',
  hideBottomActions = false,
  className,
}: ImageCardWidgetProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/') && onUpload) onUpload(file);
  }, [onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith('image/') && onUpload) onUpload(file);
    e.target.value = '';
  }, [onUpload]);

  const handleDownload = useCallback(async () => {
    if (!src) return;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback: open in new tab
      window.open(src, '_blank');
    }
  }, [src]);

  return (
    <div className={cn('group/imgcard relative', className)}>
      {/* Main image area */}
      <div
        className={cn(
          'relative rounded-lg overflow-hidden bg-muted/30',
          aspectClass,
          isDragOver && 'ring-2 ring-primary',
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {src ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="absolute inset-0 w-full h-full object-cover cursor-pointer"
              onClick={() => setShowLightbox(true)}
            />
            {/* Generating overlay */}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <Loader2 size={24} className="animate-spin text-white" />
              </div>
            )}
            {/* Action buttons on hover */}
            <div className="absolute top-1.5 right-1.5 flex gap-1 z-10 opacity-0 group-hover/imgcard:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" onClick={() => setShowLightbox(true)} className="h-6 w-6 p-0 bg-black/40 hover:bg-black/60 text-white">
                <ZoomIn size={12} />
              </Button>
              {onRegenerate && (
                <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={isGenerating} className="h-6 w-6 p-0 bg-black/40 hover:bg-black/60 text-white">
                  <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleDownload} className="h-6 w-6 p-0 bg-black/40 hover:bg-black/60 text-white">
                <Download size={12} />
              </Button>
              {onUpload && (
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-6 w-6 p-0 bg-black/40 hover:bg-black/60 text-white">
                  <Upload size={12} />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 bg-black/40 hover:bg-red-600/80 text-white">
                  <Trash2 size={12} />
                </Button>
              )}
            </div>
            {/* History toggle */}
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="absolute bottom-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-white/70 hover:text-white z-10 opacity-0 group-hover/imgcard:opacity-100 transition-opacity"
              >
                히스토리 ({history.length})
              </button>
            )}
          </>
        ) : (
          /* Empty state — drop zone */
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer"
            onClick={() => onUpload ? fileInputRef.current?.click() : onRegenerate?.()}
          >
            {isGenerating ? (
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload size={16} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{placeholder}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Generate / Regenerate / Cancel buttons below image */}
      {onRegenerate && !hideBottomActions && (
        <div className="mt-2 flex gap-2">
          {isGenerating ? (
            onAbort && (
              <Button variant="outline" size="sm" onClick={onAbort} className="gap-1.5 text-xs">
                <X size={14} /> 취소
              </Button>
            )
          ) : (
            <Button variant="outline" size="sm" onClick={onRegenerate} className="gap-1.5 text-xs">
              {src ? <RefreshCw size={14} /> : <Wand2 size={14} />}
              {src ? '재생성' : '이미지 생성'}
            </Button>
          )}
        </div>
      )}

      {/* History strip */}
      {showHistory && history.length > 0 && (
        <div className="mt-1 flex gap-1 overflow-x-auto pb-1">
          {history.map((url, i) => (
            <button
              key={i}
              onClick={() => onRestore?.(url)}
              className="flex-shrink-0 w-10 h-10 rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`히스토리 ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Lightbox */}
      {src && (
        <ImageLightbox
          open={showLightbox}
          onOpenChange={setShowLightbox}
          src={src}
          alt={alt}
        />
      )}
    </div>
  );
}
