// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { generateR2Key, isAllowedContentType, getMaxFileSize, extractKeyFromPublicUrl } from '../r2-storage';

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
