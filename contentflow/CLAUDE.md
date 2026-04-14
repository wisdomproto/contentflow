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
