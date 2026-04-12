# ContentFlow V2 — 마케팅 자동화 플랫폼 설계 스펙

**Date:** 2026-04-11
**Status:** Implemented (2026-04-12) — Phase 1~6 완료, 키워드/아이디어/발행/광고/모니터링/분석/전략 모두 구현
**Approach:** 기존 ContentFlow 업그레이드 (새로 만들지 않음)

---

## 1. 프로젝트 개요

ContentFlow를 AI 콘텐츠 생성 도구에서 **다국어 마케팅 자동화 플랫폼**으로 확장한다.

### 핵심 목표
- 한국어 콘텐츠 생성 → 다국어 번역 → 채널별 자동/예약 발행
- Google/Naver/GEO 통합 SEO 최적화
- 경쟁사/시장 분석 및 마케팅 전략 수립
- 키워드 기반 관련 콘텐츠 모니터링 + AI 댓글 생성
- 프로젝트별 웹사이트 연동 (GA4/GSC 트래킹)

### 첫 프로젝트
연세새봄의원 (소아 성장 클리닉) — 의료관광 타겟

### 웹사이트 개발과의 관계
연세새봄의원 웹사이트(dflo_0.1)는 **별도 프로젝트로 유지**. ContentFlow에서는 외부 URL로 SEO 분석/GA4 연동만 수행한다.

---

## 2. 기술 스택

### 유지
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui
- **State:** Zustand 5 + IndexedDB (idb-keyval)
- **AI:** Google Gemini (@google/genai SDK)
- **Editor:** TipTap
- **Charts:** Recharts
- **DB:** Supabase (PostgreSQL)
- **Storage:** AWS S3 (R2)

### 추가
- **Auth:** Supabase Auth (소규모 팀, 프로젝트별 접근 권한)
- **Publishing APIs:** WordPress REST API, Meta Graph API, YouTube Data API v3
- **SEO Data:** DataForSEO API, Google Search Console API
- **Analytics:** GA4 Data API (기존 확장)
- **Scheduling:** 예약 발행용 서버사이드 스케줄러
- **SEO Analysis:** seomachine Python 모듈을 마이크로서비스 또는 API Route에서 호출
- **Trends:** YouTube Data API, Meta Graph API, Google Trends, Naver DataLab API

---

## 3. 전체 아키텍처

### 네비게이션 구조: 사이드바 모듈형

Linear/Notion 스타일의 좌측 사이드바 + 우측 메인 영역.

```
┌─────────────────────────────────────────────────┐
│ [Project Switcher: 연세새봄의원 ▼]              │
├────────────┬────────────────────────────────────┤
│ 사이드바    │ 메인 콘텐츠 영역                    │
│            │                                    │
│ 콘텐츠     │ [탑바: 페이지 제목 | 검색]          │
│  📝 생성   │                                    │
│  💡 아이디어│ ┌──────────────────────────────┐   │
│  📅 캘린더  │ │                              │   │
│            │ │   각 모듈의 메인 콘텐츠        │   │
│ 발행       │ │                              │   │
│  🚀 채널   │ │                              │   │
│  💬 모니터링│ └──────────────────────────────┘   │
│            │                                    │
│ 분석       │                                    │
│  🔍 SEO    │                                    │
│  📊 분석   │                                    │
│  🎯 경쟁사  │                                    │
│            │                                    │
│ 전략       │                                    │
│  💡 전략   │                                    │
│            │                                    │
│ ──────── │                                    │
│ ⚙️ 설정    │                                    │
│ 👤 프로필   │                                    │
└────────────┴────────────────────────────────────┘
```

### 기존 구조와의 변경점
- **현재:** 아우터 패널(프로젝트 리스트) + 이너 패널(채널별 콘텐츠)
- **변경:** 좌측 220px 사이드바(모듈 네비게이션) + 우측 메인 영역
- 프로젝트 스위처는 사이드바 최상단
- 콘텐츠 생성 모듈 내부는 기존 구조 유지 (좌: 콘텐츠 리스트, 우: 채널 탭 에디터)

---

## 4. 모듈 상세 설계

### 4.1 📝 콘텐츠 생성 (기존 업그레이드)

