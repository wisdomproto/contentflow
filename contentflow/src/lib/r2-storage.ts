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
  return url.slice(publicUrlBase.length + 1);
}

export function isValidProjectPrefix(prefix: string): boolean {
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
