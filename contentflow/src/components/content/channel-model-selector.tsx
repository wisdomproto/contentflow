'use client';

import { useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Cpu, ImageIcon, RectangleHorizontal, Palette, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { TEXT_MODELS, IMAGE_MODELS } from '@/lib/ai-models';
import { ASPECT_RATIO_PRESETS, ImageStyleSelector } from './image-style-selector';

interface ChannelModelSelectorProps {
  textModel: string;
  imageModel: string;
  onTextModelChange: (model: string) => void;
  onImageModelChange: (model: string) => void;
  showImageModel?: boolean;
  // Image settings
  aspectRatio?: string;
  onAspectRatioChange?: (ratio: string) => void;
  imageStyle?: string;
  onImageStyleChange?: (style: string) => void;
  showImageSettings?: boolean;
  defaultAspectRatio?: string;
  // Image instruction
  imageInstruction?: string;
  onImageInstructionChange?: (instruction: string) => void;
}

export function ChannelModelSelector({
  textModel,
  imageModel,
  onTextModelChange,
  onImageModelChange,
  showImageModel = true,
  aspectRatio,
  onAspectRatioChange,
  imageStyle,
  onImageStyleChange,
  showImageSettings = true,
  defaultAspectRatio = '1:1',
  imageInstruction,
  onImageInstructionChange,
}: ChannelModelSelectorProps) {
  const hasImageSettings = showImageSettings && showImageModel;
  const [showInstruction, setShowInstruction] = useState(false);

  return (
    <div className="space-y-2">
      {/* All settings in one row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Cpu size={14} className="text-muted-foreground shrink-0" />
          <Select value={textModel} onValueChange={(v) => { if (v) onTextModelChange(v); }}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[140px] gap-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEXT_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showImageModel && (
          <div className="flex items-center gap-1.5">
            <ImageIcon size={14} className="text-muted-foreground shrink-0" />
            <Select value={imageModel} onValueChange={(v) => { if (v) onImageModelChange(v); }}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-[180px] gap-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      {hasImageSettings && (
        <>
          {onAspectRatioChange && (
            <div className="flex items-center gap-1.5">
              <RectangleHorizontal size={14} className="text-muted-foreground shrink-0" />
              <Select value={aspectRatio || defaultAspectRatio} onValueChange={(v) => { if (v) onAspectRatioChange(v); }}>
                <SelectTrigger className="h-7 text-xs w-auto min-w-[130px] gap-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIO_PRESETS.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="text-xs">
                      {r.label} <span className="text-muted-foreground ml-1">({r.desc})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {onImageStyleChange && (
            <div className="flex items-center gap-1.5">
              <Palette size={14} className="text-muted-foreground shrink-0" />
              <ImageStyleSelector value={imageStyle || ''} onChange={onImageStyleChange} compact />
            </div>
          )}
        </>
      )}
      </div>

      {/* Image instruction */}
      {hasImageSettings && onImageInstructionChange && (
        <div>
          <button
            onClick={() => setShowInstruction(!showInstruction)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showInstruction ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <MessageSquare size={12} />
            <span>이미지 생성 지시사항</span>
            {imageInstruction && <span className="text-primary ml-1">●</span>}
          </button>
          {showInstruction && (
            <textarea
              value={imageInstruction || ''}
              onChange={e => onImageInstructionChange(e.target.value)}
              placeholder="예: 텍스트 넣지 마, 동양인으로, 밝은 톤, 일러스트 스타일..."
              className="mt-1.5 w-full h-16 bg-muted border border-border rounded-md p-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}
        </div>
      )}
    </div>
  );
}