**기존 유지:**
- 채널별 에디터 (원본/블로그/카드뉴스/스레드/유튜브)
- AI 콘텐츠 생성 + 이미지 생성
- TipTap 에디터
- 프로젝트별 콘텐츠 관리

**추가/변경:**

#### 언어 셀렉터 (번역 통합)
별도 "번역 관리" 모듈 대신, 각 채널 에디터 안에 언어 전환을 통합한다.

- 채널 탭(원본/블로그/카드뉴스/스레드/유튜브) 바로 아래에 **언어 셀렉터 바** 추가
- `[🇰🇷 KO | 🇺🇸 EN | 🇹🇭 TH | 🇻🇳 VI]` 토글 그룹
- 각 언어 뱃지에 상태 표시: ✓ 완료 / ⏳ 번역중 / — 미번역
- "AI 번역" 버튼 → 선택 언어로 자동 번역
- "원본 비교 보기" → 좌우 분할 모드 (좌: 원본 KO 읽기전용, 우: 번역 편집 가능)
- "AI 재번역" 버튼 (번역 품질 불만족 시)

#### 콘텐츠 리스트 업그레이드
- 각 콘텐츠에 **언어 뱃지** (KO ✓ / EN ✓ / TH ⏳ / VI —)
- 각 콘텐츠에 **발행 상태 아이콘** (W/I/F/T/Y — 채널별)

#### GEO 체크리스트
- 콘텐츠 생성 프롬프트에 GEO 최적화 규칙 내장
- 통계/수치 포함 권장, Q&A 구조, 인용 가능한 요약문
- 의료 분야 특화: E-E-A-T 강화, 의료진 프로필, 출처 명시

#### 네이버 리포맷
- 블로그 콘텐츠에서 "네이버 포맷으로 변환" 버튼
- AI가 네이버 블로그에 최적화된 형태로 리포맷 (이미지 재배치, 문단 분할, 키워드 밀도 조정)
- 변환 결과를 클립보드로 복사하여 수동 업로드

---

### 4.2 💡 아이디어

트렌딩 콘텐츠를 분석하여 콘텐츠 아이디어를 발굴하는 모듈.

#### 탭 구성
1. **트렌딩** — 플랫폼별 인기 콘텐츠 피드
2. **아이디어 보관함** — 저장한 아이디어 관리
3. **경쟁사 갭에서 가져오기** — 경쟁사 분석 모듈과 연동

#### 트렌딩 탭
- **YouTube:** YouTube Data API로 키워드/카테고리별 인기 영상 (썸네일, 조회수, 기간)
- **Instagram:** Meta Graph API로 트렌딩 게시물, 해시태그 트렌드
- **Google Trends:** 급상승 키워드, 관련 검색어
- **Naver DataLab:** 검색 트렌드, 인기 블로그 포스트
- 필터: 플랫폼, 기간(1주/1개월/3개월), 국가, 키워드

#### AI 콘텐츠 아이디어 생성
- 인기 콘텐츠 선택 → AI가 스크립트/구조 분석
- 콘텐츠 구성 제안: 시작(훅) / 중간(본문) / 마무리(CTA)
- 채널별(블로그/카드뉴스/유튜브) 맞춤 아이디어 생성
- "생성 →" 버튼으로 콘텐츠 생성 모듈에 직접 연결
- "보관" 버튼으로 아이디어 보관함에 저장

---

### 4.3 📅 캘린더

다국어 × 다채널 콘텐츠 발행 일정을 관리하는 전략적 캘린더.

#### 뷰
- **월간 뷰:** 그리드에 국기 + 채널 색상으로 구분
- **주간 뷰:** 시간대별 상세 일정

#### 기능
- 채널/언어 필터링
- 드래그로 일정 이동
- 발행 상태 시각화 (예약/발행됨/실패)
- **AI 최적 발행 시간 추천:** 국가별 타임존 고려, 타겟 오디언스 활동 시간 분석

---

### 4.4 🚀 채널 발행

콘텐츠를 각 채널에 자동/예약 발행하는 허브.

