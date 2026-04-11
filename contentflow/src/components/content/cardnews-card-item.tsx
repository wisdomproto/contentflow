'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Trash2, Plus, ChevronDown, Loader2, Type, Upload, Download, Bold, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { InstagramCard } from '@/types/database';
import { cn } from '@/lib/utils';
import { generateId } from '@/lib/utils';

// ─── Data Types ───────────────────────────────────────────

export interface TextBlock {
  id: string;
  text: string;
  x: number;       // % from left (0-100)
  y: number;       // % from top (0-100)
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  width: number;   // % of card width
  height?: number;  // % of card height (auto if undefined)
  hidden?: boolean; // hide this block from canvas
  shadow?: boolean; // text shadow
}

export interface CardCanvasData {
  bgColor: string;
  imageUrl: string | null;
  imageY: number;           // object-position Y %
  textBlocks: TextBlock[];
}

// ─── Helpers ──────────────────────────────────────────────

const GRID_SIZE = 10;
const SNAP_THRESHOLD = 4;

function snapToGrid(value: number): number {
  const nearest = Math.round(value / GRID_SIZE) * GRID_SIZE;
  return Math.abs(value - nearest) < SNAP_THRESHOLD ? nearest : value;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function defaultCanvasData(): CardCanvasData {
  return {
    bgColor: '#18181b',
    imageUrl: null,
    imageY: 50,
    textBlocks: [
      { id: 'header', text: '', x: 10, y: 5, fontSize: 11, color: '#8B5CF6', fontWeight: 'bold', textAlign: 'left', width: 80 },
      { id: 'title', text: '', x: 10, y: 15, fontSize: 28, color: '#ffffff', fontWeight: 'bold', textAlign: 'left', width: 80 },
      { id: 'body', text: '', x: 10, y: 55, fontSize: 14, color: '#cccccc', fontWeight: 'normal', textAlign: 'left', width: 80 },
      { id: 'footer', text: '', x: 10, y: 90, fontSize: 10, color: '#666666', fontWeight: 'normal', textAlign: 'left', width: 80 },
    ],
  };
}

export function parseCanvasData(textStyle: Record<string, unknown> | null, imageUrl?: string | null): CardCanvasData {
  if (!textStyle) return { ...defaultCanvasData(), imageUrl: imageUrl ?? null };

  // New format
  if (Array.isArray(textStyle.textBlocks)) {
    const data = textStyle as unknown as CardCanvasData;
    return { ...data, imageUrl: imageUrl ?? data.imageUrl ?? null };
  }

  // Old format migration — always create all 4 default blocks, fill with existing data
  const old = textStyle as Record<string, unknown>;
  const align = (old.textAlign as string) || 'left';
  const baseColor = (old.color as string) || '#ffffff';

  const blocks: TextBlock[] = [
    { id: 'header', text: (old.header as string) || '', x: 10, y: 5, fontSize: (old.headerFontSize as number) || 11, color: (old.headerColor as string) || (old.accentColor as string) || '#8B5CF6', fontWeight: 'bold', textAlign: align as TextBlock['textAlign'], width: 80 },
    { id: 'title', text: (old.title as string) || (old.headline as string) || '', x: 10, y: 20, fontSize: (old.titleFontSize as number) || (old.headlineFontSize as number) || 28, color: (old.titleColor as string) || baseColor, fontWeight: 'bold', textAlign: align as TextBlock['textAlign'], width: 80 },
    { id: 'body', text: (old.body as string) || '', x: 10, y: 50, fontSize: (old.bodyFontSize as number) || 14, color: (old.bodyColor as string) || baseColor, fontWeight: 'normal', textAlign: align as TextBlock['textAlign'], width: 80 },
    { id: 'footer', text: (old.footer as string) || '', x: 10, y: 90, fontSize: (old.footerFontSize as number) || 10, color: (old.footerColor as string) || '#666666', fontWeight: 'normal', textAlign: align as TextBlock['textAlign'], width: 80 },
  ];

  return {
    bgColor: (old.bgColor as string) || '#18181b',
    imageUrl: imageUrl ?? null,
    imageY: 50,
    textBlocks: blocks,
  };
}

function isBgLight(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

// ─── Grid Guides ──────────────────────────────────────────

function GridGuides({ light, show }: { light: boolean; show: boolean }) {
  const lineColor = light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const snapColor = light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
  return (
    <div className={cn('absolute inset-0 pointer-events-none transition-opacity z-[1]', show ? 'opacity-100' : 'opacity-0')}>
      {Array.from({ length: 9 }, (_, i) => (i + 1) * 10).map(p => (
        <div key={`h${p}`}>
          <div className="absolute inset-x-0" style={{ top: `${p}%`, height: 1, backgroundColor: p === 50 ? snapColor : lineColor }} />
          <div className="absolute inset-y-0" style={{ left: `${p}%`, width: 1, backgroundColor: p === 50 ? snapColor : lineColor }} />
        </div>
      ))}
    </div>
  );
}

// ─── Canvas Component ─────────────────────────────────────

interface CardCanvasProps {
  canvasData: CardCanvasData;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onUpdateCanvas: (data: Partial<CardCanvasData>) => void;
  onUpdateBlock: (blockId: string, updates: Partial<TextBlock>) => void;
  isGeneratingImage: boolean;
  onDeleteCard: () => void;
  index: number;
}

function CardCanvas({ canvasData, selectedBlockId, onSelectBlock, onUpdateCanvas, onUpdateBlock, isGeneratingImage, onDeleteCard, index }: CardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ blockId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ blockId: string; startX: number; startY: number; origW: number; origH: number } | null>(null);
  const imgDragRef = useRef<{ startY: number; origY: number } | null>(null);
  const light = isBgLight(canvasData.bgColor);

  // ── Text block drag ──
  const handleBlockPointerDown = useCallback((e: React.PointerEvent, block: TextBlock) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectBlock(block.id);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setIsDragging(true);
    dragRef.current = { blockId: block.id, startX: e.clientX, startY: e.clientY, origX: block.x, origY: block.y };

    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current || !rect) return;
      const dx = ((ev.clientX - dragRef.current.startX) / rect.width) * 100;
      const dy = ((ev.clientY - dragRef.current.startY) / rect.height) * 100;
      const newX = snapToGrid(clamp(dragRef.current.origX + dx, 0, 100));
      const newY = snapToGrid(clamp(dragRef.current.origY + dy, 0, 95));
      onUpdateBlock(dragRef.current.blockId, { x: newX, y: newY });
    };
    const onUp = () => {
      dragRef.current = null;
      setIsDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [onSelectBlock, onUpdateBlock]);

  // ── Image drag (Y only) ──
  const handleImagePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectBlock(null);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setIsDraggingImage(true);
    imgDragRef.current = { startY: e.clientY, origY: canvasData.imageY };

    const onMove = (ev: PointerEvent) => {
      if (!imgDragRef.current || !rect) return;
      const dy = ((ev.clientY - imgDragRef.current.startY) / rect.height) * 100;
      const newY = snapToGrid(clamp(imgDragRef.current.origY + dy, 0, 100));
      onUpdateCanvas({ imageY: newY });
    };
    const onUp = () => {
      imgDragRef.current = null;
      setIsDraggingImage(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [canvasData.imageY, onSelectBlock, onUpdateCanvas]);

  // ── Text block resize (bottom-right corner) ──
  const handleResizePointerDown = useCallback((e: React.PointerEvent, block: TextBlock) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setIsResizing(true);
    resizeRef.current = { blockId: block.id, startX: e.clientX, startY: e.clientY, origW: block.width, origH: block.height ?? 0 };

    const onMove = (ev: PointerEvent) => {
      if (!resizeRef.current || !rect) return;
      const dw = ((ev.clientX - resizeRef.current.startX) / rect.width) * 100;
      const dh = ((ev.clientY - resizeRef.current.startY) / rect.height) * 100;
      const newW = snapToGrid(clamp(resizeRef.current.origW + dw, 10, 100 - block.x));
      const updates: Partial<TextBlock> = { width: newW };
      if (resizeRef.current.origH > 0) {
        updates.height = snapToGrid(clamp(resizeRef.current.origH + dh, 5, 100 - block.y));
      } else {
        // First resize sets height
        const newH = snapToGrid(clamp(dh + 15, 5, 100 - block.y));
        if (newH > 5) updates.height = newH;
      }
      onUpdateBlock(resizeRef.current.blockId, updates);
    };
    const onUp = () => {
      resizeRef.current = null;
      setIsResizing(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [onUpdateBlock]);

  const handleUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => onUpdateCanvas({ imageUrl: reader.result as string });
    reader.readAsDataURL(file);
  }, [onUpdateCanvas]);

  // ── Drag & Drop on canvas (always active) ──
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleUpload(file);
  }, [handleUpload]);

  // ── Paste image (Ctrl+V) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleUpload(file);
          return;
        }
      }
    };

    el.addEventListener('paste', handlePaste);
    return () => el.removeEventListener('paste', handlePaste);
  }, [handleUpload]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={cn(
        'relative rounded-lg overflow-hidden group/canvas select-none outline-none focus:ring-2 focus:ring-primary/30',
        isDragOver && 'ring-2 ring-primary',
      )}
      style={{ aspectRatio: '4/5', backgroundColor: canvasData.bgColor }}
      onClick={() => onSelectBlock(null)}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
    >
      {/* Grid guides */}
      <GridGuides light={light} show={isDragging || isDraggingImage || isResizing} />

      {/* Image layer — full width, natural height, vertical drag */}
      {canvasData.imageUrl ? (
        <div
          className="absolute inset-x-0 z-[2] cursor-ns-resize"
          style={{ top: `${canvasData.imageY}%`, transform: 'translateY(-50%)' }}
          onPointerDown={handleImagePointerDown}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={canvasData.imageUrl}
            alt=""
            className="w-full h-auto pointer-events-none"
          />
          {isGeneratingImage && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-white" />
            </div>
          )}
        </div>
      ) : (
        isGeneratingImage && (
          <div className="absolute inset-0 z-[2] flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        )
      )}

      {/* Drop zone hint (no image yet) */}
      {!canvasData.imageUrl && !isGeneratingImage && (
        <div className="absolute inset-0 z-[2] flex items-center justify-center opacity-0 group-hover/canvas:opacity-100 transition-opacity pointer-events-none">
          <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
            <Upload size={16} />
            <span className="text-[9px]">이미지 드래그, 붙여넣기(Ctrl+V)</span>
          </div>
        </div>
      )}

      {/* Text blocks */}
      {canvasData.textBlocks.filter(b => !b.hidden).map(block => {
        const isSelected = selectedBlockId === block.id;
        return (
          <div
            key={block.id}
            className={cn(
              'absolute z-[3] cursor-move px-1 rounded transition-shadow overflow-hidden',
              isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : 'hover:ring-1 hover:ring-white/30',
            )}
            style={{
              left: `${block.x}%`,
              top: `${block.y}%`,
              width: `${block.width}%`,
              ...(block.height ? { height: `${block.height}%` } : {}),
            }}
            onClick={(e) => { e.stopPropagation(); onSelectBlock(block.id); }}
            onPointerDown={(e) => handleBlockPointerDown(e, block)}
          >
            <p
              className="whitespace-pre-line break-words leading-tight pointer-events-none h-full"
              style={{
                fontSize: `${block.fontSize}px`,
                color: block.color,
                fontWeight: block.fontWeight,
                textAlign: block.textAlign,
                textShadow: block.shadow ? '0 1px 4px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.3)' : undefined,
              }}
            >
              {block.text || '\u00A0'}
            </p>
            {/* Resize handle — bottom-right corner */}
            {isSelected && (
              <div
                className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-10"
                onPointerDown={(e) => handleResizePointerDown(e, block)}
              >
                <svg viewBox="0 0 12 12" className="w-full h-full">
                  <path d="M10 2 L2 10 M10 6 L6 10 M10 10 L10 10" stroke="rgba(96,165,250,0.8)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
        );
      })}

      {/* Index badge */}
      <span className="absolute top-1.5 left-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-white/70 z-10">
        {index + 1}
      </span>

      {/* Delete button */}
      <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover/canvas:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDeleteCard(); }} className="h-6 w-6 p-0 bg-black/30 hover:bg-red-600/80 text-white">
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  );
}

