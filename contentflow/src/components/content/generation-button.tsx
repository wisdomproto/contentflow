'use client';

import { Button } from '@/components/ui/button';
import { Sparkles, ImageIcon, Loader2, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

type GenerationVariant = 'text' | 'image' | 'batch-image';

interface GenerationButtonProps {
  variant?: GenerationVariant;
  isGenerating: boolean;
  disabled?: boolean;
  onClick: () => void;
  onAbort?: () => void;
  /** e.g. "AI 생성", "AI 대본", "전체 이미지" */
  label?: string;
  /** e.g. "생성 중...", "대본 생성 중..." */
  loadingLabel?: string;
  /** Batch progress */
  progress?: { current: number; total: number };
  className?: string;
  size?: 'default' | 'sm' | 'lg';
}

const defaultLabels: Record<GenerationVariant, { label: string; loading: string }> = {
  text: { label: 'AI 생성', loading: '생성 중...' },
  image: { label: '이미지 생성', loading: '이미지 생성 중...' },
  'batch-image': { label: '전체 이미지', loading: '이미지 생성 중...' },
};

const variantIcon: Record<GenerationVariant, typeof Sparkles> = {
  text: Sparkles,
  image: ImageIcon,
  'batch-image': ImageIcon,
};

const variantColors: Record<GenerationVariant, { base: string; generating: string }> = {
  text: {
    base: 'bg-green-600 hover:bg-green-700 text-white',
    generating: 'bg-blue-600 hover:bg-blue-600 text-white',
  },
  image: {
    base: '',
    generating: 'border-green-600 text-green-600',
  },
  'batch-image': {
    base: '',
    generating: 'border-green-600 text-green-600',
  },
};

export function GenerationButton({
  variant = 'text',
  isGenerating,
  disabled = false,
  onClick,
  onAbort,
  label,
  loadingLabel,
  progress,
  className,
  size = 'sm',
}: GenerationButtonProps) {
  const defaults = defaultLabels[variant];
  const displayLabel = label ?? defaults.label;
  const displayLoading = loadingLabel ?? defaults.loading;
  const Icon = variantIcon[variant];
  const colors = variantColors[variant];
  const isImageVariant = variant === 'image' || variant === 'batch-image';

  const progressText = progress && progress.total > 0
    ? ` (${progress.current}/${progress.total})`
    : '';

  if (isGenerating) {
    return (
      <div className="flex gap-1.5">
        <Button
          disabled
          size={size}
          variant={isImageVariant ? 'outline' : 'default'}
          className={cn('gap-1.5', colors.generating, className)}
        >
          <Loader2 size={14} className="animate-spin" />
          {displayLoading}{progressText}
        </Button>
        {onAbort && (
          <Button
            variant="destructive"
            size={size}
            onClick={onAbort}
            className="gap-1"
          >
            <Square size={10} fill="currentColor" /> 중단
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      size={size}
      variant={isImageVariant ? 'outline' : 'default'}
      className={cn('gap-1.5', !isImageVariant && colors.base, className)}
    >
      <Icon size={14} /> {displayLabel}
    </Button>
  );
}