#### 연결된 채널 관리
- WordPress, Instagram, Facebook, Threads, YouTube
- 각 채널에 언어별 계정 매핑 (🇰🇷→계정A, 🇺🇸→계정B)
- 채널 카드: 연결 상태, 발행/예약 카운트

#### 발행 대기열
- 필터: 전체 / 예약 / 발행됨 / 실패
- 각 항목: 채널 아이콘 + 국기 + 콘텐츠명 + 예약 시간(타임존 포함)
- 액션: 수정, 지금 발행, 예약 변경
- 발행 실패 시 알림 + 재시도

#### 네이버 블로그 (수동 업로드)
- WordPress 콘텐츠를 네이버 포맷으로 AI 리포맷
- "네이버 포맷 복사" 버튼 + 미리보기
- 수동 업로드 후 "완료" 체크

#### API 연동
- **WordPress:** REST API (wp-json/wp/v2/posts) — 즉시/예약 발행
- **Instagram/Facebook/Threads:** Meta Graph API — 이미지/카루셀/릴스 발행
- **YouTube:** YouTube Data API v3 — 동영상 업로드, 제목/설명/태그 설정

---

### 4.5 💬 모니터링 / 댓글

키워드 기반으로 관련 콘텐츠를 발견하고 AI 댓글을 생성하여 계정을 키우는 모듈.

#### 모니터링 대상
| 플랫폼 | 모니터링 대상 | 행동 |
|--------|-------------|------|
| Instagram/Facebook/Threads | 키워드 관련 타 계정 게시물 | AI 댓글 생성 → 복사 → 수동 업로드 |
| YouTube | 키워드 관련 영상 | AI 댓글 생성 → 복사 → 수동 업로드 |
| 네이버 지식인 | 키워드 관련 질문 | AI 답변 생성 → 복사 → 수동 업로드 |
| 네이버/WordPress 블로그 | 관련 포스트 | AI 댓글 생성 → 복사 → 수동 업로드 |

#### 피드
- 키워드 태그 기반 자동 수집 (다국어 키워드 지원)
- 플랫폼별, 언어별 필터
- 각 콘텐츠에 AI 댓글/답변 자동 생성
- 톤 조절: 전문적 / 친근 / 짧게 / 재생성
- "복사" → 수동 업로드, "댓글 완료" 체크로 활동 로그
- 알림: 새 콘텐츠 발견 시 알림 + 일간 요약 리포트

---

### 4.6 🔍 SEO 분석

Google/Naver/GEO 3종 SEO 분석 도구.

#### 탭 구성
1. **사이트 감사** — 외부 URL 크롤링, 기술 SEO 진단
2. **콘텐츠 SEO** — 개별 콘텐츠의 SEO 점수 검사
3. **키워드 트래킹** — 키워드별 순위 변동 추적
4. **Schema 마크업** — 자동 생성 (MedicalEntity, FAQ, HowTo 등)

#### 사이트 감사
- Google SEO 점수, Naver SEO 점수, GEO 점수, 기술 SEO 점수 — 원형 게이지
- 이슈 목록: 검색엔진별 태그, 심각도, 원클릭 수정/자동 생성
- 기술 SEO: 페이지 속도(Core Web Vitals), 모바일 최적화, 크롤링/색인, HTTPS, URL 구조, 내부 링크

#### GEO 점수 검사
- AI 인용 적합도 분석
- 체크 항목: 통계/수치 포함, Q&A 구조, Schema 마크업, E-E-A-T 요소, 인용 가능한 정의/요약문

#### SEO 엔진 통합
seomachine의 Python 모듈 활용:
- `content_scorer.py`, `readability_scorer.py`, `keyword_analyzer.py`
- `search_intent_analyzer.py`, `seo_quality_rater.py`
- `above_fold_analyzer.py`, `cta_analyzer.py`
- Next.js API Route에서 Python 스크립트 호출 또는 별도 마이크로서비스

---

### 4.7 📊 애널리틱스

GA4 + GSC 통합 대시보드.

#### KPI 카드
- 세션, 사용자, 페이지뷰, 전환(예약/문의), 전환율
- 이전 기간 대비 변동률

