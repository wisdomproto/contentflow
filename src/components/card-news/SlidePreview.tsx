'use client';

import { cn } from '@/lib/utils';
import { CARD_NEWS_COLOR_THEMES } from '@/lib/constants';
import type { Slide, CardNewsData } from '@/types/card-news';

interface SlidePreviewProps {
  slide: Slide;
  settings: Pick<CardNewsData, 'template' | 'colorTheme' | 'font' | 'ratio'>;
  size?: 'sm' | 'md';
}

export function SlidePreview({ slide, settings, size = 'sm' }: SlidePreviewProps) {
  const theme = CARD_NEWS_COLOR_THEMES.find((c) => c.value === settings.colorTheme) ?? CARD_NEWS_COLOR_THEMES[0];
  const isSquare = settings.ratio === '1:1';

  const fontClass =
    settings.font === 'noto-sans' ? 'font-[var(--font-noto)]' : 'font-[var(--font-pretendard)]';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md border border-border',
        isSquare ? 'aspect-square' : 'aspect-[9/16]',
        size === 'sm' ? 'w-full' : 'w-full max-w-[280px]',
        fontClass,
      )}
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* Background image if present */}
      {slide.imageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </>
      )}

      {/* Text overlay */}
      <div
        className={cn(
          'relative flex h-full flex-col items-center justify-center p-3 text-center',
          slide.imageUrl && 'text-white',
          settings.template === 'bold' && 'justify-end pb-6',
          settings.template === 'magazine' && 'items-start justify-end pb-4 pl-4 text-left',
        )}
      >
        <p
          className={cn(
            'font-bold leading-tight',
            size === 'sm' ? 'text-xs' : 'text-sm',
            settings.template === 'bold' && (size === 'sm' ? 'text-sm' : 'text-base'),
          )}
        >
          {slide.headline || '헤드라인'}
        </p>
        {slide.body && (
          <p
            className={cn(
              'mt-1 leading-snug opacity-80',
              size === 'sm' ? 'text-[10px]' : 'text-xs',
            )}
          >
            {slide.body}
          </p>
        )}
      </div>

      {/* Gradient overlay for gradient template */}
      {settings.template === 'gradient' && !slide.imageUrl && (
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(135deg, transparent 0%, ${theme.text}22 100%)`,
          }}
        />
      )}
    </div>
  );
}
