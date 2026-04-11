# ContentFlow PRD — v0.1 개발 현황 및 로드맵

## 제품 비전
하나의 글(BaseArticle)에서 블로그, 인스타그램 카드뉴스, 스레드, 유튜브까지 — AI가 채널별 최적 콘텐츠를 자동 생성하는 SNS 마케팅 플랫폼.

---

## Phase 1: 기반 구조 ✅ 완료
- [x] Next.js 16 프로젝트 설정 (App Router, TypeScript strict, Turbopack)
- [x] 데이터 모델 정의 (`types/database.ts` — 전체 타입 인터페이스)
- [x] Zustand 스토어 + IndexedDB 영속화 (idb-keyval 어댑터)
- [x] 프로젝트/콘텐츠 CRUD
- [x] 사이드바 프로젝트 트리
- [x] 프로젝트 설정 (브랜드 정보, 마케터 페르소나, 채널 프롬프트, 글쓰기 가이드, API 키)
- [x] shadcn/ui 컴포넌트 라이브러리 세팅
- [x] 다크 모드 (next-themes)

## Phase 2: 기본글 + AI 생성 ✅ 완료
- [x] TipTap 에디터 (WYSIWYG + 이미지 삽입)
- [x] AI 주제 추천 (5개 옵션 + 아웃라인)
- [x] AI 글 생성 (SSE 스트리밍 + Gemini)
- [x] 부분 재생성 (선택 텍스트만 재작성)
- [x] 프롬프트 미리보기/수정 다이얼로그
- [x] 워드카운트 뱃지
- [x] 자동저장 (useAutoSave, 디바운스 1초)

## Phase 3: 블로그 채널 (네이버) ✅ 완료
- [x] BlogContent/BlogCard 스토어 CRUD
- [x] 블로그 프롬프트 빌더 (SEO 규칙 내장)
- [x] SEO 설정: 타이틀, 주요 키워드, 보조 키워드
- [x] 네이버 키워드 API 연동
- [x] SEO 점수 계산 (제목/키워드 배치/콘텐츠 길이/구조/이미지/모바일)
- [x] 블로그 카드 에디터 (text/image/divider/quote/list)
- [x] 카드별 이미지 생성 + 전체 배치 이미지 생성
- [x] 블로그 미리보기 다이얼로그
- [x] 카드 드래그 정렬 (@dnd-kit)

## Phase 4: 카드뉴스 채널 (인스타그램) ✅ 완료
- [x] InstagramContent/InstagramCard 스토어 CRUD
- [x] 2단계 AI 생성: 텍스트 AI → 이미지 프롬프트 JSON → 이미지 AI 순차 생성
- [x] 캡션 + 해시태그 관리
- [x] 슬라이드 그리드 에디터 (배경색, 텍스트 오버레이, 폰트 설정)
- [x] 이미지 스타일 프리셋 선택기
- [x] 참조 이미지 (드래그&드롭, 패널 레벨 공유)
- [x] 전체 이미지 다운로드 (순차 300ms 딜레이)
- [x] 이미지 라이트박스

## Phase 5: 스레드 채널 ✅ 완료
- [x] ThreadsContent/ThreadsCard 스토어 CRUD
- [x] 스레드 프롬프트 빌더 (hook → content → CTA, 3~8 포스트)
- [x] 포스트별 텍스트 에디터
- [x] 포스트별 이미지 생성
- [x] 스레드 미리보기 다이얼로그
- [x] 전체 복사 (클립보드)

## Phase 6: 다중 콘텐츠 구조 ✅ 완료
- [x] Content → ChannelContent 관계 1:1 → 1:N 전환
- [x] ChannelContentList 제네릭 컴포넌트 (접기/펼치기/삭제/추가/인라인 제목 편집)
- [x] 모든 채널 패널 Outer+Inner 패턴 리팩토링
- [x] 채널별 모델 선택기 (패널 레벨 공유)

## Phase 7.8: AI 마케팅 전략 ✅ 완료
- [x] MarketingStrategy 타입 정의 (27개 인터페이스)
- [x] Zustand Store 확장 (Strategy CRUD + cascade delete + IndexedDB 영속화)
- [x] URL 크롤링 API (cheerio, 최대 5개 URL, 10초 타임아웃)
- [x] 네이버 DataLab 트렌드 API (12개월 검색 추이)
- [x] 전략 프롬프트 빌더 (5탭 × JSON 구조 요청)
- [x] 전략 생성/재생성 SSE API (Gemini, 탭별 순차 생성)
- [x] 전략 생성 훅 (useStrategyGeneration, 멀티탭 SSE)
- [x] 입력 폼 (6필드 + 프로젝트 설정 자동 채움)
- [x] AI 키워드 추천 (업종+URL 기반 15~20개)
- [x] AI 경쟁사 자동 탐색 (업종 기반 5~8개)
- [x] 5탭 대시보드 UI (개요·경쟁사 / 키워드 / 채널·퍼널 / 콘텐츠·주제 / KPI·액션)
- [x] 사이드바 프로젝트별 "마케팅 전략" 고정 항목
- [x] 블로그 패널 황금 키워드 배너 연동
- [x] 프로젝트 설정 API 키 탭 (네이버/DataLab/인스타/스레드/유튜브/Perplexity + 도움말 툴팁)