#### 차트
- 일별 트래픽 바 차트
- 유입 채널별 비율 (Organic Search, Social, YouTube, Naver Blog, Direct)
- 콘텐츠별 유입 기여도 — 어떤 콘텐츠가 실제 유입을 만들었는지
- 국가별 트래픽 (🇰🇷 🇹🇭 🇺🇸 🇻🇳)

#### 필터
- 기간 (7일/30일/90일/커스텀)
- 사이트 선택
- GA4 / GSC 전환

#### 리포트
- 주간/월간 자동 리포트 생성 (기존 기능 확장)
- GA4 데이터 + 콘텐츠 발행 현황 + 키워드 변동 통합

---

### 4.8 🎯 경쟁사 분석

콘텐츠 중심의 경쟁사 분석. 향후 풀 마케팅 인텔리전스로 확장.

#### 탭 구성 (Phase 1)
1. **콘텐츠 갭** — 경쟁사가 다루지만 우리가 안 다루는 주제
2. **키워드 순위** — 경쟁사 대비 키워드 순위 비교
3. **SERP 분석** — 검색 결과 페이지 분석

#### 탭 구성 (Phase 2 확장)
4. **소셜 퍼포먼스** — 경쟁사 SNS 성과 트래킹
5. **광고 분석** — 경쟁사 광고 크리에이티브/전략

#### 경쟁사 관리
- 경쟁사 셀렉터로 비교 대상 추가/관리
- 국가별 경쟁사 분리 (🇰🇷 한국 경쟁사 / 🇹🇭 태국 경쟁사)

#### 콘텐츠 갭 분석
- 경쟁사가 다루는 주제 + 월검색량 + 어떤 경쟁사가 다루는지 표시
- "콘텐츠 만들기 →" 버튼으로 콘텐츠 생성 모듈에 직접 연결
- 우리만 다루는 차별화 콘텐츠 표시

#### 데이터 소스
- DataForSEO API (키워드 순위, SERP, 백링크)
- seomachine의 `competitor_gap_analyzer.py`

---

### 4.9 💡 마케팅 전략 (기존 확장)

기존 5탭 전략 대시보드에 국가별 관리를 추가.

#### 변경점
- 상단에 **국가별 탭** 추가: 🇰🇷 한국 / 🇺🇸 미국 / 🇹🇭 태국 / 🇻🇳 베트남 / + 국가 추가
- 각 국가 안에서 기존 5탭 유지:
  1. 개요 & 경쟁사
  2. 키워드 분석
  3. 채널 & 퍼널 전략
  4. 콘텐츠 & 토픽
  5. KPI & 액션 플랜
- 국가별 맞춤 AI 전략 제안
- 기존 전략 import 기능 유지

---

### 4.10 ⚙️ 설정

#### 탭 구성
1. **프로젝트** — 프로젝트명, 웹사이트 URL, 업종, 타겟 언어
2. **채널 연동** — WordPress/Meta/YouTube 계정 연결, 언어별 매핑
3. **API 키** — GA4, GSC, DataForSEO, Gemini API 키 관리
4. **팀 관리** — Supabase Auth 기반, 프로젝트별 접근 권한
5. **알림** — 모니터링 알림, 발행 실패 알림, 리포트 스케줄

---

## 5. 다국어 지원

### 기본 언어
한국어 (콘텐츠 생성 기본)

### 타겟 언어
프로젝트 설정에서 자유롭게 추가. 첫 프로젝트 기본: 영어, 태국어, 베트남어.

### 번역 파이프라인
1. 한국어 원본 콘텐츠 생성
2. 채널 에디터에서 언어 전환 → "AI 번역" 클릭
3. AI가 해당 채널 포맷에 맞게 번역 (블로그 SEO 번역 ≠ 카드뉴스 번역)
4. "원본 비교 보기"로 좌우 비교 검수
5. 검수 완료 → 발행 모듈로 이동

### 채널 매핑
글로벌 공통 채널(WordPress, Meta, YouTube) 사용. 네이버는 한국어 전용.

### SEO 차이 대응
- Google: 구조화된 헤딩, 메타태그, 백링크 중시
- Naver: C-Rank/D.I.A 최적화, 이미지 다수, 짧은 문단, 키워드 밀도
- 네이버용 리포맷은 AI가 자동 변환

