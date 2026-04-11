'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, Plus, Trash2, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/error-boundary';

interface ChannelContentListProps<T> {
  items: T[];
  getId: (item: T) => string;
  getTitle: (item: T, index: number) => string;
  onTitleChange: (itemId: string, title: string) => void;
  onAdd: () => string; // returns new item id
  onDelete: (itemId: string) => void;
  addLabel: string;
  renderContent: (item: T) => React.ReactNode;
}

export function ChannelContentList<T>({
  items,
  getId,
  getTitle,
  onTitleChange,
  onAdd,
  onDelete,
  addLabel,
  renderContent,
}: ChannelContentListProps<T>) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // 첫 번째 항목 자동 펼침
    if (items.length > 0) return new Set([getId(items[0])]);
    return new Set();
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAdd = useCallback(() => {
    const newId = onAdd();
    setExpandedIds((prev) => new Set(prev).add(newId));
  }, [onAdd]);

  const handleDelete = useCallback((id: string) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    onDelete(id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [onDelete]);

  const startEditing = useCallback((id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  }, []);

  const finishEditing = useCallback(() => {
    if (editingId && editTitle.trim()) {
      onTitleChange(editingId, editTitle.trim());
    }
    setEditingId(null);
  }, [editingId, editTitle, onTitleChange]);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const id = getId(item);
        const isExpanded = expandedIds.has(id);
        const title = getTitle(item, index);
        const isEditing = editingId === id;

        return (
          <div key={id} className="rounded-lg border border-border bg-background overflow-hidden">
            {/* Header */}
            <div
              className="flex items-center gap-1.5 px-2 py-2 cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
              onClick={() => toggleExpand(id)}
            >
              <ChevronDown
                size={14}
                className={cn(
                  'text-muted-foreground transition-transform shrink-0',
                  !isExpanded && '-rotate-90'
                )}
              />

              {isEditing ? (
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') finishEditing();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={finishEditing}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="min-w-0 max-w-[120px] text-xs font-medium bg-transparent border-b border-primary outline-none px-0"
                />
              ) : (
                <span className="min-w-0 max-w-[120px] text-xs font-medium truncate" title={title}>{title}</span>
              )}

              <Badge variant="secondary" className="text-[10px] shrink-0">
                {index + 1}
              </Badge>

              <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                {isEditing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={finishEditing}
                    className="h-6 w-6 p-0"
                  >
                    <Check size={12} />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(id, title)}
                    className="h-6 w-6 p-0"
                  >
                    <Pencil size={12} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(id)}
                  className="h-6 w-6 p-0 hover:text-destructive"
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>

            {/* Content */}
            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-border">
                <ErrorBoundary resetKeys={[id]}>
                  {renderContent(item)}
                </ErrorBoundary>
              </div>
            )}
          </div>
        );
      })}

      {/* Add button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="w-full gap-1.5 border-dashed"
      >
        <Plus size={14} /> {addLabel}
      </Button>
    </div>
  );
}
