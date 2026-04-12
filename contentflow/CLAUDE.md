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
- **외부 API**: WordPress REST, Meta Graph API, YouTube Data v3, Naver Search Ad API
- **이미지 스토리지**: Cloudflare R2 (presigned URL)
- **SEO**: seomachine FastAPI 마이크로서비스

## 명령어
```bash
npm run dev      # 개발 서버 (port 3000, contentflow/ 디렉토리에서)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
```

## 사이드바 구조
```
⚙️ 프로젝트 설정
콘텐츠: 💡 키워드/아이디어 · 📝 콘텐츠 생성 · 🚀 발행
광고:   📢 광고 관리 (Meta + YouTube Ads)
성장:   💬 모니터링/댓글
분석:   📊 사이트 분석 · 📱 채널 분석 · 🎯 경쟁사
전략:   💡 마케팅 전략
```

## 핵심 설계 결정
- **Inside-Out 마이그레이션**: IndexedDB → Supabase 전환 시 31개 컴포넌트 무수정 (store 내부만 변경)
- **generateId()**: pure UUID (Supabase 호환, 접두사 없음)
- **SSE 파싱**: `fetchAiGenerate` 헬퍼로 통일 (data: 형식 파싱)
- **다국어**: 모든 주요 모듈에 언어 탭 (ko/en/th/vi/ja/zh/ms/id)
- **채널 콘텐츠 탭**: 기본글 | N블로그 | WordPress | 카드뉴스 | 스레드 | 롱폼 | 숏폼
- **WordPress E2E**: 4단계 워크플로우 (키워드→구조→AI생성→SEO검사→발행)

## 컨벤션
- 한국어 UI, 영어 코드/커밋
- blog-panel.tsx가 채널 구현의 레퍼런스 패턴 (Outer+Inner)
- launch.json 서버명: `contentflow-dev`
- 채널 추가: 타입 정의 → Store → 프롬프트 빌더 → 카드 → Inner → Outer → 탭 연동

## 환경변수 (.env.local)
GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
NAVER_SEARCH_AD_API_KEY, NAVER_SEARCH_AD_SECRET_KEY, NAVER_SEARCH_AD_CUSTOMER_ID,
META_APP_ID, META_APP_SECRET, YOUTUBE_API_KEY,
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL

## 상세 문서
- see `src/components/content/` — 채널별 패널, Outer+Inner 패턴
- see `src/components/strategy/` — AI 마케팅 전략 5탭
- see `src/stores/project-store.ts` — Zustand 스토어 (Supabase CRUD)