---

## 6. 데이터 모델 변경

### 기존 모델 (유지)
```
Project → Content → Cards (1:N:N)
```

### 확장
```
Project
├── settings (languages[], competitors[], channels[])
├── Content
│   ├── base (원본 한국어)
│   ├── translations[] (language, channelType, status, body)
│   └── publishRecords[] (channel, language, status, scheduledAt, publishedAt)
├── MonitoringKeywords[]
├── MonitoringFeed[]
├── CommentLogs[]
├── SEOAudits[]
├── AnalyticsSnapshots[]
└── StrategyPerCountry[]
```

### 새 테이블
- `translations` — 콘텐츠 번역 (content_id, language, channel_type, status, body, cards_json) — cards_json은 해당 채널의 카드 구조를 JSON으로 저장 (BlogCard[], YoutubeCard[] 등 채널별 포맷 유지)
- `publish_records` — 발행 이력 (content_id, channel, language, status, scheduled_at, published_at, platform_post_id, published_url)
- `channel_connections` — 채널 연동 정보 (project_id, platform, language, account_id, account_name, vault_secret_id) — OAuth 토큰은 Supabase vault에 암호화 저장, 이 테이블은 vault_secret_id만 참조
- `monitoring_keywords` — 모니터링 키워드 (project_id, keyword, language)
- `monitoring_feed` — 수집된 콘텐츠 (keyword_id, platform, url, title, engagement, discovered_at)
- `comment_logs` — 댓글 활동 로그 (feed_id, generated_comment, status, completed_at)
- `seo_audits` — SEO 감사 결과 (project_id, url, google_score, naver_score, geo_score, tech_score, issues[])
- `competitor_profiles` — 경쟁사 (project_id, name, country, url, keywords[])
- `strategy_per_country` — 국가별 전략 (project_id, country, strategy_data)
- `ideas` — 아이디어 보관함 (project_id, title, structure, source_url, platform, status[draft/saved/converted], created_at, updated_at)
- `keyword_rankings` — 키워드 순위 이력 (project_id, keyword, search_engine[google/naver], country, position, date) — 일별 스냅샷
- `analytics_snapshots` — 분석 스냅샷 (project_id, date, sessions, users, pageviews, conversions, conversion_rate, traffic_sources_json, country_breakdown_json)
- `project_members` — 팀 멤버 (project_id, user_id, role[admin/editor/viewer], invited_at)
- 모든 테이블에 `created_at`, `updated_at` 타임스탬프 포함

---

## 7. API 엔드포인트 (신규)

### 번역
- `POST /api/translate` — AI 번역 요청
- `GET /api/translations/:contentId` — 콘텐츠별 번역 목록
- `PUT /api/translations/:id` — 번역 수정
- `DELETE /api/translations/:id` — 번역 삭제

### 발행
- `POST /api/publish/wordpress` — WordPress 발행
- `POST /api/publish/meta` — Instagram/Facebook/Threads 발행
- `POST /api/publish/youtube` — YouTube 업로드
- `POST /api/publish/schedule` — 예약 발행 등록
- `GET /api/publish/queue` — 발행 대기열 조회
- `DELETE /api/publish/schedule/:id` — 예약 발행 취소
- `GET /api/publish/:id` — 발행 상세 (published_url 포함)

### 모니터링
- `GET /api/monitoring/feed` — 모니터링 피드 조회
- `POST /api/monitoring/comment` — AI 댓글 생성
- `POST /api/monitoring/keywords` — 키워드 관리

### SEO
- `POST /api/seo/audit` — 사이트 감사 실행
- `GET /api/seo/audit/:projectId` — 감사 결과 조회
- `POST /api/seo/content-check` — 콘텐츠 SEO 검사
- `POST /api/seo/schema-generate` — Schema 마크업 생성

### 아이디어
- `GET /api/ideas/trending` — 트렌딩 콘텐츠 조회
- `POST /api/ideas/generate` — AI 아이디어 생성
- `POST /api/ideas/analyze-script` — 콘텐츠 스크립트/구조 분석
- `CRUD /api/ideas` — 아이디어 보관함

