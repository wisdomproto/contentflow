'use client';

import { GripVertical, Trash2, Copy } from 'lucide-react';

interface SlideControlsProps {
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function SlideControls({
  onDelete,
  onDuplicate,
  dragHandleProps,
}: SlideControlsProps) {
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
        onClick={onDuplicate}
        className="rounded p-1 hover:bg-muted"
        title="슬라이드 복제"
      >
        <Copy size={16} className="text-muted-foreground" />
      </button>
      <button
        onClick={onDelete}
        className="rounded p-1 hover:bg-red-50 hover:text-destructive"
        title="슬라이드 삭제"
      >
        <Trash2 size={16} className="text-muted-foreground" />
      </button>
    </div>
  );
}
