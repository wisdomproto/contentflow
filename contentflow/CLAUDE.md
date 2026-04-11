# ContentFlow — SNS 마케팅 컨텐츠 플랫폼

## 프로젝트 개요
SNS 마케팅 콘텐츠를 AI로 생성하고 관리하는 웹 플랫폼. 하나의 기본 글(BaseArticle)에서 블로그/인스타/스레드/유튜브 채널별 콘텐츠를 파생 생성.

## 기술 스택
- **프레임워크**: Next.js 16 (App Router, Turbopack)
- **언어**: TypeScript (strict)
- **상태관리**: Zustand 5 + IndexedDB 영속화 (`idb-keyval`)
- **에디터**: TipTap (StarterKit + Image + Placeholder)
- **AI**: Google Gemini (`@google/genai` SDK, SSE 스트리밍 + 이미지 생성)
- **UI**: shadcn/ui + Tailwind CSS 4 + Lucide Icons
- **차트**: Recharts (GA4 대시보드)
- **분석**: @google-analytics/data (GA4 Data API)
- **DnD**: @dnd-kit (카드 정렬)
- **패키지 매니저**: npm

## 주요 명령어
```bash
npm run dev      # 개발 서버 (port 3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run test     # Vitest 테스트 실행
npm run test:watch  # Vitest 워치 모드
```

