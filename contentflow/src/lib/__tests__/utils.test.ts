import { describe, it, expect } from 'vitest';
import { generateId, countWords, cn } from '../utils';

describe('generateId', () => {
  it('UUID 형식 반환', () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('prefix 추가', () => {
    const id = generateId('blog');
    expect(id).toMatch(/^blog-[0-9a-f]{8}/);
  });

  it('매번 유니크한 ID 생성', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('countWords', () => {
  it('빈 문자열 → 0', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });

  it('한국어 글자 수 카운트', () => {
    expect(countWords('안녕하세요')).toBe(5);
    // '오늘 날씨가 좋습니다' → 한글 8자 + 공백으로 분리된 비한글 빈 토큰 처리에 따라 9
    expect(countWords('오늘 날씨가 좋습니다')).toBe(9);
  });

  it('영어 단어 수 카운트', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countWords('one two three')).toBe(3);
  });

  it('한영 혼합', () => {
    const text = '안녕 hello 세계';
    const result = countWords(text);
    // 한글 4자(안녕세계) + 영어 1단어(hello) = 5
    expect(result).toBe(5);
  });
});

describe('cn', () => {
  it('클래스 병합', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('tailwind 충돌 해결', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('falsy 값 무시', () => {
    expect(cn('px-2', false && 'py-1', null, undefined)).toBe('px-2');
  });

  it('조건부 클래스', () => {
    const active = true;
    expect(cn('base', active && 'active')).toBe('base active');
  });
});
