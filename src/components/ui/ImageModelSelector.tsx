'use client';

import { ImageIcon } from 'lucide-react';
import { GEMINI_IMAGE_MODELS } from '@/lib/constants';
import { useContentStore } from '@/stores/useContentStore';
import type { ImageModel } from '@/types/content';

interface ImageModelSelectorProps {
  contentId: string;
  currentModel: ImageModel;
}

export function ImageModelSelector({ contentId, currentModel }: ImageModelSelectorProps) {
  const updateImageModel = useContentStore((s) => s.updateImageModel);

  return (
    <div className="flex items-center gap-1.5">
      <ImageIcon size={14} className="text-muted-foreground" />
      <select
        value={currentModel}
        onChange={(e) => updateImageModel(contentId, e.target.value as ImageModel)}
        className="h-7 rounded border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {GEMINI_IMAGE_MODELS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.badge} {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
