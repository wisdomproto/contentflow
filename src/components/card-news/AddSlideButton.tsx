'use client';

import { Plus } from 'lucide-react';

interface AddSlideButtonProps {
  onClick: () => void;
}

export function AddSlideButton({ onClick }: AddSlideButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 hover:text-foreground"
    >
      <Plus size={16} />
      슬라이드 추가
    </button>
  );
}
