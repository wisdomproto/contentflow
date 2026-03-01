'use client';

import { cn } from '@/lib/utils';
import { CARD_NEWS_TEMPLATES, CARD_NEWS_COLOR_THEMES, CARD_NEWS_FONTS } from '@/lib/constants';
import type { CardNewsData } from '@/types/card-news';

interface CardNewsToolbarProps {
  settings: Pick<CardNewsData, 'template' | 'colorTheme' | 'font' | 'ratio'>;
  onUpdate: (settings: Partial<Pick<CardNewsData, 'template' | 'colorTheme' | 'font' | 'ratio'>>) => void;
}

export function CardNewsToolbar({ settings, onUpdate }: CardNewsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      {/* Template */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">템플릿</label>
        <select
          value={settings.template}
          onChange={(e) => onUpdate({ template: e.target.value })}
          className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none"
        >
          {CARD_NEWS_TEMPLATES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Color Theme */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">컬러</label>
        <div className="flex items-center gap-1">
          {CARD_NEWS_COLOR_THEMES.map((c) => (
            <button
              key={c.value}
              onClick={() => onUpdate({ colorTheme: c.value })}
              title={c.label}
              className={cn(
                'h-5 w-5 rounded-full border-2 transition-transform hover:scale-110',
                settings.colorTheme === c.value
                  ? 'border-primary scale-110'
                  : 'border-transparent',
              )}
              style={{ backgroundColor: c.bg }}
            />
          ))}
        </div>
      </div>

      {/* Font */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">폰트</label>
        <select
          value={settings.font}
          onChange={(e) => onUpdate({ font: e.target.value })}
          className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none"
        >
          {CARD_NEWS_FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Ratio */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">비율</label>
        <div className="flex rounded-md border border-border">
          <button
            onClick={() => onUpdate({ ratio: '1:1' })}
            className={cn(
              'px-2.5 py-1 text-xs font-medium transition-colors',
              settings.ratio === '1:1'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            1:1
          </button>
          <button
            onClick={() => onUpdate({ ratio: '9:16' })}
            className={cn(
              'px-2.5 py-1 text-xs font-medium transition-colors',
              settings.ratio === '9:16'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            9:16
          </button>
        </div>
      </div>
    </div>
  );
}
