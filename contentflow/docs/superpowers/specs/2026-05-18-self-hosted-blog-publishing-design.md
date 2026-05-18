# Self-Hosted Blog Publishing (Phase A — Infrastructure)

> **Status:** ✅ Implemented (2026-05-18) — see `plans/2026-05-18-self-hosted-blog-publishing.md`

## Overview

ContentFlow에서 사용자의 본진 사이트(예: dflo / `https://www.dr187growup.com`)로
다국어 블로그 글을 **예약 발행**할 수 있게 한다. WordPress REST 발행을 제거하고
"내부 블로그" 채널로 교체한다.

### 사용자 시나리오
1. ContentFlow에서 187 콘텐츠 70개를 한국어/태국어로 가지고 있음
2. 프로젝트 설정에서 본진 사이트 등록 (도메인, 활성 언어, 언어별 path, deploy webhook)
3. 콘텐츠 편집기 "내부 블로그" 탭에서 언어별 본문/SEO 작성
4. 발행 큐 → "일괄 예약 발행" 마법사로 콘텐츠 N개 × 언어 N개를 분산 일정으로 등록
5. ContentFlow `pg_cron`이 매 1분마다 예약 시각 도달분을 `published`로 전환
6. 전환 직후 본진 사이트의 Railway deploy webhook을 1회 호출 → 본진 재빌드
7. 본진은 빌드 타임에 ContentFlow API로 글을 fetch해서 정적 HTML 생성
8. 발행 완료 — `dr187growup.com/blog/{slug}`, `dr187growup.com/th/blog/{slug}`에 노출

### Phase B (이 spec 범위 외)
- 70개 한국어 + 70개 태국어 = 140개 SEO 글 본문/메타 일괄 생성
- ComfyUI(`C:\ComfyUI_windows_portable`)로 글 중간 이미지 200~350장 생성
- 별도 spec으로 진행. 본 Phase A 완료 후 착수.

---

## 핵심 결정사항 (12개)

