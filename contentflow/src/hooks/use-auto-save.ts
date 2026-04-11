'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

interface UseAutoSaveOptions {
  delay?: number;
  onSave: (data: { html: string; plainText: string; wordCount: number }) => void;
}

export function useAutoSave({ delay = 2000, onSave }: UseAutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ html: string; plainText: string; wordCount: number } | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const flush = useCallback(() => {
    if (pendingRef.current) {
      onSave(pendingRef.current);
      setLastSaved(new Date());
      pendingRef.current = null;
    }
  }, [onSave]);

  const schedule = useCallback(
    (html: string, plainText: string, wordCount: number) => {
      pendingRef.current = { html, plainText, wordCount };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, delay);
    },
    [delay, flush]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      flush();
    };
  }, [flush]);

  return { schedule, flush, lastSaved };
}
