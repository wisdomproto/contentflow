'use client';

import { cn } from '@/lib/utils';
import { FileText, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useContentStore } from '@/stores/useContentStore';
import { toast } from '@/components/ui/Toast';
import type { ContentContext } from '@/types/content';

interface ContentItemProps {
  content: ContentContext;
}

export function ContentItem({ content }: ContentItemProps) {
  const activeContentId = useContentStore((s) => s.activeContentId);
  const setActiveContent = useContentStore((s) => s.setActiveContent);
  const deleteContent = useContentStore((s) => s.deleteContent);
  const isActive = activeContentId === content.id;

  const title = content.source.topic || content.blog.title || '제목 없음';
  const hasBlob = content.blog.title !== '';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`"${title}" 컨텐츠를 삭제하시겠습니까?`)) {
      deleteContent(content.id);
      toast('컨텐츠가 삭제되었습니다', 'success');
    }
  };

  return (
    <button
      onClick={() => setActiveContent(content.id)}
      className={cn(
        'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
      )}
    >
      <FileText size={14} className="shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{title}</span>
        <div className="flex items-center gap-1.5">
          {hasBlob && <span className="text-xs">📝</span>}
          <Badge status={content.status} />
        </div>
      </div>
      <span
        role="button"
        onClick={handleDelete}
        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        title="삭제"
      >
        <Trash2 size={14} />
      </span>
    </button>
  );
}