### 캘린더
- `GET /api/calendar/events` — 캘린더 이벤트 조회 (publish_records + scheduled 통합)
- `PUT /api/calendar/reschedule` — 일정 변경

### 채널 연동
- `GET /api/channels` — 연결된 채널 목록
- `POST /api/channels/connect` — OAuth 플로우 시작
- `DELETE /api/channels/:id` — 채널 연결 해제
- `POST /api/channels/:id/refresh` — 토큰 갱신

### 경쟁사
- `CRUD /api/competitors` — 경쟁사 프로필 관리
- `POST /api/competitors/gap-analysis` — 콘텐츠 갭 분석
- `GET /api/competitors/keywords` — 경쟁사 키워드 순위

### 팀 관리
- `GET /api/team` — 팀 멤버 목록
- `POST /api/team/invite` — 초대 링크 생성
- `PUT /api/team/:userId/role` — 역할 변경
- `DELETE /api/team/:userId` — 멤버 제거

### 전략
- `POST /api/strategy/:country` — 국가별 전략 생성/업데이트

### 애널리틱스
- `GET /api/analytics/dashboard` — 종합 대시보드 데이터
- `GET /api/analytics/content-performance` — 콘텐츠별 성과
- `GET /api/analytics/country-traffic` — 국가별 트래픽

---

## 8. 외부 서비스 연동

| 서비스 | 용도 | API |
|--------|------|-----|
| Google Gemini | AI 콘텐츠 생성, 번역, 댓글, 전략 | @google/genai SDK |
| WordPress | 블로그 발행 | REST API (wp-json/wp/v2) |
| Meta (Instagram/Facebook/Threads) | SNS 발행 + 모니터링 | Graph API |
| YouTube | 영상 업로드 + 트렌드 조회 + 모니터링 | Data API v3 |
| Google Analytics | 트래픽/전환 추적 | GA4 Data API |
| Google Search Console | 검색 성과 | Search Console API |
| DataForSEO | 키워드 데이터, SERP, 경쟁사 분석 | REST API |
| Google Trends | 검색 트렌드 | (비공식 API / pytrends) |
| Naver | 키워드, DataLab, 지식인 | 검색광고 API, DataLab API |
| Supabase | DB, Auth, Storage | Supabase JS SDK |

---

## 9. 구현 우선순위 (서브프로젝트 단위)

### Phase 1: 기반 구조 리팩토링
- 사이드바 레이아웃 전환 (아우터/이너 → 사이드바/메인)
- IndexedDB → Supabase 마이그레이션
- Supabase Auth + RLS 연동
- 프로젝트 설정 (언어, 채널 연동)
- seomachine FastAPI 마이크로서비스 기본 셋업
- ChannelType 정리 ('blog' → 'naver_blog', 'wordpress' 추가)

### Phase 2: 다국어 + 발행
- 채널 에디터 내 언어 셀렉터
- AI 번역 파이프라인
- WordPress 자동 발행
- Meta Graph API 발행
- YouTube 업로드
- 예약 발행 스케줄러
- 캘린더 모듈

### Phase 3: SEO + 분석
- SEO 분석 모듈 (Google/Naver/GEO 3종)
- Schema 마크업 자동 생성
- 기술 SEO 감사
- GA4/GSC 대시보드 확장
- seomachine Python 모듈 통합

### Phase 4: 아이디어 + 모니터링
- 아이디어 모듈 (트렌딩, 스크립트 분석, AI 생성)
- 모니터링 모듈 (키워드 기반 수집, AI 댓글)
- 네이버 지식인 모니터링

### Phase 5: 경쟁사 + 전략 확장
- 경쟁사 분석 모듈 (콘텐츠 갭, 키워드 비교, SERP)
- 마케팅 전략 국가별 확장
- 소셜 퍼포먼스 트래킹 (Phase 2 확장)

---

## 10. 마이그레이션 계획

### IndexedDB → Supabase 전환
현재 앱은 Zustand + IndexedDB에 모든 데이터를 저장한다. Phase 1에서 Supabase로 전환한다.