## 프로젝트 구조
```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/          # 메인 대시보드
│   └── api/
│       ├── ai/generate/              # 텍스트 AI 생성 (SSE 스트리밍)
│       ├── ai/generate-image/        # 이미지 AI 생성
│       ├── ai/extract-text/          # 파일 텍스트 추출 (PDF/DOCX → 서버사이드)
│       ├── ai/analyze-references/    # 참고 자료 AI 분석 (모델 선택 가능)
│       ├── ai/strategy/generate/     # 마케팅 전략 전체 생성 (SSE)
│       ├── ai/strategy/regenerate/   # 마케팅 전략 탭별 재생성 (SSE)
│       ├── ai/strategy/crawl/        # URL 크롤링 분석 (cheerio)
│       ├── ai/strategy/suggest-keywords/    # AI 키워드 추천
│       ├── ai/strategy/suggest-competitors/ # AI 경쟁사 탐색
│       ├── analytics/overview/        # GA4 종합 지표 (세션, 이탈률, 페이지뷰)
│       ├── analytics/traffic/        # GA4 트래픽 소스/채널
│       ├── analytics/top-pages/      # GA4 인기 페이지
│       ├── strategy/import-html/     # 외부 전략 HTML 파싱 → 키워드/카테고리/주제 추출
│       ├── naver/keywords/           # 네이버 키워드 검색
│       └── naver/keywords/trend/     # 네이버 DataLab 트렌드
├── components/
│   ├── content/            # 채널별 패널 (핵심)
│   │   ├── content-tabs.tsx           # 탭 네비게이션
│   │   ├── base-article-panel.tsx     # 기본글 에디터 (TipTap)
│   │   ├── blog-panel.tsx             # 블로그 (네이버) — Outer+Inner + 전략 키워드 배너
│   │   ├── blog-card-item.tsx         # 블로그 카드 컴포넌트
│   │   ├── blog-preview-dialog.tsx    # 블로그 미리보기
│   │   ├── cardnews-panel.tsx         # 카드뉴스 (인스타그램) — 캔버스 기반 에디터
│   │   ├── cardnews-card-item.tsx     # 카드뉴스 캔버스 (드래그 텍스트 블록 + 그리드 스냅)
│   │   ├── cardnews-templates.ts     # 카드뉴스 8종 템플릿 + 커스텀 템플릿
│   │   ├── threads-panel.tsx          # 스레드 — Outer+Inner 패턴
│   │   ├── threads-card-item.tsx      # 스레드 포스트 컴포넌트
│   │   ├── threads-preview-dialog.tsx # 스레드 미리보기
│   │   ├── youtube-panel.tsx          # 유튜브 — Outer+Inner 패턴
│   │   ├── youtube-card-item.tsx      # 유튜브 섹션 카드 컴포넌트
│   │   ├── youtube-preview-dialog.tsx # 유튜브 대본 미리보기
│   │   ├── channel-content-list.tsx   # 다중 콘텐츠 리스트 (접기/펼치기/삭제)
│   │   ├── channel-model-selector.tsx # AI 모델 드롭다운
│   │   ├── naver-keyword-panel.tsx    # 네이버 SEO 키워드
│   │   ├── image-style-selector.tsx   # 이미지 스타일 프리셋
│   │   ├── image-lightbox.tsx         # 이미지 확대 뷰
│   │   ├── image-card-widget.tsx     # 공통 이미지 카드 (확대/삭제/재생성/다운로드/업로드/히스토리)
│   │   ├── generation-button.tsx     # 공통 AI 생성 버튼 (스피너/진행률/중단)
│   │   ├── content-settings.tsx       # 설정 탭
│   │   ├── prompt-edit-dialog.tsx     # 프롬프트 미리보기/수정
│   │   └── topic-suggestion-dialog.tsx # AI 주제 추천
│   ├── strategy/            # AI 마케팅 전략
│   │   ├── strategy-dashboard.tsx     # 대시보드 래퍼 (입력폼/히어로/탭/콘텐츠)
│   │   ├── strategy-input-form.tsx    # 6필드 입력폼 + AI 키워드/경쟁사 추천
│   │   ├── strategy-hero.tsx          # 히어로 통계 배너
│   │   ├── strategy-tabs.tsx          # 5탭 네비게이션
│   │   ├── overview-tab.tsx           # ① 개요·경쟁사
│   │   ├── keyword-tab.tsx            # ② 키워드 분석
│   │   ├── keyword-table.tsx          # 키워드 테이블 (정렬/필터)
│   │   ├── channel-tab.tsx            # ③ 채널·퍼널 전략
│   │   ├── content-tab.tsx            # ④ 콘텐츠·주제
│   │   ├── topic-table.tsx            # 주제 목록 테이블 (필터)
│   │   ├── kpi-tab.tsx                # ⑤ KPI·액션플랜
│   │   └── strategy-import-dialog.tsx # 외부 전략 HTML 임포트 다이얼로그
│   ├── analytics/           # GA4 사이트 분석 대시보드
│   │   ├── analytics-dashboard.tsx    # 메인 대시보드 (7일/30일 토글)
│   │   ├── overview-cards.tsx         # 핵심 지표 카드 (세션/사용자/PV/이탈률)
│   │   ├── pageviews-chart.tsx        # 일별 페이지뷰 라인 차트 (Recharts)
│   │   ├── traffic-chart.tsx          # 트래픽 소스 바 차트
│   │   └── top-pages-table.tsx        # 인기 페이지 TOP 10
│   ├── report/              # 보고서
│   │   └── weekly-report-dialog.tsx   # 주간 보고서 생성/미리보기/다운로드
│   ├── editor/             # TipTap 에디터 + 툴바
│   ├── project/            # 프로젝트 설정 (브랜드, 마케터, API키, 퍼널·분석 등)
│   ├── sidebar/            # 프로젝트 트리 사이드바 (전략/분석/보고서 고정 항목)
│   ├── layout/             # 헤더
│   └── ui/                 # shadcn/ui 컴포넌트
├── stores/
│   └── project-store.ts    # Zustand 메인 스토어 (IndexedDB 영속화, Strategy CRUD 포함)
├── hooks/
│   ├── use-ai-generation.ts         # SSE 텍스트 스트리밍
│   ├── use-strategy-generation.ts   # 전략 생성 SSE 스트리밍 (멀티탭)
│   ├── use-image-generation.ts      # 배치 이미지 생성 + progress
│   ├── use-analytics.ts             # GA4 데이터 fetching 훅
│   ├── use-auto-save.ts             # 디바운스 자동저장
│   └── use-hydration.ts             # SSR 하이드레이션 가드
├── lib/
│   ├── ai-models.ts                 # AI 모델 상수 (텍스트/이미지/TTS 모델 중앙 관리)
│   ├── prompt-builder.ts            # 채널별 프롬프트 빌더
│   ├── strategy-prompt-builder.ts   # 전략 5탭 프롬프트 빌더
│   ├── strategy-html-parser.ts      # 외부 전략 HTML → 키워드/카테고리/주제 추출
│   ├── weekly-report-builder.ts     # 주간 보고서 HTML 생성
│   ├── seo-scorer.ts                # 네이버 SEO 점수 계산
│   ├── utils.ts                     # generateId, countWords, cn
│   └── ai/                          # 이미지 생성 서비스 (Strategy Pattern)
├── test/
│   └── setup.ts            # Vitest 테스트 셋업 (@testing-library/jest-dom)
├── types/
│   ├── database.ts         # 전체 TypeScript 인터페이스 (ProjectApiKeys 포함)
│   └── strategy.ts         # 마케팅 전략 타입 (27개 인터페이스)
└── data/
    └── mock-data.ts        # (빈 파일 — Zustand 직접 관리)
```

