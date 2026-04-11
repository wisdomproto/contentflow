'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">오류가 발생했습니다</h2>
          <p className="text-sm text-muted-foreground">
            {error.message || '대시보드를 불러오는 중 문제가 발생했습니다.'}
          </p>
        </div>
        <Button onClick={reset} className="gap-1.5">
          <RefreshCw size={16} />
          다시 시도
        </Button>
      </div>
    </div>
  );
}
