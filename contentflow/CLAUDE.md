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
- 발행 큐 시스템 (큐에 추가 → 발행 메뉴에서 실제 발행)

## 핵심 설계 결정
- **Inside-Out 마이그레이션**: IndexedDB → Supabase (31개 컴포넌트 무수정)
- **generateId()**: pure UUID (Supabase 호환)
- **SSE 파싱**: `fetchAiGenerate` 헬퍼로 통일
- **다국어**: 모든 주요 모듈에 언어 탭 (ko/en/th/vi/ja/zh/ms/id)
- **채널 탭**: 기본글 | N블로그 | WordPress | 카드뉴스 | 스레드 | 롱폼 | 숏폼

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