## 데이터 모델 (3-tier, 1:N 관계)
```
Project (프로젝트 설정 + API 키 + 퍼널 + GA4)
 ├── funnel_config (메인 퍼널/웹사이트 URL + 전환 목표)
 ├── ga4_config (GA4 서비스 계정 인증)
 ├── imported_strategy (외부 전략 HTML에서 추출된 키워드/카테고리/주제)
 ├── MarketingStrategy (1:1, AI 마케팅 전략)
 │    ├── input: StrategyInput
 │    ├── overview / keywords / channelStrategy / contentStrategy / kpiAction
 │    └── generationStatus (탭별 생성 상태)
 └── Content (콘텐츠 메타데이터)
      ├── BaseArticle (기본 글 본문, 1:1)
      ├── BlogContent[] (1:N) → BlogCard[]
      ├── InstagramContent[] (1:N) → InstagramCard[]
      ├── ThreadsContent[] (1:N) → ThreadsCard[]
      └── YoutubeContent[] (1:N) → YoutubeCard[]
```

### 핵심 관계
- **Content → ChannelContent = 1:N**: 하나의 Content에서 블로그 글 여러 개, 카드뉴스 여러 개 생성 가능
- **ChannelContent → Card = 1:N**: 각 채널 콘텐츠는 여러 카드(섹션/슬라이드/포스트)로 구성
- **삭제 시 Cascade**: Project 삭제 → Content → BaseArticle + 모든 채널 콘텐츠 + 카드 전부 삭제

## 채널 구현 상태
- [x] 기본글 (BaseArticle) — TipTap 에디터, AI 주제 추천, 글 생성
- [x] 블로그 (네이버) — SEO 설정, 카드 에디터, AI 생성, 이미지 생성, 미리보기, 전략 키워드 배너
- [x] 카드뉴스 (인스타그램) — 4:5 고정 캔버스, PPT스타일 드래그 텍스트 블록 (헤더/제목/본문/푸터), 10% 그리드 스냅, 이미지 위아래 드래그, 블록별 폰트/색상/그림자/보이기, 8종+커스텀 템플릿, 템플릿 속성 편집, 이미지 붙여넣기/드래그앤드롭/업로드/다운로드, 배치 이미지 생성(탭전환 유지), AI 4-zone 텍스트 생성
- [x] 스레드 — 멀티포스트, AI 생성, 이미지 생성, 미리보기, 전체 복사
- [x] 유튜브 — Vrew 스타일 3단 UI (프리뷰+스크립트 편집+타임라인), 씬별 이미지 생성, 대본 생성, 미리보기, 전체 복사

## AI 마케팅 전략
프로젝트별 통합 마케팅 전략 수립 기능. 사이드바에서 프로젝트 아래 "마케팅 전략" 고정 항목으로 접근.

### 입력
- 타겟 URL (AI 크롤링 분석) + 비즈니스 정보 + 키워드 시드 + 경쟁사 + 예산/인력
- AI 키워드 추천 (업종+URL 기반 15~20개 자동 추천)
- AI 경쟁사 탐색 (업종 기반 5~8개 자동 발견)
- 기존 프로젝트 설정 자동 연동

