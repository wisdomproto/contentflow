import { describe, it, expect } from 'vitest';
import { calculateNaverSeoScore } from '../seo-scorer';
import type { BlogCard } from '@/types/database';

function makeCard(text: string, type: string = 'text'): BlogCard {
  return {
    id: `card-${Math.random()}`,
    blog_content_id: 'test',
    section_type: type,
    content: { text },
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeImageCard(url: string, alt: string = ''): BlogCard {
  return {
    id: `card-${Math.random()}`,
    blog_content_id: 'test',
    section_type: 'image',
    content: { url, alt },
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe('calculateNaverSeoScore', () => {
  it('빈 콘텐츠 → 낮은 점수', () => {
    const result = calculateNaverSeoScore('', [], null);
    expect(result.score).toBeLessThan(10);
    expect(result.details).toHaveLength(9);
  });

  it('제목에 키워드 포함 시 제목 점수 증가', () => {
    const withKw = calculateNaverSeoScore('맛집 추천 베스트 10 완벽정리', [], {
      primary: '맛집 추천',
      secondary: [],
    });
    const withoutKw = calculateNaverSeoScore('오늘의 베스트 10 완벽정리해봄', [], {
      primary: '맛집 추천',
      secondary: [],
    });

    const titleWithKw = withKw.details.find((d) => d.category === 'title')!;
    const titleWithoutKw = withoutKw.details.find((d) => d.category === 'title')!;
    expect(titleWithKw.score).toBeGreaterThan(titleWithoutKw.score);
  });

  it('콘텐츠 길이 2000~3000자 → 만점(10)', () => {
    const longText = '가'.repeat(2500);
    const cards = [makeCard(longText)];
    const result = calculateNaverSeoScore('테스트 제목', cards, null);
    const lengthDetail = result.details.find((d) => d.category === 'content-length')!;
    expect(lengthDetail.score).toBe(10);
  });

  it('콘텐츠 800자 미만 → 낮은 길이 점수', () => {
    const shortText = '가'.repeat(500);
    const cards = [makeCard(shortText)];
    const result = calculateNaverSeoScore('테스트', cards, null);
    const lengthDetail = result.details.find((d) => d.category === 'content-length')!;
    expect(lengthDetail.score).toBeLessThanOrEqual(2);
  });

  it('이미지 6~13장 + ALT → 이미지 만점', () => {
    const cards = Array.from({ length: 8 }, (_, i) =>
      makeImageCard(`https://example.com/img${i}.jpg`, `이미지 설명 ${i}`)
    );
    const result = calculateNaverSeoScore('제목', cards, null);
    const imgDetail = result.details.find((d) => d.category === 'image')!;
    expect(imgDetail.score).toBe(10);
  });

  it('메타 정보 설정 시 점수 반영', () => {
    const result = calculateNaverSeoScore('SEO 최적화 제목', [], {
      primary: '키워드',
      secondary: ['보조1', '보조2'],
    });
    const metaDetail = result.details.find((d) => d.category === 'meta')!;
    expect(metaDetail.score).toBe(5); // 제목2 + 키워드2 + 보조1 = 5
  });

  it('총점 0~100 범위', () => {
    const result = calculateNaverSeoScore('테스트 제목', [makeCard('테스트 본문')], null);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
