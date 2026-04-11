# Naver Keyword Search + SEO Optimization — Design Spec

## Overview

네이버 검색광고 API로 키워드 검색량/경쟁강도를 조회하고, 최신 2025-2026 기준으로 SEO 스코어러를 개선하며, AI 블로그 생성 시 SEO 100점에 가깝게 자동 생성한다.

## Changes

### 1. Naver Keyword Search API Integration

**New: `src/app/api/naver/keywords/route.ts`**
- Next.js API Route (POST)
- 요청: `{ keywords: string[], apiKey, secretKey, customerId }`
- 네이버 검색광고 API `GET /keywordstool?hintKeywords={keywords}&showDetail=1` 호출
- HMAC-SHA256 서명 생성 (timestamp.method.uri)
- 헤더: X-Timestamp, X-API-KEY, X-Customer, X-Signature
- 반환: 키워드별 월간 PC/모바일 검색량, 경쟁강도, 클릭수, CTR

**New: `src/components/content/naver-keyword-panel.tsx`**
- 블로그 패널 SEO 섹션 내부에 배치
- 키워드 입력 → 검색 버튼 → 결과 테이블
- 테이블 컬럼: 키워드, PC검색량, 모바일검색량, 총검색량, 경쟁강도, 클릭수
- 연관 키워드 클릭 시 주요/보조 키워드로 바로 추가
- API 키: `.env.local`에서 기본값 로드

### 2. SEO Scorer Update (2025-2026 Latest)

**Modify: `src/lib/seo-scorer.ts`**

| 항목 | 배점 | 기준 |
|------|------|------|
| 제목 최적화 | 15점 | 키워드 포함, 15~25자, 키워드 앞쪽 배치 |
| 본문 키워드 밀도 | 15점 | 1~2% 자연 분포, 2000자 기준 5~6회, 동의어 포함 |
| 콘텐츠 길이 | 10점 | 2,000~3,000자 권장 (공백 제외) |
| 구조화 | 15점 | 소제목(H2/H3) 3개 이상, 단락당 300~500자, 리스트 |
| 이미지 최적화 | 10점 | 6~13장, ALT 텍스트, 다양한 이미지 |
| 첫 문단 임팩트 | 10점 | 첫 150자에 핵심 키워드 + 요점 (DIA+ 기준) |
| 검색 의도 매칭 | 10점 | 제목-본문 의미 일관성, 질문에 대한 답변 |
| 모바일 가독성 | 10점 | 문장 60자 이내, 짧은 단락 |
| 메타 정보 | 5점 | 태그 설정, 카테고리 일치 |

### 3. SEO-Optimized Blog Prompt

**Modify: `src/lib/prompt-builder.ts` (`buildBlogPrompt`)**

AI 생성 프롬프트에 SEO 지침 추가:
- 제목 15~25자 + 키워드 앞쪽 배치
- 본문 2,000~3,000자
- 소제목(H2/H3) 3개 이상
- 키워드 자연 반복 5~6회 (1~2%)
- 첫 문단에 핵심 키워드 + 요점
- 이미지 삽입 위치 6곳 이상 표시 (alt 텍스트 포함)
- 단락당 300~500자

## Out of Scope

- 네이버 블로그 자동 업로드
- Perplexity 팩트체크
- GA4/Meta Pixel 연동