---

## 다음 단계 (미구현)

### Phase 7: 유튜브 채널 ✅ 완료
- [x] YoutubeContent/YoutubeCard 스토어 CRUD
- [x] 유튜브 대본 프롬프트 빌더 (나레이션 + 화면 디렉션)
- [x] 유튜브 패널 (Outer+Inner 패턴)
- [x] 대본 미리보기 + 전체 복사
- [x] Vrew 스타일 3단 레이아웃 리디자인 (프리뷰 + 스크립트 편집 + 타임라인)
- [x] 씬별 이미지 생성 (개별 + 전체 배치)
- [x] 타임라인 썸네일 카드 (섹션 타입 뱃지, 예상 시간)
- [ ] 썸네일 생성

### Phase 7.5: UX 개선 + 테스트 인프라 ✅ 완료
- [x] Vitest + @testing-library/react 설정
- [x] 유틸리티 테스트 (generateId, countWords, cn)
- [x] SEO 점수 계산 테스트
- [x] 프롬프트 빌더 테스트
- [x] React ErrorBoundary 컴포넌트
- [x] shadcn/ui Skeleton 컴포넌트
- [x] 대시보드 로딩 스켈레톤 (loading.tsx)
- [x] 대시보드 에러 페이지 (error.tsx)
- [x] 채널 패널 ErrorBoundary 래핑

### Phase 8: 발행(Publish) 연동
- [ ] 네이버 블로그 API 연동
- [ ] Instagram Graph API 연동
- [ ] Threads API 연동
- [ ] YouTube Data API 연동
- [ ] 발행 상태 관리 + 이력

### Phase 9: 인증 + DB
- [ ] Supabase Auth (로그인/회원가입)
- [ ] Supabase PostgreSQL 마이그레이션 (현재 IndexedDB → 서버 DB)
- [ ] 멀티유저 지원
- [ ] Row Level Security

### Phase 10: 고급 기능
- [ ] 팩트체크 API 연동
- [ ] Perplexity 리서치 연동
- [ ] 분석 대시보드 (조회수, 인게이지먼트)
- [x] 에러 바운더리 + 로딩 스켈레톤 (Phase 7.5에서 완료)
- [x] 테스트 코드 — Vitest + RTL (Phase 7.5에서 완료)
- [x] 채널별 이미지 설정 (비율 + 스타일 프리셋)
- [x] 채널별 기본 글쓰기 가이드

### Phase 11: 영상 파이프라인 (유튜브)
영상 제작 워크플로우: 씬 이미지 → 영상 클립 → TTS → 자막 싱크 → 합성

- [ ] **11-A: 이미지→영상 변환** — Grok/Veo API 연동, 씬별 5~15초 클립 생성
- [ ] **11-B: TTS 생성** — ElevenLabs API + Gemini TTS (선택 가능), 나레이션 텍스트 → 음성 파일
- [ ] **11-C: 자막 싱크** — TTS 오디오 기반 타임스탬프 추출, 나레이션↔자막 매핑
- [ ] **11-D: 영상 합성** — 클립 + TTS + 자막 + BGM 합성 (ffmpeg.wasm 또는 서버사이드 ffmpeg)
- [ ] **11-E: 프리뷰 플레이어** — 웹 기반 프리뷰 재생, 타임라인 스크러빙

---

## 채널 추가 패턴 (개발 가이드)
새 채널 추가 시 아래 순서로 진행:

1. **타입 정의** (`types/database.ts`): XxxContent + XxxCard 인터페이스
2. **스토어 확장** (`stores/project-store.ts`): 상태 + CRUD 메서드 + cascade 삭제 + partialize
3. **프롬프트 빌더** (`lib/prompt-builder.ts`): buildXxxPrompt 함수
4. **카드 컴포넌트** (`components/content/xxx-card-item.tsx`): 개별 카드 에디터
5. **Inner 패널**: 개별 콘텐츠의 AI 생성/카드 리스트/미리보기
6. **Outer 패널**: ChannelContentList 래핑 + 모델 선택기
7. **탭 연동** (`content-tabs.tsx`): 탭 추가

**레퍼런스**: `blog-panel.tsx` (가장 기능이 풍부한 채널)
