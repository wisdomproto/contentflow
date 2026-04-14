'use client';

import { useState, useCallback } from 'react';

export type StorageCategory = 'images' | 'references' | 'bgm' | 'videos' | 'content';

export interface UploadOptions {
  projectId: string;
  category: StorageCategory;
  fileName: string;
  contentType: string;
  contentId?: string;
}

export interface UploadResult {
  publicUrl: string;
  key: string;
}

/**
 * Convert a PNG/JPEG base64 to WebP Blob via Canvas API (client-side, ~60-80% smaller).
 * Falls back to original blob if Canvas WebP is unsupported.
 */
export async function convertToWebpBlob(base64: string, srcMime: string): Promise<{ blob: Blob; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve({ blob: base64ToBlob(base64, srcMime), mimeType: srcMime }); return; }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (b) => {
          if (b && b.type === 'image/webp') resolve({ blob: b, mimeType: 'image/webp' });
          else resolve({ blob: base64ToBlob(base64, srcMime), mimeType: srcMime });
        },
        'image/webp',
        0.85
      );
    };
    img.onerror = () => resolve({ blob: base64ToBlob(base64, srcMime), mimeType: srcMime });
    img.src = `data:${srcMime};base64,${base64}`;
  });
}

/**
 * Convert base64 (data URL or raw) to Blob.
 * Exported for testing.
 */
export function base64ToBlob(input: string, mimeType?: string): Blob {
  let base64: string;
  let type: string;

  if (input.startsWith('data:')) {
    const match = input.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('잘못된 base64 data URL 형식입니다.');
    type = match[1];
    base64 = match[2];
  } else {
    if (!mimeType) throw new Error('raw base64에는 mimeType이 필요합니다.');
    type = mimeType;
    base64 = input;
  }

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  } catch {
    throw new Error('base64 디코딩에 실패했습니다.');
  }
}

const MAX_SIZES: Record<StorageCategory, number> = {
  images: 20 * 1024 * 1024,
  references: 50 * 1024 * 1024,
  bgm: 100 * 1024 * 1024,
  videos: 500 * 1024 * 1024,
  content: 10 * 1024 * 1024,
};

/**
 * Core R2 upload — presign then PUT.  Usable from any context (no React hook).
 * Throws on size-limit breach, presign failure, or upload failure (after one retry).
 */
export async function uploadToR2(
  file: File | Blob,
  options: UploadOptions
): Promise<UploadResult> {
  const maxSize = MAX_SIZES[options.category];
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    throw new Error(`파일 크기가 ${maxMB}MB 제한을 초과합니다.`);
  }

  const attempt = async (): Promise<UploadResult> => {
    const presignRes = await fetch('/api/storage/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!presignRes.ok) {
      const data = await presignRes.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || 'Presigned URL 생성 실패');
    }
    const { presignedUrl, publicUrl, key } = await presignRes.json();
    const uploadRes = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': options.contentType },
    });
    if (!uploadRes.ok) throw new Error(`R2 업로드 실패 (HTTP ${uploadRes.status})`);
    return { publicUrl, key };
  };

  try {
    return await attempt();
  } catch {
    return await attempt(); // single retry
  }
}

export function useR2Upload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File | Blob, options: UploadOptions): Promise<UploadResult> => {
    setUploading(true);
    setError(null);
    try {
      return await uploadToR2(file, options);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.';
      setError(msg);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const uploadBase64 = useCallback(async (base64: string, mimeType: string, options: UploadOptions): Promise<UploadResult> => {
    const blob = base64ToBlob(base64, mimeType);
    return upload(blob, options);
  }, [upload]);

  return { upload, uploadBase64, uploading, error };
}