1. **사이트 = 프로젝트당 1개** — `projects.published_site` JSONB 단일 슬롯. 별도 테이블 없음
2. **URL 구조** — 단일 도메인 + path 분기. KR=`/blog/{slug}`, TH=`/th/blog/{slug}`. 향후 VN/EN은 토글로 켜기만 하면 됨
3. **발행 단위** — `(content_id, language, channel='self_hosted')` 1행 = `publish_records` 1행. 콘텐츠 1개 × 4언어 = 4행
4. **마스터 상태** — 외부 API의 노출 게이트는 `publish_records.status='published'`로 전환. 기존 `blog_contents.status` 기반에서 변경
5. **자동 발행** — Supabase `pg_cron` 매 1분, `scheduled_at <= NOW()` AND `channel='self_hosted'`인 행을 `published`로 전환
6. **외부 연동 방식** — dflo는 Vite + React SPA(CSR). **빌드 타임 prerender + 발행 시 Railway deploy webhook**으로 처리. SEO 풀파워 확보
7. **debounce** — 1분 윈도우에 발행 N건이 떨어져도 webhook 1회만 호출 (Railway 빌드 비용/시간 절약)
8. **WordPress 채널 제거** — 콘텐츠 편집기 WordPress 탭 → "내부 블로그" 탭으로 교체. 발행 큐 WP 카드 → "내 사이트" 카드. WP REST 발행 라우트 제거. `projects.wp_credentials`는 컬럼만 잔존(다음 정리에서 DROP)
9. **활성 언어** — 187 프로젝트는 KR/TH만 활성. 시스템은 다국어 enum 유지(`ko/en/th/vi/ja/zh/ms/id`), 사이트 설정에서 활성/비활성만 토글
10. **일괄 예약 마법사** — 콘텐츠 다중선택 + 분산 규칙(주N회·요일·시간대·언어별 시차) → 라운드로빈으로 슬롯 배분 → 캘린더 미리보기 → 개별 드래그 조정 → 일괄 insert
11. **dflo 침습 최소화** — 전체를 vike/SSG로 마이그 안 함. 블로그 라우트만 별도 prerender 스크립트로 정적 HTML 생성. 나머지 페이지는 기존 CSR 그대로
12. **dflo 작업 위치** — `C:\projects\dflo_0.1\v4` (Vite + React 19 + react-router-dom v7, Railway 배포)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  ContentFlow (Next.js, Supabase, R2)                             │
│                                                                  │
│  [프로젝트 설정 페이지]                                          │
│   └─ PublishedSiteSection                                        │
│        domain, active_languages, language_paths, webhook         │
│                                                                  │
│  [콘텐츠 편집기 — 채널 탭]                                       │
│   기본글 │ N블로그 │ 내부 블로그 │ 카드뉴스 │ 스레드 │ 롱폼 │ 숏폼 │
│                       ↑                                          │
│                       WordPress 탭 교체. SEO 4단계 유지          │
│                                                                  │
│  [발행 큐 페이지]                                                │
│   └─ ChannelCard(self_hosted)                                    │
│        🌐 내 사이트 (dr187growup.com)                            │
│        🇰🇷 예약 N · 발행 M    🇹🇭 예약 N · 발행 M               │
│        [ 일괄 예약 + ]                                           │
│                                                                  │
│  [DB]                                                            │
│   ├─ projects.published_site JSONB                               │
│   └─ publish_records (channel='self_hosted', language, scheduled)│
│                                                                  │
│  [pg_cron — 매 1분]                                              │
│   1) scheduled→published 전환                                    │
│   2) 전환 행 1+ 있고 webhook 미호출이면 deploy_webhook 호출       │
│                                                                  │
│  [외부 API]                                                      │
│   GET /api/blog/by-project/{pid}/posts?lang={lang}               │
│    → publish_records 기반 (status='published'                    │
│         AND channel='self_hosted' AND language={lang})           │
│                                                                  │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTP
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  dflo v4 (Vite + React SPA, Railway)                             │
│                                                                  │
│  [빌드 파이프라인]                                               │
│   tsc -b && build:i18n && vite build && build:blog               │
│                                            ↑                     │
│                                            신규 스크립트         │
│                                                                  │
│  [v4/scripts/build-blog.mjs]                                     │
│   1) ContentFlow API 호출 (ko, th)                               │
│   2) 글마다 정적 HTML 생성:                                      │
│      dist/blog/{slug}/index.html                                 │
│      dist/th/blog/{slug}/index.html                              │
│   3) <title>, <meta>, hreflang, OG, JSON-LD 주입                 │
│   4) 본문 인라인 (JS 미실행 봇 대응)                             │
│                                                                  │
│  [react-router 라우트]                                           │
│   /blog            글 목록 (ko)                                  │
│   /blog/:slug      글 상세 (ko, CSR 폴백)                        │
│   /th/blog         글 목록 (th)                                  │
│   /th/blog/:slug   글 상세 (th, CSR 폴백)                        │
│                                                                  │
│  [Railway]                                                       │
│   deploy webhook 수신 → 자동 재빌드 (~1-2분)                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## DB 변경

`supabase/migrations/2026-05-18-self-hosted-channel.sql` 신규 파일 1개로 통합.

### (a) 사이트 정보 슬롯
```sql
ALTER TABLE projects ADD COLUMN published_site JSONB DEFAULT NULL;
```

**published_site 구조**
```typescript
{
  name: string,                   // "dflo"
  domain: string,                 // "https://www.dr187growup.com"
  domain_prefix?: string,         // "/test" (개발용, 작업 종료 시 "")
  active_languages: string[],     // ["ko", "th"]
  language_paths: Record<string, string>,  // { ko: "/blog", th: "/th/blog" }
  deploy_webhook_url?: string,    // Railway deploy hook URL
  enabled: boolean
}
```

