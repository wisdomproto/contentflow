# Cloudflare R2 Storage Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Cloudflare R2 as the primary file storage for images, references, BGM, videos, and content JSON — replacing base64/IndexedDB storage.

**Architecture:** Client requests a presigned PUT URL from Next.js API → uploads directly to R2 → stores the public URL in Zustand. Public bucket for reads. S3-compatible SDK via `@aws-sdk/client-s3`.

**Tech Stack:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, Next.js 16 API Routes, Vitest

**Spec:** `docs/superpowers/specs/2026-03-24-cloudflare-r2-storage-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/r2-client.ts` | S3Client instance + bucket/URL constants (server-only) |
| `src/lib/r2-storage.ts` | Server-side helpers: generate key, validate content-type, list+delete with pagination |
| `src/app/api/storage/presign/route.ts` | Presigned PUT URL generation endpoint |
| `src/app/api/storage/delete/route.ts` | Batch object deletion endpoint |
| `src/app/api/storage/delete-prefix/route.ts` | Prefix-based cascade deletion endpoint |
| `src/hooks/use-r2-upload.ts` | Client hook: presign → PUT → return publicUrl |
| `src/lib/__tests__/r2-storage.test.ts` | Unit tests for server-side helpers |
| `src/hooks/__tests__/use-r2-upload.test.ts` | Unit tests for upload hook |

### Modified Files
| File | Change |
|------|--------|
| `src/types/database.ts` | Add `url`, `r2_key` to `ReferenceFile` and `BgmFile` |
| `src/hooks/use-card-image-generation.ts` | Upload base64 to R2 after generation, store URL instead of dataUrl |
| `src/components/project/reference-files-section.tsx` | Upload files to R2 on selection, store URL |
| `src/components/project/bgm-section.tsx` | Upload files to R2, use R2 URL for playback |
| `src/stores/project-store.ts` | Call R2 delete on project/content deletion |
| `.env.local.example` | Add R2 env vars |

---

## Task 1: Install Dependencies + Environment Setup

**Files:**
- Modify: `contentflow/package.json`
- Modify: `contentflow/.env.local.example`

- [ ] **Step 1: Install AWS S3 SDK packages**

```bash
cd C:/projects/ContentFlow/contentflow && npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Add R2 env vars to .env.local.example**

Append to `contentflow/.env.local.example`:
```env

# Cloudflare R2
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-bucket.r2.dev
```

- [ ] **Step 3: Verify .env.local has the actual R2 values**

Check that `contentflow/.env.local` contains the 6 R2 variables (including `NEXT_PUBLIC_R2_PUBLIC_URL`). If not, warn the user to fill them in. Do NOT create or overwrite `.env.local`.

- [ ] **Step 3.5: Verify R2 bucket CORS is configured**

The R2 bucket must allow PUT from the app's origin. Instruct user to verify in Cloudflare Dashboard > R2 > bucket > Settings > CORS:
```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```
If not configured, client-side uploads will fail with CORS errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.local.example
git commit -m "feat: add AWS S3 SDK for Cloudflare R2 integration"
```

---

## Task 2: R2 Client + Server Helpers

**Files:**
- Create: `src/lib/r2-client.ts`
- Create: `src/lib/r2-storage.ts`
- Test: `src/lib/__tests__/r2-storage.test.ts`

- [ ] **Step 1: Write tests for r2-storage helpers**

