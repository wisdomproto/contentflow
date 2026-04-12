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
npm run lint     # ESLint
node scripts/generate-base-articles.mjs  # 기본글 일괄 AI 생성
node scripts/fix-article-tone.mjs        # 기본글 톤 수정 (병원명 제거)
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

## 키워드/아이디어 탭 구조
- 🟢 N 키워드 분석 (네이버 검색광고 API, 한국어 전용)
- 🔵 G 키워드 분석 (DataForSEO/Google Ads, 다국어)
- 🔴 유튜브 유행 분석
- ✨ AI 아이디어
- 📁 보관함 (핀 키워드)
- 🏆 황금 키워드 발굴 (AI 시드→네이버 검색량→관련성 필터→전략 추천)

## 콘텐츠 관리
- 카테고리 필터 (A~E 컬러 뱃지), 드래그 정렬 (@dnd-kit)
- 원장님 컨펌 워크플로우 (기본글 하단 컨펌/해제 버튼, 목록에 초록 표시)
- 콘텐츠 임포트: 마케팅 전략 HTML → 78개 주제 일괄 생성

## 핵심 설계 결정
- **Inside-Out 마이그레이션**: IndexedDB → Supabase (31개 컴포넌트 무수정)
- **generateId()**: pure UUID (Supabase 호환)
- **SSE 파싱**: `fetchAiGenerate` 헬퍼로 통일
- **다국어**: 모든 주요 모듈에 언어 탭 (ko/en/th/vi/ja/zh/ms/id)
- **채널 탭**: 기본글 | N블로그 | WordPress | 카드뉴스 | 스레드 | 롱폼 | 숏폼

## 환경변수 (.env.local)
GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
NAVER_API_LICENSE_KEY, NAVER_API_SECRET_KEY, NAVER_API_CUSTOMER_ID,
DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD,
META_APP_ID, META_APP_SECRET, YOUTUBE_API_KEY,
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
