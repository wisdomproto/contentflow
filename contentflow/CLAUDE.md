# ContentFlow — AI 마케팅 자동화 플랫폼

## 개요
다국어 마케팅 콘텐츠를 AI로 생성·발행·분석하는 올인원 플랫폼.
키워드 분석 → 콘텐츠 생성(7채널) → 멀티채널 발행 → 광고 → 모니터링 → 분석 → 전략

## 기술 스택
- **프레임워크**: Next.js 16 (App Router, Turbopack), TypeScript strict
- **DB/Auth**: Supabase PostgreSQL (RLS disabled for dev), Supabase Auth
- **상태관리**: Zustand 5 (모든 CRUD → Supabase, await-first 패턴)
- **AI**: Google Gemini (`@google/genai` SDK, SSE 스트리밍 + 이미지 생성)
- **UI**: shadcn/ui + Tailwind CSS 4 + Lucide Icons + Recharts
- **에디터**: TipTap | **DnD**: @dnd-kit | **패키지**: npm
- **외부 API**: WordPress REST, Meta Graph API, YouTube Data v3, Naver Search Ad API, DataForSEO
- **이미지 스토리지**: Cloudflare R2 (presigned URL)
- **SEO**: seomachine FastAPI 마이크로서비스

## 명령어
```bash
npm run dev      # 개발 서버 (port 3000, contentflow/ 디렉토리에서)
npm run build    # 프로덕션 빌드
node scripts/generate-base-articles.mjs  # 기본글 일괄 AI 생성
node scripts/fix-article-tone.mjs        # 기본글 톤 수정
```

## 사이드바 구조
```
⚙️ 프로젝트 설정
콘텐츠: 💡 키워드/아이디어 · 📝 콘텐츠 생성 · 🚀 발행
광고:   📢 광고 관리 (Meta + YouTube Ads)
성장:   💬 모니터링/댓글
분석:   📊 사이트 분석 (GA4+SEO+GEO) · 📱 채널 분석 · 🎯 경쟁사
전략:   💡 마케팅 전략
```

## 키워드/아이디어 탭
- 🟢 N 키워드 분석 (네이버, 한국어 전용) | 🔵 G 키워드 분석 (DataForSEO/Google)
- 🔴 유튜브 유행 분석 | ✨ AI 아이디어 | 📁 보관함 (핀 키워드 = 메인 키워드 풀)
- 🏆 황금 키워드 발굴 (AI 시드→네이버→관련성 필터→전략 추천)

## 콘텐츠 관리
- 카테고리 필터(A~E), 드래그 정렬(@dnd-kit), 패널 접기/펼치기
- 원장님 컨펌 워크플로우 (기본글 하단 컨펌/해제, 목록에 초록 표시)
- N블로그 + WordPress: 4단계 워크플로우 (키워드→구조→생성→SEO)
- 메인 키워드 풀 → AI 자동 추천 (콘텐츠별 주요+보조 키워드 선택)
- 이미지 생성 지시사항 (채널별 커스텀), 이미지 편집기 (텍스트/선/화살표/사각형)
- **글로벌 스타일 바**: 정렬/제목폰트+크기+볼드/본문폰트+크기+볼드 (seo_details에 저장, 에디터+발행 동일 인라인스타일)
- **PC/모바일 뷰 토글**: WP/N블로그 편집기에서 375px 모바일 미리보기
- **📱 모바일 정리**: 규칙 기반 formatForMobile() — 긴 단락 분리+여백, AI 생성 후 자동 적용
- **카드뉴스 템플릿**: 저장/원래대로/새 템플릿/이름 편집, 폰트 선택(6종 한글), hidden 블록 지원
- **이미지 WebP**: 클라이언트 Canvas API 변환 (R2 업로드 전), 다운로드도 .webp
- **발행 큐**: 전 채널 DB 저장(publish_records), 콘텐츠 검증 경고, 예약 시간+빠른 예약, 채널별 추천 시간, 미리보기
- **다국어 번역**: AI 번역 → R2 저장(text/html) → 기본글 패널에서 언어 탭으로 표시. LanguageSelector 컴포넌트
- **Supabase 디바운스**: 전 테이블 공통 `debouncedWrite()` — blog_cards, instagram_cards, threads_cards, youtube_cards, blog_contents 순차 flush