Create `src/lib/__tests__/r2-storage.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateR2Key, isAllowedContentType, getMaxFileSize, extractKeyFromPublicUrl } from './r2-storage';

describe('generateR2Key', () => {
  it('generates key with correct structure', () => {
    const key = generateR2Key({
      projectId: 'proj-abc123',
      category: 'images',
      fileName: 'photo.png',
      contentId: 'card-xyz',
    });
    expect(key).toMatch(/^proj-abc123\/images\/card-xyz-\d+-[a-z0-9]+\.png$/);
  });

  it('generates key without contentId', () => {
    const key = generateR2Key({
      projectId: 'proj-abc123',
      category: 'bgm',
      fileName: 'song.mp3',
    });
    expect(key).toMatch(/^proj-abc123\/bgm\/\d+-[a-z0-9]+\.mp3$/);
  });

  it('handles filenames with no extension', () => {
    const key = generateR2Key({
      projectId: 'proj-abc123',
      category: 'content',
      fileName: 'data',
    });
    expect(key).toMatch(/^proj-abc123\/content\/\d+-[a-z0-9]+$/);
  });
});

describe('isAllowedContentType', () => {
  it('allows image/png for images category', () => {
    expect(isAllowedContentType('images', 'image/png')).toBe(true);
  });

  it('rejects text/html for images category', () => {
    expect(isAllowedContentType('images', 'text/html')).toBe(false);
  });

  it('allows audio/mpeg for bgm category', () => {
    expect(isAllowedContentType('bgm', 'audio/mpeg')).toBe(true);
  });

  it('allows application/json for content category', () => {
    expect(isAllowedContentType('content', 'application/json')).toBe(true);
  });

  it('allows application/pdf for references category', () => {
    expect(isAllowedContentType('references', 'application/pdf')).toBe(true);
  });

  it('allows image types for references category', () => {
    expect(isAllowedContentType('references', 'image/jpeg')).toBe(true);
  });

  it('allows video/mp4 for videos category', () => {
    expect(isAllowedContentType('videos', 'video/mp4')).toBe(true);
  });

  it('rejects application/javascript for all categories', () => {
    expect(isAllowedContentType('images', 'application/javascript')).toBe(false);
    expect(isAllowedContentType('bgm', 'application/javascript')).toBe(false);
  });
});

describe('getMaxFileSize', () => {
  it('returns 20MB for images', () => {
    expect(getMaxFileSize('images')).toBe(20 * 1024 * 1024);
  });

  it('returns 100MB for bgm', () => {
    expect(getMaxFileSize('bgm')).toBe(100 * 1024 * 1024);
  });

  it('returns 500MB for videos', () => {
    expect(getMaxFileSize('videos')).toBe(500 * 1024 * 1024);
  });
});

describe('extractKeyFromPublicUrl', () => {
  it('extracts key from public URL', () => {
    const key = extractKeyFromPublicUrl(
      'https://bucket.r2.dev/proj-123/images/card-1-123-abc.png',
      'https://bucket.r2.dev'
    );
    expect(key).toBe('proj-123/images/card-1-123-abc.png');
  });

  it('returns null for non-matching URL', () => {
    const key = extractKeyFromPublicUrl(
      'https://other-domain.com/file.png',
      'https://bucket.r2.dev'
    );
    expect(key).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/projects/ContentFlow/contentflow && npm run test -- src/lib/__tests__/r2-storage.test.ts
```
Expected: FAIL — modules not found.

- [ ] **Step 3: Create r2-client.ts**

Create `src/lib/r2-client.ts`:

```typescript
import { S3Client } from '@aws-sdk/client-s3';

export function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 환경변수가 설정되지 않았습니다 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function getR2Bucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error('R2_BUCKET_NAME 환경변수가 설정되지 않았습니다.');
  return bucket;
}

export function getR2PublicUrl(): string {
  const url = process.env.R2_PUBLIC_URL;
  if (!url) throw new Error('R2_PUBLIC_URL 환경변수가 설정되지 않았습니다.');
  return url.replace(/\/$/, ''); // trailing slash 제거
}
```

- [ ] **Step 4: Create r2-storage.ts**

Create `src/lib/r2-storage.ts`:

