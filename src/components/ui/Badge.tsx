'use client';

import { cn } from '@/lib/utils';
import type { ContentStatus } from '@/types/content';
import { STATUS_CONFIG } from '@/lib/constants';

interface BadgeProps {
  status: ContentStatus;
  className?: string;
}

export function Badge({ status, className }: BadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.color,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
