'use client';

import { useRef, useCallback } from 'react';

interface UseR2ContentSyncOptions {
  projectId: string;
  contentId: string;
  delay?: number; // debounce delay in ms, default 5000
}

export function useR2ContentSync({ projectId, contentId, delay = 5000 }: UseR2ContentSyncOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDataRef = useRef<Record<string, unknown> | null>(null);

  const syncToR2 = useCallback(async (data: Record<string, unknown>) => {
    try {
      const json = JSON.stringify(data);
      const blob = new Blob([json], { type: 'application/json' });

      const presignRes = await fetch('/api/storage/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          category: 'content',
          fileName: `${contentId}.json`,
          contentType: 'application/json',
          contentId,
        }),
      });

      if (!presignRes.ok) return;

      const { presignedUrl } = await presignRes.json();
      await fetch(presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'application/json' },
      });
      pendingDataRef.current = null;
    } catch {
      // Sync failure is non-blocking — IndexedDB is the primary store
    }
  }, [projectId, contentId]);

  const scheduleSync = useCallback((data: Record<string, unknown>) => {
    pendingDataRef.current = data;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => syncToR2(data), delay);
  }, [syncToR2, delay]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Send any pending data immediately
    if (pendingDataRef.current) {
      syncToR2(pendingDataRef.current);
    }
  }, [syncToR2]);

  return { scheduleSync, flush };
}