// ─── Text Block Editor (below canvas) ─────────────────────

function TextBlockEditor({ block, onChange, onDelete }: {
  block: TextBlock;
  onChange: (updates: Partial<TextBlock>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-2 p-2 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{block.id}</span>
        <button onClick={onDelete} className="text-[10px] text-muted-foreground hover:text-destructive">삭제</button>
      </div>
      <textarea
        value={block.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={block.id === 'header' ? '헤더 텍스트' : block.id === 'title' ? '제목' : block.id === 'body' ? '본문' : block.id === 'footer' ? '푸터' : '텍스트'}
        className="w-full text-xs bg-transparent border border-border rounded px-2 py-1 resize-none focus:outline-none focus:border-primary"
        rows={block.id === 'body' ? 3 : 1}
      />
      <div className="flex items-center gap-2 flex-wrap">
        {/* Font size */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground">크기</span>
          <input type="number" min={8} max={72} value={block.fontSize}
            onChange={(e) => onChange({ fontSize: clamp(parseInt(e.target.value) || 12, 8, 72) })}
            className="w-10 h-5 text-[10px] text-center bg-transparent border border-border rounded" />
        </div>
        {/* Color */}
        <input type="color" value={block.color}
          onChange={(e) => onChange({ color: e.target.value })}
          className="w-5 h-5 rounded border border-border cursor-pointer p-0" />
        {/* Bold */}
        <button onClick={() => onChange({ fontWeight: block.fontWeight === 'bold' ? 'normal' : 'bold' })}
          className={cn('h-5 w-5 flex items-center justify-center rounded border text-[10px]', block.fontWeight === 'bold' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted')}>
          <Bold size={10} />
        </button>
        {/* Shadow */}
        <button onClick={() => onChange({ shadow: !block.shadow })}
          className={cn('h-5 px-1 flex items-center justify-center rounded border text-[9px]', block.shadow ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted')}>
          S
        </button>
        {/* Align */}
        {(['left', 'center', 'right'] as const).map(a => (
          <button key={a} onClick={() => onChange({ textAlign: a })}
            className={cn('h-5 w-5 flex items-center justify-center rounded border text-[10px]', block.textAlign === a ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted')}>
            {a === 'left' ? <AlignLeft size={10} /> : a === 'center' ? <AlignCenter size={10} /> : <AlignRight size={10} />}
          </button>
        ))}
        {/* Width */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground">폭</span>
          <input type="number" min={20} max={100} step={10} value={block.width}
            onChange={(e) => onChange({ width: clamp(parseInt(e.target.value) || 80, 20, 100) })}
            className="w-10 h-5 text-[10px] text-center bg-transparent border border-border rounded" />
          <span className="text-[9px] text-muted-foreground">%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main CardNewsCardItem ────────────────────────────────

interface CardNewsCardItemProps {
  card: InstagramCard;
  index: number;
  onUpdate: (cardId: string, updates: Partial<InstagramCard>) => void;
  onDelete: (cardId: string) => void;
  onGenerateImage?: () => void;
  isGeneratingImage?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function CardNewsCardItem({ card, index, onUpdate, onDelete, onGenerateImage, isGeneratingImage, isSelected, onSelect }: CardNewsCardItemProps) {
  const canvasData = parseCanvasData(card.text_style, card.background_image_url);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const selectedBlock = canvasData.textBlocks.find(b => b.id === selectedBlockId) ?? null;

  const saveCanvas = useCallback((updates: Partial<CardCanvasData>) => {
    const next = { ...canvasData, ...updates };
    const syncUpdates: Partial<InstagramCard> = {
      text_style: next as unknown as Record<string, unknown>,
    };
    if ('imageUrl' in updates) {
      syncUpdates.background_image_url = updates.imageUrl ?? null;
    }
    if ('bgColor' in updates) {
      syncUpdates.background_color = updates.bgColor ?? null;
    }
    // Sync text_content from all blocks
    syncUpdates.text_content = next.textBlocks.map(b => b.text).filter(Boolean).join('\n') || null;
    onUpdate(card.id, syncUpdates);
  }, [canvasData, card.id, onUpdate]);

  const updateBlock = useCallback((blockId: string, updates: Partial<TextBlock>) => {
    const newBlocks = canvasData.textBlocks.map(b => b.id === blockId ? { ...b, ...updates } : b);
    saveCanvas({ textBlocks: newBlocks });
  }, [canvasData.textBlocks, saveCanvas]);

  const deleteBlock = useCallback((blockId: string) => {
    const newBlocks = canvasData.textBlocks.filter(b => b.id !== blockId);
    if (selectedBlockId === blockId) setSelectedBlockId(null);
    saveCanvas({ textBlocks: newBlocks });
  }, [canvasData.textBlocks, selectedBlockId, saveCanvas]);

  const addBlock = useCallback(() => {
    const newBlock: TextBlock = {
      id: generateId('tb'),
      text: '',
      x: 10, y: 40,
      fontSize: 14, color: '#ffffff',
      fontWeight: 'normal', textAlign: 'left',
      width: 80,
    };
    saveCanvas({ textBlocks: [...canvasData.textBlocks, newBlock] });
    setSelectedBlockId(newBlock.id);
  }, [canvasData.textBlocks, saveCanvas]);

  return (
    <div className={cn('group relative flex flex-col gap-2 rounded-xl transition-shadow', isSelected && 'ring-2 ring-primary shadow-lg')} onClick={onSelect}>
      {/* Canvas */}
      <CardCanvas
        canvasData={canvasData}
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
        onUpdateCanvas={saveCanvas}
        onUpdateBlock={updateBlock}
        isGeneratingImage={isGeneratingImage ?? false}
        onDeleteCard={() => onDelete(card.id)}
        index={index}
      />

      {/* Card controls */}
      <div className="flex items-center gap-1.5 px-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground">배경</span>
          <input type="color" value={canvasData.bgColor}
            onChange={(e) => saveCanvas({ bgColor: e.target.value })}
            className="w-5 h-5 rounded border border-border cursor-pointer p-0" />
        </div>
        <Button variant="outline" size="sm" onClick={addBlock} className="h-6 text-[10px] gap-1 px-2">
          <Type size={10} /> 텍스트
        </Button>
        {/* Image upload */}
        <label className="inline-flex items-center gap-1 h-6 px-2 text-[10px] rounded-md border border-border hover:bg-accent cursor-pointer transition-colors">
          <Upload size={10} /> 업로드
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => saveCanvas({ imageUrl: r.result as string }); r.readAsDataURL(f); } e.target.value = ''; }} />
        </label>
        {/* Image download */}
        {canvasData.imageUrl && (
          <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2"
            onClick={async () => {
              try {
                const res = await fetch(canvasData.imageUrl!);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `card_${index + 1}.png`;
                a.click();
                URL.revokeObjectURL(url);
              } catch { window.open(canvasData.imageUrl!, '_blank'); }
            }}>
            <Download size={10} /> 저장
          </Button>
        )}
        {/* Image remove */}
        {canvasData.imageUrl && (
          <Button variant="outline" size="sm" onClick={() => saveCanvas({ imageUrl: null })} className="h-6 text-[10px] gap-1 px-2 text-destructive">
            <Trash2 size={10} /> 이미지
          </Button>
        )}
        {/* AI generate */}
        {onGenerateImage && (
          <Button variant="outline" size="sm" onClick={onGenerateImage} disabled={isGeneratingImage} className="h-6 text-[10px] gap-1 px-2">
            {isGeneratingImage ? <Loader2 size={10} className="animate-spin" /> : null}
            {canvasData.imageUrl ? '재생성' : 'AI 생성'}
          </Button>
        )}
      </div>

      {/* Selected block editor */}
      {selectedBlock && (
        <div onClick={(e) => e.stopPropagation()}>
          <TextBlockEditor
            block={selectedBlock}
            onChange={(updates) => updateBlock(selectedBlock.id, updates)}
            onDelete={() => deleteBlock(selectedBlock.id)}
          />
        </div>
      )}

      {/* Image prompt toggle */}
      <div className="px-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setShowPrompt(!showPrompt)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
          <ChevronDown size={10} className={cn('transition-transform', !showPrompt && '-rotate-90')} />
          이미지 프롬프트
        </button>
        {showPrompt && (
          <Textarea
            value={card.image_prompt ?? ''}
            onChange={(e) => onUpdate(card.id, { image_prompt: e.target.value })}
            placeholder="이미지 생성 프롬프트..."
            className="mt-1 h-14 resize-none overflow-y-auto text-[10px]"
          />
        )}
      </div>
    </div>
  );
}

// ─── Add Slide Button ─────────────────────────────────────

export function AddSlideButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="rounded-lg border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
      style={{ aspectRatio: '4/5' }}
    >
      <Plus size={20} />
      <span className="text-xs">슬라이드 추가</span>
    </button>
  );
}