```typescript
import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getR2Client, getR2Bucket } from './r2-client';

export type StorageCategory = 'images' | 'references' | 'bgm' | 'videos' | 'content';

const ALLOWED_TYPES: Record<StorageCategory, RegExp[]> = {
  images: [/^image\/(png|jpeg|webp|gif)$/],
  references: [/^image\//, /^application\/pdf$/, /^application\/msword$/, /^application\/vnd\.openxmlformats-/, /^text\/(plain|markdown)$/],
  bgm: [/^audio\/(mpeg|wav|ogg|mp4|aac|flac)$/],
  videos: [/^video\/(mp4|webm)$/],
  content: [/^application\/json$/],
};

const MAX_FILE_SIZES: Record<StorageCategory, number> = {
  images: 20 * 1024 * 1024,
  references: 50 * 1024 * 1024,
  bgm: 100 * 1024 * 1024,
  videos: 500 * 1024 * 1024,
  content: 10 * 1024 * 1024,
};

export function isAllowedContentType(category: StorageCategory, contentType: string): boolean {
  const patterns = ALLOWED_TYPES[category];
  if (!patterns) return false;
  return patterns.some((re) => re.test(contentType));
}

export function getMaxFileSize(category: StorageCategory): number {
  return MAX_FILE_SIZES[category];
}

export function generateR2Key(opts: {
  projectId: string;
  category: StorageCategory;
  fileName: string;
  contentId?: string;
}): string {
  const ext = opts.fileName.includes('.') ? opts.fileName.split('.').pop() : '';
  const timestamp = Date.now();
  const hash = Math.random().toString(36).slice(2, 8);
  const base = opts.contentId ? `${opts.contentId}-${timestamp}-${hash}` : `${timestamp}-${hash}`;
  return `${opts.projectId}/${opts.category}/${base}${ext ? `.${ext}` : ''}`;
}

export function extractKeyFromPublicUrl(url: string, publicUrlBase: string): string | null {
  if (!url.startsWith(publicUrlBase)) return null;
  return url.slice(publicUrlBase.length + 1); // +1 for the '/'
}

export function isValidProjectPrefix(prefix: string): boolean {
  // Must be non-empty, no spaces, ends with "/" — prevents root-level deletion
  return /^[^\s/]+\/$/.test(prefix);
}

export async function deleteObjectsByPrefix(prefix: string): Promise<number> {
  if (!isValidProjectPrefix(prefix)) {
    throw new Error(`유효하지 않은 prefix: "${prefix}"`);
  }

  const client = getR2Client();
  const bucket = getR2Bucket();
  let totalDeleted = 0;
  let continuationToken: string | undefined;

  do {
    const listResult = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
    );

    const keys = listResult.Contents?.map((obj) => obj.Key!).filter(Boolean) ?? [];
    if (keys.length === 0) break;

    // Delete in chunks of 1000
    for (let i = 0; i < keys.length; i += 1000) {
      const chunk = keys.slice(i, i + 1000);
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: chunk.map((Key) => ({ Key })) },
        })
      );
      totalDeleted += chunk.length;
    }

    continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
  } while (continuationToken);

  return totalDeleted;
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  const client = getR2Client();
  const bucket = getR2Bucket();

  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })) },
      })
    );
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd C:/projects/ContentFlow/contentflow && npm run test -- src/lib/__tests__/r2-storage.test.ts
```
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/r2-client.ts src/lib/r2-storage.ts src/lib/__tests__/r2-storage.test.ts
git commit -m "feat: add R2 client and storage helpers with validation"
```

---

## Task 3: Presign API Route

**Files:**
- Create: `src/app/api/storage/presign/route.ts`

- [ ] **Step 1: Create the presign route**

Create `src/app/api/storage/presign/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, getR2Bucket, getR2PublicUrl } from '@/lib/r2-client';
import { generateR2Key, isAllowedContentType, getMaxFileSize, type StorageCategory } from '@/lib/r2-storage';