### (b) 채널 enum 교체
```sql
-- 순서 중요: DROP → UPDATE legacy → ADD new constraint (역순이면 violation)
ALTER TABLE publish_records DROP CONSTRAINT publish_records_channel_check;

-- 새 enum에 없는 모든 값(wordpress 등)을 self_hosted로 마이그
UPDATE publish_records SET channel='self_hosted'
WHERE channel NOT IN ('self_hosted', 'naver_blog', 'instagram', 'facebook', 'threads', 'youtube');

ALTER TABLE publish_records ADD CONSTRAINT publish_records_channel_check
  CHECK (channel IN ('self_hosted', 'naver_blog', 'instagram', 'facebook', 'threads', 'youtube'));
```

### (c) 중복 예약 방지
```sql
CREATE UNIQUE INDEX uniq_publish_self_hosted
  ON publish_records (content_id, language, channel)
  WHERE channel='self_hosted' AND status IN ('scheduled', 'published');
```
(`publishing` 상태는 enum에는 정의되어 있으나 실제 코드 사용처가 없는 dead 값이라 제외)

### (d) deploy webhook 큐 (debounce 용) — 먼저 생성
```sql
CREATE TABLE IF NOT EXISTS deploy_webhook_queue (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  enqueued_at TIMESTAMPTZ NOT NULL,
  last_fired_at TIMESTAMPTZ,
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT
);
ALTER TABLE deploy_webhook_queue DISABLE ROW LEVEL SECURITY;
```

### (e) pg_cron 잡 — 자동 발행 + 큐 enqueue
(d) 이후 정의. 동일 마이그레이션 파일 내 순서 보장.
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule('publish-self-hosted', '* * * * *', $$
  WITH transitioned AS (
    UPDATE publish_records
    SET status='published', published_at=NOW(), updated_at=NOW()
    WHERE status='scheduled'
      AND channel='self_hosted'
      AND scheduled_at <= NOW()
    RETURNING project_id
  )
  INSERT INTO deploy_webhook_queue (project_id, enqueued_at)
  SELECT DISTINCT project_id, NOW() FROM transitioned
  ON CONFLICT (project_id) DO UPDATE SET enqueued_at = EXCLUDED.enqueued_at;
$$);
```

### (f) webhook 호출 주체 — Next.js cron route + Vercel Cron
Supabase pg_net이 아닌 **Next.js API route + Vercel Cron 스케줄러** 채택.
이유: (1) 코드/로깅이 Next.js 쪽에 집중되어 디버깅 단순, (2) Vercel 배포 환경에 이미
cron 설정 가능, (3) Supabase Service Role 키로 큐 폴링 권한 명확.

- 신규 라우트: `src/app/api/cron/fire-deploy-webhooks/route.ts`
- 동작:
  1. `deploy_webhook_queue` 전체 폴링
  2. `last_fired_at IS NULL OR enqueued_at > last_fired_at`인 행 선택
  3. 각 행의 project_id로 `projects.published_site.deploy_webhook_url` 조회
  4. POST {} 호출, 성공 시 `last_fired_at=NOW(), retry_count=0` 갱신
  5. 실패 시 `retry_count++`, 3회 도달 시 `last_error` 기록 + 다음 시도 중단
- 인증: Vercel cron이 호출 시 자동 부여하는 `Authorization: Bearer {CRON_SECRET}` 검증
- `vercel.json`에 `{ "crons": [{ "path": "/api/cron/fire-deploy-webhooks", "schedule": "* * * * *" }] }` 등록

### (g) wp_credentials 정리
컬럼은 그대로 유지(데이터 손실 방지). 코드에서 사용처 모두 제거.
다음 정리 라운드에 `ALTER TABLE projects DROP COLUMN wp_credentials`.

---

## 외부 API 변경

`src/app/api/blog/by-project/[projectId]/posts/route.ts` 수정:

**Before** — `blog_contents.status='published'` 게이트
**After** — `publish_records.status='published' AND channel='self_hosted' AND language={lang}` 게이트

```typescript
const { data: records } = await adminClient
  .from('publish_records')
  .select(`
    id, content_id, language, published_at, scheduled_at, metadata,
    contents!inner(id, title, tags, project_id),
    blog_contents:content_id(seo_title, url_slug, meta_description,
                             primary_keyword, secondary_keywords, seo_details),
    base_articles:content_id(body, body_plain_text)
  `)
  .eq('contents.project_id', projectId)
  .eq('channel', 'self_hosted')
  .eq('language', lang)
  .eq('status', 'published')
  .order('published_at', { ascending: false });

