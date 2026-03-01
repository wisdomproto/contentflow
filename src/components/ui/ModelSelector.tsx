'use client';

import { cn } from '@/lib/utils';
import { GEMINI_MODELS } from '@/lib/constants';
import { useContentStore } from '@/stores/useContentStore';
import type { GeminiModel, ModelSettings } from '@/types/content';
import { Cpu } from 'lucide-react';

interface ModelSelectorProps {
  tab: keyof ModelSettings;
  contentId: string;
  currentModel: GeminiModel;
  compact?: boolean;
}

export function ModelSelector({ tab, contentId, currentModel, compact = false }: ModelSelectorProps) {
  const updateModelSettings = useContentStore((s) => s.updateModelSettings);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Cpu size={14} className="text-muted-foreground" />
        <select
          value={currentModel}
          onChange={(e) => updateModelSettings(contentId, tab, e.target.value as GeminiModel)}
          className="h-7 rounded border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {GEMINI_MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.badge} {m.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">AI 모델 선택</label>
      <div className="flex flex-col gap-1.5">
        {GEMINI_MODELS.map((model) => (
          <button
            key={model.value}
            onClick={() => updateModelSettings(contentId, tab, model.value)}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
              currentModel === model.value
                ? 'border-primary bg-accent'
                : 'border-border hover:border-primary/50 hover:bg-muted/50',
            )}
          >
            <span className="mt-0.5 text-lg">{model.badge}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{model.label}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {model.speed}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{model.description}</p>
              <div className="mt-1 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 w-4 rounded-full',
                      i < model.quality ? 'bg-primary' : 'bg-border',
                    )}
                  />
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