const VALID_CATEGORIES: StorageCategory[] = ['images', 'references', 'bgm', 'videos', 'content'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, category, fileName, contentType, contentId } = body;

    // Validate required fields
    if (!projectId || !category || !fileName || !contentType) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다 (projectId, category, fileName, contentType)' },
        { status: 400 }
      );
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `유효하지 않은 카테고리: ${category}` },
        { status: 400 }
      );
    }

    // Validate projectId format (prefix-uuid pattern)
    if (!/^[a-zA-Z]+-[a-zA-Z0-9-]+$/.test(projectId)) {
      return NextResponse.json(
        { error: '유효하지 않은 프로젝트 ID 형식입니다.' },
        { status: 400 }
      );
    }

    // Validate content type
    if (!isAllowedContentType(category, contentType)) {
      return NextResponse.json(
        { error: `${category} 카테고리에서 허용되지 않는 파일 형식입니다: ${contentType}` },
        { status: 400 }
      );
    }

    const key = generateR2Key({ projectId, category, fileName, contentId });

    const client = getR2Client();
    const bucket = getR2Bucket();
    const publicUrl = getR2PublicUrl();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    return NextResponse.json({
      presignedUrl,
      publicUrl: `${publicUrl}/${key}`,
      key,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Presigned URL 생성 중 오류가 발생했습니다.';
    console.error('[storage/presign]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd C:/projects/ContentFlow/contentflow && npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/storage/presign/route.ts
git commit -m "feat: add presigned URL API route for R2 uploads"
```

---

## Task 4: Delete API Routes

**Files:**
- Create: `src/app/api/storage/delete/route.ts`
- Create: `src/app/api/storage/delete-prefix/route.ts`

- [ ] **Step 1: Create the delete route**

Create `src/app/api/storage/delete/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { deleteObjects } from '@/lib/r2-storage';

export async function DELETE(req: NextRequest) {
  try {
    const { keys } = await req.json();

    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: 'keys 배열이 필요합니다.' }, { status: 400 });
    }

    if (keys.length > 100) {
      return NextResponse.json({ error: '한 번에 최대 100개의 키만 삭제할 수 있습니다.' }, { status: 400 });
    }

    // Validate each key has a projectId prefix
    const invalidKeys = keys.filter((k: string) => !k.includes('/'));
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `유효하지 않은 키 형식: ${invalidKeys[0]}` },
        { status: 400 }
      );
    }

    await deleteObjects(keys);
    return NextResponse.json({ deleted: keys.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '파일 삭제 중 오류가 발생했습니다.';
    console.error('[storage/delete]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create the delete-prefix route**

Create `src/app/api/storage/delete-prefix/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { deleteObjectsByPrefix } from '@/lib/r2-storage';

export async function DELETE(req: NextRequest) {
  try {
    const { prefix } = await req.json();

    if (!prefix || typeof prefix !== 'string') {
      return NextResponse.json({ error: 'prefix가 필요합니다.' }, { status: 400 });
    }

    const deleted = await deleteObjectsByPrefix(prefix);
    return NextResponse.json({ deleted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '파일 삭제 중 오류가 발생했습니다.';
    console.error('[storage/delete-prefix]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify build passes**

```bash
cd C:/projects/ContentFlow/contentflow && npm run build
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/storage/delete/route.ts src/app/api/storage/delete-prefix/route.ts
git commit -m "feat: add R2 delete and delete-prefix API routes"
```

---

## Task 5: Client Upload Hook

**Files:**
- Create: `src/hooks/use-r2-upload.ts`
- Test: `src/hooks/__tests__/use-r2-upload.test.ts`

- [ ] **Step 1: Write tests for the upload hook**

Create `src/hooks/__tests__/use-r2-upload.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { base64ToBlob } from '@/hooks/use-r2-upload';

describe('base64ToBlob', () => {
  it('converts valid base64 data URL to Blob', () => {
    // 1x1 red pixel PNG
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const blob = base64ToBlob(dataUrl);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('converts raw base64 with mimeType', () => {
    const raw = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const blob = base64ToBlob(raw, 'image/png');
    expect(blob.type).toBe('image/png');
  });

  it('throws on invalid base64', () => {
    expect(() => base64ToBlob('not-base64-at-all!!!')).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/projects/ContentFlow/contentflow && npm run test -- src/hooks/__tests__/use-r2-upload.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create the upload hook**

Create `src/hooks/use-r2-upload.ts`:

```typescript
'use client';

import { useState, useCallback } from 'react';
import type { StorageCategory } from '@/lib/r2-storage';

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

export function useR2Upload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File | Blob, options: UploadOptions): Promise<UploadResult> => {
    setUploading(true);
    setError(null);

    // Client-side file size validation
    const MAX_SIZES: Record<StorageCategory, number> = {
      images: 20 * 1024 * 1024,
      references: 50 * 1024 * 1024,
      bgm: 100 * 1024 * 1024,
      videos: 500 * 1024 * 1024,
      content: 10 * 1024 * 1024,
    };
    const maxSize = MAX_SIZES[options.category];
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      const err = new Error(`파일 크기가 ${maxMB}MB 제한을 초과합니다.`);
      setError(err.message);
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/projects/ContentFlow/contentflow && npm run test -- src/hooks/__tests__/use-r2-upload.test.ts
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-r2-upload.ts src/hooks/__tests__/use-r2-upload.test.ts
git commit -m "feat: add R2 upload hook with base64 conversion"
```

---

## Task 6: Update Types — ReferenceFile & BgmFile

**Files:**
- Modify: `src/types/database.ts:25-40`

- [ ] **Step 1: Add url and r2_key to ReferenceFile**

In `src/types/database.ts`, update the `ReferenceFile` interface (lines 25-31):

```typescript
export interface ReferenceFile {
  id: string;
  name: string;
  size: number;
  type: string;
  added_at: string;
  url: string | null;
  r2_key: string | null;
}
```

- [ ] **Step 2: Add url and r2_key to BgmFile**

In `src/types/database.ts`, update the `BgmFile` interface (lines 33-40):

```typescript
export interface BgmFile {
  id: string;
  name: string;
  size: number;
  type: string;
  duration: number | null;
  added_at: string;
  url: string | null;
  r2_key: string | null;
}
```

- [ ] **Step 3: Verify build passes**

```bash
cd C:/projects/ContentFlow/contentflow && npm run build
```
Expected: Build succeeds. If any existing code relies on the exact shape, fix compilation errors by providing `url: null, r2_key: null` defaults.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add url and r2_key fields to ReferenceFile and BgmFile types"
```

---

## Task 7: Integrate R2 Upload into Image Generation

**Files:**
- Modify: `src/hooks/use-card-image-generation.ts:67-69`

This is the central point where ALL channel image generation results are stored. Currently line 68 creates a `data:` URL. We change it to upload to R2 and store the public URL instead.

- [ ] **Step 1: Update use-card-image-generation.ts**

In `src/hooks/use-card-image-generation.ts`, the `saveResult` call at line 68-69 currently does:

```typescript
const dataUrl = `data:${results[0].mimeType};base64,${results[0].base64}`;
cfg.saveResult(cardId, dataUrl, prompt);
```

Replace with R2 upload flow. The hook needs to accept `projectId` in its config and upload before saving.

Add `projectId` to `CardImageConfig` interface and update the generation logic:

```typescript
// At top of file, add import:
import { base64ToBlob } from './use-r2-upload';

// Add to CardImageConfig interface:
export interface CardImageConfig {
  // ... existing fields ...
  /** 프로젝트 ID (R2 업로드용) */
  projectId: string;
}
```

In `generateCardImage` callback, replace the result handling block (lines 67-69):

```typescript
if (results[0]) {
  const blob = base64ToBlob(results[0].base64, results[0].mimeType);
  try {
    const presignRes = await fetch('/api/storage/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: cfg.projectId,
        category: 'images',
        fileName: `${cardId}.${results[0].mimeType.split('/')[1] || 'png'}`,
        contentType: results[0].mimeType,
        contentId: cardId,
      }),
    });
    if (presignRes.ok) {
      const { presignedUrl, publicUrl } = await presignRes.json();
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': results[0].mimeType },
      });
      if (uploadRes.ok) {
        cfg.saveResult(cardId, publicUrl, prompt);
      } else {
        // R2 실패 시 base64 폴백
        const dataUrl = `data:${results[0].mimeType};base64,${results[0].base64}`;
        cfg.saveResult(cardId, dataUrl, prompt);
      }
    } else {
      const dataUrl = `data:${results[0].mimeType};base64,${results[0].base64}`;
      cfg.saveResult(cardId, dataUrl, prompt);
    }
  } catch {
    // 네트워크 오류 시 base64 폴백
    const dataUrl = `data:${results[0].mimeType};base64,${results[0].base64}`;
    cfg.saveResult(cardId, dataUrl, prompt);
  }
}
```

- [ ] **Step 2: Update all channel panels that use useCardImageGeneration to pass projectId**

Search for all usages of `useCardImageGeneration` and add `projectId` to their config. The panels that use it are:
- `src/components/content/blog-panel.tsx`
- `src/components/content/cardnews-panel.tsx`
- `src/components/content/threads-panel.tsx`
- `src/components/content/youtube-panel.tsx`

In each panel, find the `useCardImageGeneration({...})` call and add `projectId: project.id` to the config object.

- [ ] **Step 3: Verify build passes**

```bash
cd C:/projects/ContentFlow/contentflow && npm run build
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-card-image-generation.ts src/components/content/blog-panel.tsx src/components/content/cardnews-panel.tsx src/components/content/threads-panel.tsx src/components/content/youtube-panel.tsx
git commit -m "feat: upload AI-generated images to R2 instead of storing base64"
```

---

## Task 8: Integrate R2 Upload into Reference Files

**Files:**
- Modify: `src/components/project/reference-files-section.tsx`

- [ ] **Step 1: Update reference-files-section.tsx**

The `addFiles` callback (line 32-41) currently only stores metadata. Update it to upload each file to R2 and store the URL.

Replace the `addFiles` callback:

```typescript
const addFiles = useCallback(async (fileList: FileList) => {
  const newFiles: ReferenceFile[] = [];

  for (const f of Array.from(fileList)) {
    const id = generateId('ref');
    const fileEntry: ReferenceFile = {
      id,
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
      added_at: new Date().toISOString(),
      url: null,
      r2_key: null,
    };

    // Upload to R2
    try {
      const presignRes = await fetch('/api/storage/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          category: 'references',
          fileName: f.name,
          contentType: f.type || 'application/octet-stream',
          contentId: id,
        }),
      });

      if (presignRes.ok) {
        const { presignedUrl, publicUrl, key } = await presignRes.json();
        const uploadRes = await fetch(presignedUrl, {
          method: 'PUT',
          body: f,
          headers: { 'Content-Type': f.type || 'application/octet-stream' },
        });
        if (uploadRes.ok) {
          fileEntry.url = publicUrl;
          fileEntry.r2_key = key;
        }
      }
    } catch {
      // Upload failed — file metadata saved without URL
    }

    newFiles.push(fileEntry);
  }

  onUpdate({ reference_files: [...files, ...newFiles] });
}, [files, onUpdate, project.id]);
```

Also update the `removeFile` function to delete from R2:

```typescript
const removeFile = async (fileId: string) => {
  const file = files.find((f) => f.id === fileId);
  if (file?.r2_key) {
    try {
      await fetch('/api/storage/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: [file.r2_key] }),
      });
    } catch {
      // Deletion failure is non-blocking
    }
  }
  const updated = files.filter((f) => f.id !== fileId);
  onUpdate({ reference_files: updated.length > 0 ? updated : null });
};
```

- [ ] **Step 2: Verify build passes**

```bash
cd C:/projects/ContentFlow/contentflow && npm run build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/project/reference-files-section.tsx
git commit -m "feat: upload reference files to R2 with persistent URLs"
```

---

## Task 9: Integrate R2 Upload into BGM Files

**Files:**
- Modify: `src/components/project/bgm-section.tsx`

- [ ] **Step 1: Update bgm-section.tsx**

Replace the `addFiles` callback (lines 29-48) to upload to R2 and use R2 URLs for playback instead of blob URLs:

```typescript
const addFiles = useCallback(async (fileList: FileList) => {
  const audioFiles = Array.from(fileList).filter((f) =>
    f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f.name)
  );
  if (audioFiles.length === 0) return;

  const newFiles: BgmFile[] = [];

  for (const f of audioFiles) {
    const id = generateId('bgm');
    const fileEntry: BgmFile = {
      id,
      name: f.name,
      size: f.size,
      type: f.type || 'audio/mpeg',
      duration: null,
      added_at: new Date().toISOString(),
      url: null,
      r2_key: null,
    };

    try {
      const presignRes = await fetch('/api/storage/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          category: 'bgm',
          fileName: f.name,
          contentType: f.type || 'audio/mpeg',
          contentId: id,
        }),
      });

      if (presignRes.ok) {
        const { presignedUrl, publicUrl, key } = await presignRes.json();
        const uploadRes = await fetch(presignedUrl, {
          method: 'PUT',
          body: f,
          headers: { 'Content-Type': f.type || 'audio/mpeg' },
        });
        if (uploadRes.ok) {
          fileEntry.url = publicUrl;
          fileEntry.r2_key = key;
        }
      }
    } catch {
      // Upload failed
    }

    newFiles.push(fileEntry);
  }

  onUpdate({ bgm_files: [...files, ...newFiles] });
}, [files, onUpdate, project.id]);
```

Update `removeFile` to delete from R2 and remove blob URL references:

```typescript
const removeFile = async (fileId: string) => {
  if (playingId === fileId) {
    audioRef.current?.pause();
    setPlayingId(null);
  }
  const file = files.find((f) => f.id === fileId);
  if (file?.r2_key) {
    try {
      await fetch('/api/storage/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: [file.r2_key] }),
      });
    } catch {
      // Non-blocking
    }
  }
  const updated = files.filter((f) => f.id !== fileId);
  onUpdate({ bgm_files: updated.length > 0 ? updated : null });
};
```

Update `togglePlay` to use R2 URL instead of blob URL:

```typescript
const togglePlay = (fileId: string) => {
  if (playingId === fileId) {
    audioRef.current?.pause();
    setPlayingId(null);
    return;
  }
  const file = files.find((f) => f.id === fileId);
  if (!file?.url) return;

  if (audioRef.current) audioRef.current.pause();
  const audio = new Audio(file.url);
  audio.onended = () => setPlayingId(null);
  audio.play();
  audioRef.current = audio;
  setPlayingId(fileId);
};
```

Remove the `audioUrlsRef` entirely — no longer needed since we use R2 URLs.

- [ ] **Step 2: Verify build passes**

```bash
cd C:/projects/ContentFlow/contentflow && npm run build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/project/bgm-section.tsx
git commit -m "feat: upload BGM files to R2, persist across page refreshes"
```

---

## Task 10: Cascade Delete on Project/Content Deletion

**Files:**
- Modify: `src/stores/project-store.ts:367-392` (deleteProject)
- Modify: `src/stores/project-store.ts:462-480` (deleteContent)

- [ ] **Step 1: Add R2 cleanup to deleteProject**

In `src/stores/project-store.ts`, modify the `deleteProject` function (around line 367). After the `set()` call that removes local data, add an async R2 cleanup call:

```typescript
deleteProject: (projectId) => {
  // ... existing set() call removing local data stays the same ...

  // Async R2 cleanup (fire-and-forget)
  fetch('/api/storage/delete-prefix', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: `${projectId}/` }),
  }).catch(() => {
    // R2 cleanup failure is non-blocking
  });
},
```

- [ ] **Step 2: Add R2 cleanup to deleteContent**

Similarly for `deleteContent` (around line 462). After the `set()` call, we don't have a prefix for just one content's images. Instead, we collect the image URLs from the cards being deleted and extract keys:

```typescript
deleteContent: (contentId) => {
  // Collect R2 keys before deletion
  const state = get();
  const blogContentIds = state.blogContents.filter((bc) => bc.content_id === contentId).map((bc) => bc.id);
  const igContentIds = state.instagramContents.filter((ic) => ic.content_id === contentId).map((ic) => ic.id);
  const thContentIds = state.threadsContents.filter((tc) => tc.content_id === contentId).map((tc) => tc.id);
  const ytContentIds = state.youtubeContents.filter((yc) => yc.content_id === contentId).map((yc) => yc.id);

  // Collect image URLs from ALL channel cards about to be deleted
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
  const imageUrls: string[] = [];

  // Blog cards: images stored in content.image_url
  state.blogCards
    .filter((c) => blogContentIds.includes(c.blog_content_id))
    .forEach((c) => {
      const imgUrl = (c.content as Record<string, unknown>)?.image_url;
      if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) imageUrls.push(imgUrl);
    });

  state.instagramCards
    .filter((c) => igContentIds.includes(c.instagram_content_id))
    .forEach((c) => { if (c.background_image_url?.startsWith('http')) imageUrls.push(c.background_image_url); });

  // Threads cards: media_url field
  state.threadsCards
    .filter((c) => thContentIds.includes(c.threads_content_id))
    .forEach((c) => { if (c.media_url?.startsWith('http')) imageUrls.push(c.media_url); });

  state.youtubeCards
    .filter((c) => ytContentIds.includes(c.youtube_content_id))
    .forEach((c) => { if (c.image_url?.startsWith('http')) imageUrls.push(c.image_url); });

  // ... existing set() call stays the same ...

  // Async R2 cleanup
  if (imageUrls.length > 0 && r2PublicUrl) {
    const keys = imageUrls
      .filter((url) => url.startsWith(r2PublicUrl))
      .map((url) => url.slice(r2PublicUrl.length + 1));

    if (keys.length > 0) {
      fetch('/api/storage/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      }).catch(() => {});
    }
  }
},
```

**Note:** Add `NEXT_PUBLIC_R2_PUBLIC_URL` to `.env.local.example` so the client-side store can access it. This is the same value as `R2_PUBLIC_URL` but with the `NEXT_PUBLIC_` prefix for client access.

- [ ] **Step 3: Add NEXT_PUBLIC_R2_PUBLIC_URL to .env.local.example**

Append to `.env.local.example`:
```env
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-bucket.r2.dev
```

- [ ] **Step 4: Verify build passes**

```bash
cd C:/projects/ContentFlow/contentflow && npm run build
```
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/stores/project-store.ts .env.local.example
git commit -m "feat: cascade delete R2 files on project/content deletion"
```

---

## Task 11: Content JSON Sync to R2

**Files:**
- Create: `src/hooks/use-r2-content-sync.ts`
- Modify: integration point (where auto-save is called from the editor)

- [ ] **Step 1: Create the content sync hook**

Create `src/hooks/use-r2-content-sync.ts`:

```typescript
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
```

- [ ] **Step 2: Verify build passes**

```bash
cd C:/projects/ContentFlow/contentflow && npm run build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-r2-content-sync.ts
git commit -m "feat: add R2 content sync hook with debounced backup"
```

---

## Task 12: Final Build Verification + Run All Tests

- [ ] **Step 1: Run all tests**

```bash
cd C:/projects/ContentFlow/contentflow && npm run test
```
Expected: All tests pass.

- [ ] **Step 2: Run production build**

```bash
cd C:/projects/ContentFlow/contentflow && npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 3: Verify dev server starts and loads**

```bash
cd C:/projects/ContentFlow/contentflow && npm run dev
```
Navigate to `http://localhost:3000` — should load the dashboard without errors.

- [ ] **Step 4: Commit any remaining fixes**

If any fixes were needed during verification:
```bash
git add -A && git commit -m "fix: resolve build/test issues from R2 integration"
```
