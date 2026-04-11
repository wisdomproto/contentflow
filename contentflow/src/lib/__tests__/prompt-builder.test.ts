import { describe, it, expect } from 'vitest';
import {
  buildBlogPrompt,
  buildCardNewsPrompt,
  buildThreadsPrompt,
  buildTopicSuggestionPrompt,
  buildBaseArticlePrompt,
} from '../prompt-builder';
import type { Project, Content, BaseArticle } from '@/types/database';

const mockProject: Project = {
  id: 'proj-1',
  name: '테스트 프로젝트',
  brand_name: '테스트브랜드',
  brand_description: '테스트 브랜드 설명',
  industry: 'IT',
  usp: '혁신적 기술',
  brand_tone: '전문적이면서 친근한',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockContent: Content = {
  id: 'content-1',
  project_id: 'proj-1',
  title: '테스트 콘텐츠',
  category: 'IT/테크',
  tags: ['기술', 'AI'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockBaseArticle: BaseArticle = {
  id: 'ba-1',
  content_id: 'content-1',
  body: '<p>테스트 기본 글 내용입니다.</p>',
  body_plain_text: '테스트 기본 글 내용입니다.',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('buildTopicSuggestionPrompt', () => {
  it('JSON 형식 지시 포함', () => {
    const prompt = buildTopicSuggestionPrompt({
      project: mockProject,
      content: mockContent,
    });
    expect(prompt).toContain('JSON');
    expect(prompt).toContain('title');
    expect(prompt).toContain('outline');
  });

  it('브랜드 정보 포함', () => {
    const prompt = buildTopicSuggestionPrompt({
      project: mockProject,
      content: mockContent,
    });
    expect(prompt).toContain('테스트브랜드');
  });

  it('topicHint 반영', () => {
    const prompt = buildTopicSuggestionPrompt({
      project: mockProject,
      content: mockContent,
      topicHint: 'AI 트렌드',
    });
    expect(prompt).toContain('AI 트렌드');
  });
});

describe('buildBaseArticlePrompt', () => {
  it('HTML 형식 지시 포함', () => {
    const prompt = buildBaseArticlePrompt({
      project: mockProject,
      content: mockContent,
    });
    expect(prompt).toContain('HTML');
  });

  it('콘텐츠 제목 포함', () => {
    const prompt = buildBaseArticlePrompt({
      project: mockProject,
      content: mockContent,
    });
    expect(prompt).toContain('테스트 콘텐츠');
  });
});

describe('buildBlogPrompt', () => {
  it('SEO 규칙 포함', () => {
    const prompt = buildBlogPrompt({
      project: mockProject,
      content: mockContent,
      baseArticle: mockBaseArticle,
    });
    expect(prompt).toContain('SEO');
    expect(prompt).toContain('네이버');
  });

  it('키워드 설정 반영', () => {
    const prompt = buildBlogPrompt({
      project: mockProject,
      content: mockContent,
      baseArticle: mockBaseArticle,
      seoTitle: '맛집 추천 가이드',
      keywords: { primary: '맛집', secondary: ['서울 맛집', '강남 맛집'] },
    });
    expect(prompt).toContain('맛집');
    expect(prompt).toContain('서울 맛집');
    expect(prompt).toContain('강남 맛집');
  });

  it('기본 글 본문 포함', () => {
    const prompt = buildBlogPrompt({
      project: mockProject,
      content: mockContent,
      baseArticle: mockBaseArticle,
    });
    expect(prompt).toContain('테스트 기본 글 내용입니다.');
  });
});

describe('buildCardNewsPrompt', () => {
  it('인스타그램 관련 지시 포함', () => {
    const prompt = buildCardNewsPrompt({
      project: mockProject,
      content: mockContent,
      baseArticle: mockBaseArticle,
    });
    expect(prompt).toContain('인스타그램');
    expect(prompt).toContain('슬라이드');
  });
});

describe('buildThreadsPrompt', () => {
  it('스레드 관련 지시 포함', () => {
    const prompt = buildThreadsPrompt({
      project: mockProject,
      content: mockContent,
      baseArticle: mockBaseArticle,
    });
    expect(prompt).toContain('Threads');
    expect(prompt).toContain('포스트');
  });

  it('기본 글 내용 포함', () => {
    const prompt = buildThreadsPrompt({
      project: mockProject,
      content: mockContent,
      baseArticle: mockBaseArticle,
    });
    expect(prompt).toContain('테스트 기본 글 내용입니다.');
  });
});