## 핵심 설계 결정
- **Inside-Out 마이그레이션**: IndexedDB → Supabase (31개 컴포넌트 무수정)
- **모든 사용자 데이터 DB 저장**: localStorage는 UX 세션 상태(선택/플래그)에만 사용. 2026-04-22 완료:
  - 카드뉴스 템플릿 → `card_templates` + `card_hidden_builtins` (프로젝트 단위)
  - WordPress 자격증명 → `projects.wp_credentials` JSONB
  - Meta OAuth 토큰 → `projects.meta_credentials` JSONB
  - localStorage → DB 자동 마이그레이션 (비파괴적, localStorage 백업 유지)
  - ⚠️ 새 테이블은 반드시 `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` 필요 (dev 정책)
- **카드뉴스 2-pane 레이아웃**: `h-[85vh]` 고정 컨테이너 + 좌우 독립 overflow-y-auto (템플릿 고정/카드 스크롤)
- **generateId()**: pure UUID (Supabase 호환)
- **SSE 파싱**: `lib/sse-stream-parser.ts`의 `parseSSEStream` / `fetchSSEText` / `fetchAiGenerate` 공용
- **R2 업로드**: `hooks/use-r2-upload.ts`의 `uploadToR2()` 순수 함수 공용 (presign + PUT + 재시도)
- **API 에러 핸들링**: `lib/api-helpers.ts` — `jsonError`, `requireEnv`, `SSE_HEADERS`, `isTransientProviderError`
- **카드 타입**: `types/cards.ts` — `BlogCardContent`, `CardCanvasData`, `TextBlock`, `GlobalCardStyle`
- **저장 상태**: `stores/save-status-store.ts` — 전역 debounce 진행 상태 (TopBar에 인디케이터 표시)
- **Batch 이미지 생성**: `stores/batch-image-store.ts` — 탭 전환 간 job 유지 (Zustand)
- **다국어**: 모든 주요 모듈에 언어 탭 (ko/en/th/vi/ja/zh/ms/id)
- **채널별 번역**: `lib/channel-translator.ts` — 채널별 HTML 소스 번역 → R2 저장 → `translations` 테이블에 URL 기록
- **N블로그 다국어 필터**: 한국어가 아닌 언어 선택 시 N블로그 탭 자동 숨김
- **한글 IME**: `components/ui/korean-input.tsx` — `<KoreanInput>`, `<KoreanTextarea>` 공용 (`value`+`onCommit` 패턴)
- **채널 탭**: 기본글 | N블로그 | 내부 블로그 | 카드뉴스 | 스레드 | 롱폼 | 숏폼
- **내부 블로그 발행**: `internal-blog-panel.tsx` (WordPress 탭 교체) + `bulk-schedule-dialog.tsx` (일괄 예약 마법사, 5단계)