### 5탭 대시보드
1. **개요·경쟁사** — 비즈니스 요약, 차별화 카드, 문제점/기회, 경쟁사 분석
2. **키워드 분석** — 네이버 API 실데이터 + AI 황금키워드 추천 + 인사이트
3. **채널·퍼널** — 유입 퍼널, 채널별 전략, 주간 스케줄, 역할 분배
4. **콘텐츠·주제** — 카테고리 순환, 50~100개 주제 자동 생성, "콘텐츠 만들기" 연동
5. **KPI·액션** — 채널별 KPI, 우선순위 액션플랜, 예산 배분

### 생성 방식
- 전체 생성 (5탭 순차 SSE) + 탭별 재생성 (수정 지시 입력)
- 네이버 API → URL 크롤링 → AI 순차 생성

### 외부 전략 임포트
- 사이드바 "마케팅 전략" 옆 Upload 아이콘으로 HTML 전략 파일 임포트
- cheerio로 파싱 → 키워드 DB, 카테고리 (A~E 순환), 주제 목록 추출
- `imported_strategy`로 프로젝트에 저장
- 새 콘텐츠 생성 시 카테고리/주제 드롭다운으로 자동 추천
- 블로그 패널에서 임포트된 황금키워드를 기존 전략 키워드와 병합 표시

## 퍼널 · GA4 분석 · 주간 보고서

### 메인 퍼널 설정
- 프로젝트 설정 > 퍼널·분석 탭에서 웹사이트 URL, 전환 목표, 퍼널 단계 등록
- 모든 마케팅 채널의 최종 착지점 관리

### GA4 사이트 분석 대시보드
- 프로젝트 설정에서 GA4 서비스 계정 인증 (Property ID + 이메일 + 비공개 키)
- 사이드바 "사이트 분석" 클릭 → 대시보드 표시
- 7일/30일 기간 토글, 새로고침 버튼
- 4개 핵심 지표 카드 (세션/사용자/PV/이탈률)
- 일별 페이지뷰 라인 차트 + 트래픽 소스 바 차트 (Recharts)
- 인기 페이지 TOP 10 테이블

### 주간 보고서
- 사이드바 "주간 보고서" 클릭 → 다이얼로그
- GA4 데이터(7일) + 콘텐츠 발행 현황 + 키워드 현황 결합
- HTML 보고서 생성 → iframe 미리보기 + 다운로드

## Outer+Inner 패널 패턴
모든 채널 패널은 동일한 구조:
```
ChannelPanel (Outer)
 ├── 제목 + 모델 선택기 (텍스트/이미지 모델 + 비율 + 스타일)
 └── ChannelContentList<T>  ← 제네릭 리스트 (접기/펼치기/삭제/추가)
      └── ChannelPanelInner  ← 개별 콘텐츠 편집 (AI 생성, 카드 리스트 등)
```

### 유튜브 패널 — Vrew 스타일 3단 레이아웃
```
┌────────────────────────────────────────────┐
│ [영상설정 접이식] 제목/시간/태그            │
│ [액션바] AI대본 | 전체이미지 | 미리보기 | 복사│
├──────────────────┬─────────────────────────┤
│ [프리뷰] 60%      │ [스크립트 편집] 40%      │
│ 선택된 씬 이미지   │ section_type 드롭다운    │
│ ◀ prev | N | ▶    │ narration/direction/etc │
├──────────────────┴─────────────────────────┤
│ [타임라인] 가로 스크롤 썸네일 카드           │
└────────────────────────────────────────────┘
```

## AI 생성 플로우

### 텍스트 생성
1. 프롬프트 빌더 (`src/lib/prompt-builder.ts`)로 컨텍스트 조합
2. PromptEditDialog에서 사용자 확인/수정
3. `/api/ai/generate` → Gemini SSE 스트리밍
4. `useAiGeneration` 훅으로 청크 수신 → JSON 파싱 → 카드 생성

