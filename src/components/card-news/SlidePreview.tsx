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
  const theme =
    CARD_NEWS_COLOR_THEMES.find((c) => c.value === settings.colorTheme) ??
    CARD_NEWS_COLOR_THEMES[0];
  const isSquare = settings.ratio === '1:1';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md border border-border w-full',
        isSquare ? 'aspect-square' : 'aspect-[9/16]',
      )}
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
      }}
    >
      {/* Background image */}
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
          'relative flex h-full flex-col items-center justify-center text-center',
          slide.imageUrl && 'text-white',
          settings.template === 'bold' && 'justify-end',
          settings.template === 'magazine' && 'items-start justify-end text-left',
        )}
        style={{
          padding: size === 'md' ? '16px' : '12px',
          ...(settings.template === 'bold' && {
            paddingBottom: size === 'md' ? '24px' : '16px',
          }),
          ...(settings.template === 'magazine' && {
            paddingBottom: '16px',
            paddingLeft: '16px',
          }),
        }}
      >
        <p
          style={{
            fontSize: size === 'md' ? 16 : 12,
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          {slide.headline || '헤드라인'}
        </p>
        {slide.body && (
          <p
            style={{
              fontSize: size === 'md' ? 12 : 10,
              lineHeight: 1.5,
              opacity: 0.85,
              marginTop: 4,
            }}
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
