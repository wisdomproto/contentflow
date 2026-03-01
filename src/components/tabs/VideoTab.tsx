'use client';

import { Video } from 'lucide-react';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { useContentStore } from '@/stores/useContentStore';

export function VideoTab() {
  const activeContentId = useContentStore((s) => s.activeContentId);
  const contents = useContentStore((s) => s.contents);
  const content = activeContentId ? contents[activeContentId] : null;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {content && (
        <div className="mb-6 self-end px-6">
          <ModelSelector
            tab="video"
            contentId={content.id}
            currentModel={content.modelSettings?.video ?? 'flash'}
            compact
          />
        </div>
      )}
      <div className="mb-4 rounded-full bg-muted p-4">
        <Video size={32} className="text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-lg font-semibold">숏폼 영상 기능 준비 중</h2>
      <p className="text-sm text-muted-foreground">
        블로그 본문을 릴스/쇼츠 대본으로
        <br />
        자동 변환하는 기능이 곧 추가됩니다
      </p>
    </div>
  );
}
