// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { base64ToBlob } from '../use-r2-upload';

describe('base64ToBlob', () => {
  it('converts valid base64 data URL to Blob', () => {
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
