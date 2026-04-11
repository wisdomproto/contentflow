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

export function useR2Upload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File | Blob, options: UploadOptions): Promise<UploadResult> => {
    setUploading(true);
    setError(null);

    // Client-side file size validation
    const maxSize = MAX_SIZES[options.category];
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      const err = new Error(`파일 크기가 ${maxMB}MB 제한을 초과합니다.`);
      setError(err.message);
      setUploading(false);
      throw err;
    }

    const attempt = async (): Promise<UploadResult> => {
      // 1. Get presigned URL
      const presignRes = await fetch('/api/storage/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json();
        throw new Error(data.error || 'Presigned URL 생성 실패');
      }

      const { presignedUrl, publicUrl, key } = await presignRes.json();

      // 2. Upload directly to R2
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': options.contentType },
      });

      if (!uploadRes.ok) {
        throw new Error(`R2 업로드 실패 (HTTP ${uploadRes.status})`);
      }

      return { publicUrl, key };
    };

    try {
      return await attempt();
    } catch (firstErr) {
      // Retry once
      try {
        return await attempt();
      } catch (retryErr) {
        const msg = retryErr instanceof Error ? retryErr.message : '업로드 중 오류가 발생했습니다.';
        setError(msg);
        throw retryErr;
      }
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