1. **Phase 1a:** Supabase 테이블 생성 + API 레이어 구축
2. **Phase 1b:** Zustand store를 Supabase 클라이언트로 교체 (IndexedDB persistence 제거)
3. **Phase 1c:** 기존 IndexedDB 데이터를 Supabase로 일괄 마이그레이션하는 유틸리티 제공 (1회성)
4. IndexedDB는 오프라인 캐시로만 유지 (선택적)

### 채널 타입 정리
- 기존 `'blog'` → `'naver_blog'`로 rename (네이버 블로그 전용)
- `'wordpress'` 신규 추가
- 전체 ChannelType: `'wordpress' | 'naver_blog' | 'instagram' | 'facebook' | 'threads' | 'youtube'`

---

## 11. 인프라 결정 사항

### 예약 발행 스케줄러
Supabase `pg_cron` + Edge Functions 조합:
- `pg_cron`: 1분 간격으로 `publish_records`에서 예약 시간 도래한 항목 조회
- Supabase Edge Function: 실제 발행 API 호출 (WordPress/Meta/YouTube)
- 실패 시 3회 재시도 (exponential backoff), 이후 status='failed' + 알림

### seomachine Python 통합
**별도 마이크로서비스**로 결정:
- FastAPI 서버로 seomachine의 Python 모듈을 래핑
- Next.js API Route에서 HTTP로 호출
- 이유: Python 런타임이 Node.js와 분리되어 독립 배포/스케일 가능
- 배포: Railway 또는 Fly.io (가벼운 Python 서버)

### OAuth 토큰 보안
- Meta/YouTube OAuth 토큰은 Supabase의 `vault` 스키마 (encrypted storage) 사용
- `channel_connections` 테이블은 `vault_secret_id`만 참조, 실제 토큰은 vault에 저장
- Refresh token rotation 자동화: Edge Function에서 만료 전 갱신

### 모니터링 데이터 수집 주기
- 키워드 기반 모니터링: **4시간 간격** 백그라운드 수집 (pg_cron)
- 사용자가 수동으로 "지금 새로고침" 가능
- 수집 결과 중 새 항목 발견 시 알림 발송

### 알림 전달 방식
- Phase 1: 인앱 알림 (Supabase Realtime으로 실시간 푸시)
- Phase 2 (선택): 이메일 알림 (Supabase Edge Function + Resend)

### API Rate Limiting
- Meta Graph API: 200 calls/hour — 배치 처리, 큐 기반 발행
- YouTube Data API: 10,000 units/day — 쿼터 모니터링 대시보드
- DataForSEO: 크레딧 기반 — 사용량 추적, 월간 한도 설정
- 모든 외부 API: exponential backoff 재시도 (최대 3회)

---

## 12. 인증 및 권한

### 역할
- **Admin:** 프로젝트 생성/삭제, 팀 관리, 채널 연동, 모든 기능
- **Editor:** 콘텐츠 생성/편집, 발행, 모니터링, 분석 조회
- **Viewer:** 대시보드/분석 조회만 (편집 불가)

### 구현
- Supabase Auth (이메일/비밀번호)
- `project_members` 테이블: (project_id, user_id, role)
- Supabase RLS (Row Level Security) 정책으로 프로젝트별 데이터 격리
- 초대 링크로 팀원 추가

---

## 13. 제약 사항 및 주의점

### 의료광고법
- 연세새봄의원은 의료기관 → 의료광고법(의료법 제56조) 준수 필요
- 과대광고, 비교광고, 시술 전후 사진 제한
- AI 생성 콘텐츠에 의료광고 컴플라이언스 체크 고려

### API 제한
- Meta Graph API: 비즈니스 계정 필요, 발행 시 검토 필요
- YouTube Data API: 일일 할당량 제한
- DataForSEO: 유료 (크레딧 기반)

### 네이버 자동화 한계
- 네이버 블로그/지식인 자동 발행 API 없음 → 수동 업로드만 지원
- 모니터링은 크롤링 기반 (속도 제한 필요)

### 보안
- API 키, OAuth 토큰 → 환경변수 + Supabase에 암호화 저장
- 팀 멤버별 접근 권한 분리