// 번역본은 lang≠ko일 때 translations 테이블에서 별도 조회 (기존 로직 유지)
```

응답 형식은 기존 호환 유지 (`{posts: [...]}`).
`published_at`은 `publish_records.published_at` 사용.

**다국어 fallback 정책 — 번역 본문 없을 시 해당 글 응답에서 제외**
- `lang=ko`: `base_articles.body` 그대로 노출
- `lang≠ko`: `translations`(content_id, language={lang}, channel_type='blog', status='completed')에 매칭되는 R2 본문이 있으면 노출
- 매칭 없으면 해당 글은 응답 배열에서 **skip** (한국어 본문을 그대로 노출하지 않음 — SEO/사용자 신뢰 손상 방지)
- dflo build:blog는 빈 결과를 받으면 해당 언어 페이지를 생성하지 않음 (idempotent)

---

## UI 변경

### (a) 프로젝트 설정 — PublishedSiteSection (신규)
`src/components/project/published-site-section.tsx`

- 활성화 토글
- 이름, 도메인, domain_prefix 입력
- 활성 언어 체크박스 × 8 (ko/en/th/vi/ja/zh/ms/id) — 각 언어별 path 인풋
- deploy_webhook_url 입력 (옵션)
- 자동 생성된 외부 fetch URL 미리보기 (읽기 전용)
- 저장 시 `projects.published_site` 업데이트

### (b) 콘텐츠 편집기 — 내부 블로그 탭
- 파일 리네이밍: `src/components/content/wordpress-panel.tsx` → `internal-blog-panel.tsx`
- 채널 탭 표시: "WordPress" → "내부 블로그" (아이콘 `Globe`)
- 패널 내부 SEO 4단계 워크플로우 유지
- LanguageSelector — `published_site.active_languages`만 표시
- WP 자격증명 입력 칸 제거
- 우측 하단 "발행" → "예약 발행" 버튼 + 다이얼로그(언어·시각)
- 발행 상태 뱃지: 언어별로 표시 (KR 예약 / TH 발행 등)

**상태 fetch 정책 — 패널 마운트 1회 + 발행 액션 후 무효화**
- 콘텐츠 패널 진입 시 `publish_records`(content_id, channel='self_hosted') 1회 fetch
- 결과는 zustand store(`project-store` 내 `publishRecords` 슬라이스)에 캐시
- 예약 발행/취소 등 mutation 후 해당 콘텐츠 행만 재조회 (선택적 무효화)
- 실시간 Supabase Realtime subscribe는 사용 안 함 (YAGNI — 본인이 발행 액션 트리거하므로 stale 위험 낮음)

### (c) 발행 큐 — self_hosted 카드
- `src/components/publish/channel-cards.tsx`의 wordpress 케이스 → self_hosted로 교체
- 카드 내용: 도메인 + 언어별 (예약 N건 · 발행 M건) + "일괄 예약 +" 버튼
- `published_site=null` 또는 `enabled=false`면 비활성 상태로 "사이트 등록 안 됨" 표시

### (d) 일괄 예약 마법사 — 신규 다이얼로그
`src/components/publish/bulk-schedule-dialog.tsx`

5단계:
1. 콘텐츠 선택 (전체/카테고리 필터, 체크박스)
2. 언어 선택 (active_languages 중)
3. 분산 규칙 (시작일, 종료일, 주당 횟수, 요일, 시간대, 언어별 시차)
4. 캘린더 미리보기 (drag로 개별 시각 조정)
5. 확정 → `publish_records` 일괄 insert (status='scheduled')

**분산 알고리즘** (`src/lib/schedule-distribution.ts` 신규):
- 입력: 콘텐츠 N개, 언어 L개, 시작일, 종료일, 주당 K회, 요일 마스크, 시간대 풀, 언어별 시차
- 출력: `Array<{ content_id, language, scheduled_at }>`
- 규칙: 라운드로빈으로 시간 슬롯에 (콘텐츠, 언어) 페어 배분. 종료일 미입력 시 N×L÷K주 자동 계산
- 단위 테스트 가능한 순수 함수

---

## dflo 사이드 작업 (v4)

### (a) `v4/scripts/build-blog.mjs` 신규
```javascript
// 실행 시점: vite build 완료 후 (dist/ 가 이미 생성된 상태)
// vite는 dist를 매 빌드 시 클린하므로, build-blog는 vite 이후에 dist에 덧붙이는 방식
//
// 1. ContentFlow API 호출 (ko, th)
// 2. 글마다 dist/{path}/{slug}/index.html 생성
// 3. SPA index.html 베이스 + 메타/콘텐츠 주입:
//    - <title>{글 제목}</title>
//    - <meta name="description" content="...">
//    - <link rel="alternate" hreflang="ko" href="...">
//    - <link rel="alternate" hreflang="th" href="...">
//    - <meta property="og:*">
//    - <script type="application/ld+json">{Article schema}</script>
//    - <article>{body_html}</article>  ← 본문 인라인 (봇 대응)
//
// API 실패 시: 빈 결과로 처리 (해당 언어 페이지 미생성). 빌드 자체는 성공.
// 직전 배포에 존재하던 페이지는 새 배포에 없어지므로, ContentFlow 다운타임 중
// 배포가 일어나면 일시적으로 페이지 누락 가능 — 모니터링 + Railway 직전 배포 롤백으로 대응.
```

### (b) `v4/package.json` 빌드 스크립트 확장
```json
"build": "tsc -b && npm run build:i18n && vite build && npm run build:blog",
"build:blog": "node scripts/build-blog.mjs"
```

### (c) react-router 라우트 추가
`v4/src/...` 에 4개 라우트:
- `/blog` (글 목록, ko)
- `/blog/:slug` (글 상세, ko, CSR 폴백)
- `/th/blog` (글 목록, th)
- `/th/blog/:slug` (글 상세, th, CSR 폴백)

CSR 폴백은 정적 HTML이 없는 새로 발행된 글이 webhook 트리거 전 잠깐 접근될 때를 위한 안전망.

### (d) 환경변수 — ContentFlow API base URL
`v4/.env.production`에 `VITE_CONTENTFLOW_API` 추가.

### (e) Railway 설정
사용자가 Railway 콘솔에서 deploy webhook URL 발급 → ContentFlow 프로젝트 설정에 등록.

---

## 에지 케이스 / 오류 처리

| 케이스 | 처리 |
|--------|------|
| `published_site=null` 또는 `enabled=false` | 발행 큐 카드 비활성, "사이트 등록 안 됨" 표시 |
| 활성 언어 0개 | 일괄 예약 마법사 차단 |
| 동일 (content, language) 중복 예약 | DB unique index로 차단 (위 c) |
| 과거 시각으로 예약 | cron이 즉시 published로 전환 |
| webhook 호출 실패 | retry 3회, 실패 시 last_error 기록 + UI 알림 |
| 발행 후 콘텐츠 수정 | 발행 큐에 "재배포" 수동 버튼, 또는 status를 다시 scheduled로 |
| 콘텐츠 삭제 | publish_records FK cascade. dflo 다음 빌드에서 자동 제외 |
| dflo build:blog 실패 | Railway 빌드 실패 → 이전 배포 유지. ContentFlow는 정상 |
| ContentFlow API 다운 시 dflo 빌드 | build:blog가 빈 결과 반환 시 이전 정적 파일 유지 (idempotent) |

---

## 테스트 전략

### DB 마이그레이션
- idempotent: 재실행해도 안전 (`IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`)
- 기존 wordpress 행 변환 검증
- pg_cron 잡 등록 확인

### 테스트 인프라
ContentFlow는 이미 `vitest.config.ts`가 있어 vitest 사용. 별도 셋업 불필요.

### 분산 알고리즘 단위 테스트
`src/lib/schedule-distribution.test.ts`:
- 5콘텐츠 × 2언어 × 주3회 → 정확히 10개 슬롯
- 요일 마스크 준수
- 언어별 시차 적용
- 시작일 < 현재면 즉시 발행 처리

### API 회귀 테스트
- 기존 응답 형식 유지 확인 (`{posts: [...]}` 키)
- publish_records 기반 전환 후 published 글만 노출
- 다국어 응답 (`?lang=th`)

### dflo build:blog 통합 테스트
- 글 0개 → 빈 빌드 (실패 X)
- 글 1개 → HTML 1개 생성, 메타·schema 검증
- 글 N개 (ko+th) → 정적 HTML N×2개 생성

### E2E (수동)
1. 사이트 등록 → 콘텐츠 1개 ko/th 발행 → 시각 5분 후 → cron 동작 확인
2. webhook 호출 확인 → Railway 재빌드 확인
3. `dr187growup.com/test/blog/{slug}` 정적 HTML 노출 확인
4. 구글봇 view-source로 메타·본문 인라인 확인

---

## Out of Scope (이 spec 범위 외)

- N블로그 다국어 발행 (수동으로 처리한다고 사용자 명시)
- Phase B: 70개 × 2언어 = 140 SEO 블로그 글 일괄 제작 (별도 spec)
- ComfyUI 이미지 생성 (Phase B)
- VN/EN 활성화 (토글만 켜면 되지만 콘텐츠는 별도 작업)
- `projects.wp_credentials` 컬럼 DROP (다음 정리 라운드)
- 사이트 멀티 환경(production/staging) — 현재는 domain_prefix 슬롯으로 처리
- 사이트 멀티 인스턴스(프로젝트당 사이트 N개) — YAGNI

---

## Migration Order (구현 시 순서)

**Milestone 1 — DB + API (백엔드 토대)**
1. DB 마이그레이션 파일 작성 + 적용 (dev → prod)
2. 외부 API 라우트 수정 (publish_records 기반, 다국어 fallback skip 정책 포함)

**Milestone 2 — UI (편집·발행 흐름)**
3. 프로젝트 설정 PublishedSiteSection 컴포넌트
4. WordPress 패널 → 내부 블로그 패널 리네이밍 + 발행 로직 교체
5. 발행 큐 self_hosted 카드 + 단건 예약
6. 일괄 예약 마법사 + 분산 알고리즘 + vitest 테스트

**Milestone 3 — Cron + dflo 연동**
7. Next.js cron route(`/api/cron/fire-deploy-webhooks`) + Vercel cron 등록
8. dflo v4 build:blog 스크립트 + 라우트 추가

**Milestone 4 — 검증·정리**
9. E2E 검증 (테스트 도메인 `/test`에서)
10. WP 발행 라우트·UI 잔존 코드 제거

---

## Phase B 예고 (이어질 작업)

Phase A 완료 후 별도 spec으로:
- 70개 콘텐츠 한국어 SEO 블로그 글 작성 (제목·메타·본문·내부링크·schema)
- 70개 콘텐츠 태국어 SEO 블로그 글 작성 (이미 base 번역 있음 — SEO 메타·내부링크 추가)
- ComfyUI 워크플로우/모델 결정 → 글당 3~5장 이미지 생성 = 200~350장
- 일괄 예약 발행 (Phase A 마법사 활용) — 주 5회, 약 4~6주 분산
