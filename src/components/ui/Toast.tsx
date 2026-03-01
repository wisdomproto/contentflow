'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  action?: { label: string; onClick: () => void };
}

let addToastFn: ((toast: Omit<ToastMessage, 'id'>) => void) | null = null;

export function toast(message: string, type: ToastMessage['type'] = 'info', action?: ToastMessage['action']) {
  addToastFn?.({ type, message, action });
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg transition-all',
            {
              'border-green-200 bg-green-50': t.type === 'success',
              'border-red-200 bg-red-50': t.type === 'error',
              'border-border bg-background': t.type === 'info',
            },
          )}
        >
          {t.type === 'success' && <CheckCircle size={16} className="text-green-600" />}
          {t.type === 'error' && <AlertCircle size={16} className="text-red-600" />}
          <span className="text-sm">{t.message}</span>
          {t.action && (
            <button
              onClick={t.action.onClick}
              className="ml-2 text-sm font-medium text-primary hover:underline"
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => removeToast(t.id)} className="ml-2 p-0.5 hover:bg-muted rounded">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