### 이미지 생성
- **블로그**: 카드별 개별 생성 또는 전체 배치 생성 (기본 16:9)
- **카드뉴스**: 2단계 — 텍스트 AI가 프롬프트 JSON 생성 → 이미지 AI가 순차 생성 (기본 1:1)
- **스레드**: 포스트별 개별 이미지 생성 (기본 1:1)
- **유튜브**: 씬별 개별 생성 또는 전체 배치 생성 (기본 16:9, Vrew 프리뷰 연동)

### 채널별 이미지 설정
- 각 채널 패널 헤더에서 비율(1:1, 4:5, 9:16, 16:9, 3:4, 4:3) + 스타일(18종 프리셋) 선택
- `project.ai_model_settings.channels.{channel}.aspectRatio/imageStyle` 에 저장

### 채널별 모델 선택
- 각 채널 패널 헤더에 텍스트/이미지 모델 드롭다운
- `project.ai_model_settings.channels.{channel}` 에 저장
- 기본: gemini-3-flash-preview (텍스트), gemini-3.1-flash-image-preview (이미지)

## 스토어 구조 (Zustand + IndexedDB)

### 영속화
- `idb-keyval` 어댑터로 IndexedDB에 저장 (localStorage 5MB 제한 해결)
- `partialize`로 선택적 영속화 (UI 상태 제외)

### CRUD 패턴
- **Project/Content**: 표준 CRUD (create, update, delete)
- **BaseArticle**: createOrUpdate (1:1 관계이므로 upsert)
- **채널 콘텐츠**: add/update/delete/getPlural (1:N 관계)
- **카드**: add/update/delete/reorder + setForContent (벌크 교체)
- **Strategy**: createOrUpdate/updateTab/updateStatus/delete (1:1, cascade delete)

## 개발 컨벤션
- 한국어 UI, 코드 주석은 필요시 한국어
- IndexedDB 기반 (Supabase DB 연동 예정이나 현재 미구현)
- 채널 추가 시: 타입 정의 → Store 확장 → 프롬프트 빌더 → 카드 컴포넌트 → Inner 패널 → Outer 패널 → 탭 연동
- blog-panel.tsx가 채널 구현의 레퍼런스 패턴
- launch.json 서버명: `contentflow-dev`
- 빌드 검증 후 프리뷰 확인까지 진행

## 환경변수
- `GEMINI_API_KEY`: Gemini API 키 (.env.local)
- `NAVER_DATALAB_CLIENT_ID`: 네이버 DataLab Client ID (선택)
- `NAVER_DATALAB_CLIENT_SECRET`: 네이버 DataLab Client Secret (선택)
- 네이버 검색광고 / Instagram / Threads / YouTube / Perplexity 키: 프로젝트 설정 > API 키 탭에서 관리
- GA4 서비스 계정 인증: 프로젝트 설정 > 퍼널·분석 탭에서 관리 (Property ID + 이메일 + 비공개 키)

## 미구현/스텁 목록
- `/api/ai/factcheck`, `/api/ai/tts` — 스텁 라우트
- `/api/publish/*` — Instagram, Threads, YouTube 발행 API
- `src/app/(auth)/` — 로그인/회원가입 (라우트만 존재)
- `src/lib/gemini/`, `src/lib/naver/`, `src/lib/perplexity/` — 빈 디렉토리
- `src/components/cards/`, `src/components/media/`, `src/components/preview/` — 빈 디렉토리

## 영상 파이프라인 로드맵 (Phase 11)
이미지→영상(Grok/Veo) → TTS(ElevenLabs/Gemini) → 자막 싱크 → ffmpeg 합성
- 현재: 씬별 이미지 생성 완료 (Vrew 스타일 UI), 이미지/영상 프롬프트 분리
- `buildYoutubeImagePrompt`: 정지 이미지용 (subtitle_text + section_type 분위기)
- `buildYoutubeVideoPrompt`: 영상 생성용 (screen_direction + narration + 모션 힌트)
- YoutubeCard.video_prompt 필드 추가, 대본 생성 시 이미지/영상 프롬프트 자동 생성
- 다음: 이미지→영상 API 연동, TTS API 연동, 자막 타임스탬프 매핑, 영상 합성
