'use client';

import { GripVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface SectionControlsProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDelete: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function SectionControls({
  isCollapsed,
  onToggleCollapse,
  onDelete,
  dragHandleProps,
}: SectionControlsProps) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        {...dragHandleProps}
        className="cursor-grab rounded p-1 hover:bg-muted active:cursor-grabbing"
        title="드래그하여 순서 변경"
      >
        <GripVertical size={16} className="text-muted-foreground" />
      </button>
      <button
        onClick={onToggleCollapse}
        className="rounded p-1 hover:bg-muted"
        title={isCollapsed ? '펼치기' : '접기'}
      >
        {isCollapsed ? (
          <ChevronDown size={16} className="text-muted-foreground" />
        ) : (
          <ChevronUp size={16} className="text-muted-foreground" />
        )}
      </button>
      <button
        onClick={onDelete}
        className="rounded p-1 hover:bg-red-50 hover:text-destructive"
        title="섹션 삭제"
      >
        <Trash2 size={16} className="text-muted-foreground" />
      </button>
    </div>
  );
}