## 마케팅 전략 페이지 (HTML 뷰어 방식)
- **드롭다운 + iframe 뷰어**: `components/strategy/strategy-dashboard.tsx`가 `public/strategy-templates/`의 HTML 파일을 드롭다운에서 선택해서 iframe으로 표시
- **템플릿 목록 API**: `/api/strategy/templates` — 폴더 내 `.html` 파일 자동 인덱싱 (title/description meta tags 추출)
- **새 전략 추가법**: `public/strategy-templates/*.html` 파일 생성 → 드롭다운에 자동 등장
- **HTML 형식**: 기존 `parseStrategyHtml`(`lib/strategy-html-parser.ts`)과 호환되도록 `<script>const kwData=[...]; const topics=[...];</script>` 또는 `<table class="kw-table">`/`.cycle-item` 구조 권장
- **임포트 다이얼로그**(`strategy-import-dialog.tsx`): 탭으로 "템플릿 선택"(드롭다운) + "파일 업로드" 양쪽 지원
- **기존 AI 생성 흐름**: `StrategyInputForm`·5개 탭 컴포넌트(overview/keyword/channel/content/kpi)는 코드는 남아 있지만 현재 페이지에서 사용 안 함 (필요시 별도 진입점 추가)
- **187 글로벌 마케팅 전략 페이지 5종** (2026-05-14): `187-global-market.html`(10개국 시장 분석) · `187-global-strategy.html`(큰 그림 — 3축 유기적 사이클 + hub-spoke 운영 구조 + Phase 탭 + 국가별 3축 탭) · `187-th/vn/en-operations.html`(국가별 디테일 작전 페이지 — 전략+실행 통합, 페르소나·키워드·90일 캘린더, hero 색상 국가 구분)
- **정적 파일 serving 버그 수정**: `src/middleware.ts` matcher가 `.html` 등 정적 파일 확장자를 Supabase auth 미들웨어에서 제외 — 안 하면 strategy-templates HTML이 Next.js catch-all로 fallback (iframe 깨짐)

## 외부 사이트 블로그 연동 API (2026-05-14, 업데이트 2026-05-18)
- **엔드포인트**: `GET /api/blog/by-project/[projectId]/posts?lang={lang}` — 공개 read-only
- **용도**: dflo(187 성장클리닉) 등 외부 사이트가 빌드 타임에 published 글을 fetch해 정적 HTML로 렌더
- **노출 게이트**: `publish_records.channel='self_hosted' AND status='published' AND language={lang}` (기존 `blog_contents.status` 기반에서 변경)
- **자동 발행 체인**: Supabase `pg_cron`(`publish-self-hosted`, 매 1분) → `scheduled→published` 전환 + `deploy_webhook_queue` enqueue → Vercel Cron(`/api/cron/fire-deploy-webhooks`, 매 1분) → queue 폴링 → Railway deploy webhook 호출 (debounce)
- **다국어 fallback**: `lang≠ko`인데 translations 미완성이면 해당 글 응답에서 skip (한국어 본문 노출 금지)
- **응답**: `{posts: [{id, slug, title, body_html, cards, global_style, ...}]}` — translations 테이블 매칭 시 해당 언어 body/title 우선
- **캐시**: `Cache-Control: s-maxage=300, stale-while-revalidate=600` (CDN 5분, SWR 10분)
- **파일**: `src/app/api/blog/by-project/[projectId]/posts/route.ts`

## 환경변수 (.env.local) — 배포 시 호스팅에 설정 필요
```
GEMINI_API_KEY                    # Google Gemini AI
NEXT_PUBLIC_SUPABASE_URL          # Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Supabase
SUPABASE_SERVICE_ROLE_KEY         # Supabase (서버 전용)
NAVER_API_LICENSE_KEY             # 네이버 검색광고
NAVER_API_SECRET_KEY              # 네이버 검색광고
NAVER_API_CUSTOMER_ID             # 네이버 검색광고
DATAFORSEO_LOGIN                  # DataForSEO (Google 검색량)
DATAFORSEO_PASSWORD               # DataForSEO
META_APP_ID                       # Meta OAuth
META_APP_SECRET                   # Meta OAuth
NEXT_PUBLIC_META_APP_ID           # Meta (클라이언트)
YOUTUBE_API_KEY                   # YouTube Data API
R2_ACCOUNT_ID                     # Cloudflare R2
R2_ACCESS_KEY_ID                  # R2
R2_SECRET_ACCESS_KEY              # R2
R2_BUCKET_NAME                    # R2
R2_PUBLIC_URL                     # R2
NEXT_PUBLIC_R2_PUBLIC_URL         # R2 (클라이언트)
```
