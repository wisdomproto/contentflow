'use client';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { PanelRight, PanelRightClose } from 'lucide-react';
import { PreviewPanel } from '@/components/right-panel/PreviewPanel';
import { SeoChecklist } from '@/components/right-panel/SeoChecklist';
import { KeywordPanel } from '@/components/right-panel/KeywordPanel';
import { CardNewsPreviewPanel } from '@/components/card-news/CardNewsPreviewPanel';

export function RightPanel() {
  const isOpen = useUIStore((s) => s.isRightPanelOpen);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const activeTab = useUIStore((s) => s.activeTab);

  return (
    <>
      <button
        onClick={toggleRightPanel}
        className="absolute right-2 top-[calc(var(--header-height)+8px)] z-10 rounded-md p-1.5 hover:bg-muted"
      >
        {isOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
      </button>

      <aside
        className={cn(
          'flex h-full flex-col border-l border-border bg-background transition-all duration-200',
          isOpen ? 'w-right-panel' : 'w-0 overflow-hidden',
        )}
      >
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'basic' && <KeywordPanel />}
          {activeTab === 'blog' && (
            <>
              <PreviewPanel />
              <SeoChecklist />
            </>
          )}
          {activeTab === 'cardnews' && <CardNewsPreviewPanel />}
          {activeTab === 'video' && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              미리보기 준비 중
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
