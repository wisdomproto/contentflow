# Self-Hosted Blog Publishing — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ContentFlow에서 사용자의 본진 사이트(`https://www.dr187growup.com`)로 다국어(KR/TH) 블로그 글을 예약 발행하는 시스템 구축. WordPress 채널을 "내부 블로그(self_hosted)"로 교체.

**Architecture:** ContentFlow `publish_records`를 마스터 상태로, Supabase `pg_cron`이 매 1분 `scheduled→published` 전환. 별도 Next.js cron route(Vercel Cron 트리거)가 `deploy_webhook_queue`를 폴링해 Railway deploy webhook을 debounce 호출. dflo v4(Vite SPA)는 빌드 타임 prerender 스크립트로 ContentFlow API에서 글을 fetch해 정적 HTML 생성 (SEO 풀파워).

**Tech Stack:** Next.js 16, Supabase Postgres (`pg_cron`), Vercel Cron, `@google/genai` (이미 설치), `@aws-sdk/client-s3` (R2, 이미 설치), Vitest, dflo는 Vite + React 19 + react-router-dom v7

**Spec:** `docs/superpowers/specs/2026-05-18-self-hosted-blog-publishing-design.md`

---

## File Structure

### ContentFlow — New Files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/2026-05-18-self-hosted-channel.sql` | DB 마이그레이션 (컬럼·enum·테이블·cron·인덱스) |
| `src/components/project/published-site-section.tsx` | 프로젝트 설정 사이트 등록 폼 |
| `src/components/content/internal-blog-panel.tsx` | 콘텐츠 편집기 내부 블로그 패널 (WP 패널 rename) |
| `src/components/publish/self-hosted-card.tsx` | 발행 큐 self_hosted 채널 카드 |
| `src/components/publish/bulk-schedule-dialog.tsx` | 일괄 예약 마법사 (5 stages) |
| `src/lib/schedule-distribution.ts` | 분산 알고리즘 (순수 함수) |
| `src/lib/__tests__/schedule-distribution.test.ts` | vitest 단위 테스트 |
| `src/app/api/cron/fire-deploy-webhooks/route.ts` | Vercel Cron이 호출하는 webhook 발사 라우트 |
| `vercel.json` | Vercel cron 등록 |

### ContentFlow — Modified Files
| File | Change |
|------|--------|
| `src/app/api/blog/by-project/[projectId]/posts/route.ts` | `publish_records` 기반 + 다국어 fallback skip |
| `src/components/publish/channel-cards.tsx` | wordpress 케이스 → self_hosted 카드 import |
| `src/components/content/content-tabs.tsx` | 탭 이름·아이콘 변경, channelKind 'wordpress'→'self_hosted' |
| `src/stores/project-store.ts` | `publishRecords` 슬라이스, `published_site` 상태 |
| `src/types/database.ts` | `PublishedSite` 타입, channel enum 업데이트 |

### ContentFlow — Removed Files
| File | Reason |
|------|--------|
| `src/app/api/publish/wordpress/route.ts` | WP REST 발행 제거 |
| `src/components/content/wordpress-panel.tsx` | `internal-blog-panel.tsx`로 rename |

### dflo v4 — New / Modified Files
| File | Change |
|------|--------|
| `v4/scripts/build-blog.mjs` | 신규 — ContentFlow API fetch → 정적 HTML 생성 |
| `v4/package.json` | build 스크립트에 `build:blog` 추가 |
| `v4/src/pages/Blog/BlogList.tsx` | 신규 — 글 목록 페이지 (lang prop) |
| `v4/src/pages/Blog/BlogPost.tsx` | 신규 — 글 상세 페이지 (CSR 폴백) |
| `v4/src/main.tsx` 또는 라우터 파일 | `<Route>` 4개 추가 |
| `v4/.env.production` | `VITE_CONTENTFLOW_API` 추가 |

---

## Chunk 1: DB + API 토대 (Milestone 1)

### Task 1: Supabase 마이그레이션 파일 작성

**Files:**
- Create: `contentflow/supabase/migrations/2026-05-18-self-hosted-channel.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

전체 파일 내용:
```sql
-- Self-Hosted Blog Publishing (Phase A)
-- See: docs/superpowers/specs/2026-05-18-self-hosted-blog-publishing-design.md

-- (a) projects.published_site JSONB 슬롯
ALTER TABLE projects ADD COLUMN IF NOT EXISTS published_site JSONB DEFAULT NULL;

-- (b) publish_records.channel enum 교체 (wordpress 제거, self_hosted 추가)
ALTER TABLE publish_records DROP CONSTRAINT IF EXISTS publish_records_channel_check;
ALTER TABLE publish_records ADD CONSTRAINT publish_records_channel_check
  CHECK (channel IN ('self_hosted', 'naver_blog', 'instagram', 'facebook', 'threads', 'youtube'));

-- 기존 wordpress 행이 있다면 self_hosted로 이전 (187 프로젝트엔 거의 없을 가능성)
UPDATE publish_records SET channel='self_hosted' WHERE channel='wordpress';

-- (c) 중복 예약 방지
CREATE UNIQUE INDEX IF NOT EXISTS uniq_publish_self_hosted
  ON publish_records (content_id, language, channel)
  WHERE channel='self_hosted' AND status IN ('scheduled', 'published');

-- (d) deploy_webhook_queue 테이블 (debounce 용) — 먼저 생성
CREATE TABLE IF NOT EXISTS deploy_webhook_queue (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  enqueued_at TIMESTAMPTZ NOT NULL,
  last_fired_at TIMESTAMPTZ,
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT
);
ALTER TABLE deploy_webhook_queue DISABLE ROW LEVEL SECURITY;

-- (e) pg_cron 잡 — 자동 발행 + 큐 enqueue
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 동일 잡 이미 존재 시 삭제 후 재등록 (idempotent)
SELECT cron.unschedule('publish-self-hosted')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='publish-self-hosted');

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

- [ ] **Step 2: 마이그레이션 파일 syntax 검증 (적용은 Task 2에서)**

`contentflow/` 디렉토리에서:
```bash
node -e "const fs=require('fs');const sql=fs.readFileSync('supabase/migrations/2026-05-18-self-hosted-channel.sql','utf8');console.log('Length:',sql.length,'chars');console.log('Statements:',sql.split(';').filter(s=>s.trim()).length);"
```
Expected: `Length: 약 1500~1800 chars`, `Statements: 8~10`

- [ ] **Step 3: Commit**

```bash
git add contentflow/supabase/migrations/2026-05-18-self-hosted-channel.sql
git commit -m "feat(db): self-hosted channel migration (publish_records + cron + queue)"
```

---

### Task 2: 마이그레이션을 Supabase에 적용

**Files:** (수정 없음 — Supabase MCP `apply_migration` 사용)

- [ ] **Step 1: 마이그레이션 적용**

Supabase MCP 도구 `apply_migration` 호출. `name`: `2026-05-18-self-hosted-channel`, `query`: Task 1 Step 1의 SQL 전체.

또는 Supabase Studio SQL Editor에서 직접 실행.

- [ ] **Step 2: 적용 검증 — 컬럼/제약/cron 잡 확인**

Supabase MCP `execute_sql`:
```sql
-- published_site 컬럼 존재 확인
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='projects' AND column_name='published_site';

-- channel 제약 확인
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conname='publish_records_channel_check';

-- pg_cron 잡 등록 확인
SELECT jobname, schedule FROM cron.job WHERE jobname='publish-self-hosted';

-- deploy_webhook_queue 테이블 존재
SELECT table_name FROM information_schema.tables WHERE table_name='deploy_webhook_queue';
```

Expected:
- `published_site | jsonb`
- 제약에 `self_hosted` 포함, `wordpress` 미포함
- 잡 1행, schedule `* * * * *`
- 테이블 1행

- [ ] **Step 3: cron 잡 본문을 즉시 1회 실행 — 동작 확인**

`cron.alter_job(same schedule)`은 no-op이라 즉시 실행을 트리거하지 않음. 잡 SQL 본문을 직접 실행하여 검증:

```sql
WITH transitioned AS (
  UPDATE publish_records SET status='published', published_at=NOW(), updated_at=NOW()
  WHERE status='scheduled' AND channel='self_hosted' AND scheduled_at <= NOW()
  RETURNING project_id
)
INSERT INTO deploy_webhook_queue (project_id, enqueued_at)
SELECT DISTINCT project_id, NOW() FROM transitioned
ON CONFLICT (project_id) DO UPDATE SET enqueued_at = EXCLUDED.enqueued_at;
```

Expected: 에러 없음. 187 프로젝트엔 scheduled 행이 없어서 transitioned 0건 정상.

- [ ] **Step 4: Commit (마이그레이션 적용 사실 기록 — 코드 변경 없음)**

`git status`로 변경 없음 확인. 별도 commit 불필요.

---

### Task 3: TypeScript 타입 업데이트

**Files:**
- Modify: `contentflow/src/types/database.ts`

- [ ] **Step 1: PublishedSite 타입 + channel enum 업데이트**

`contentflow/src/types/database.ts` 상단에서 channel 관련 타입 검색:
```bash
grep -n "channel\|wordpress\|self_hosted" contentflow/src/types/database.ts
```

`PublishRecord`(또는 publish_records 매핑 타입)에서 channel 유니온 타입을:
```typescript
// before: 'wordpress' | 'naver_blog' | 'instagram' | 'facebook' | 'threads' | 'youtube'
// after:
channel: 'self_hosted' | 'naver_blog' | 'instagram' | 'facebook' | 'threads' | 'youtube';
```

파일 적당한 위치(예: `Project` 인터페이스 근처)에 추가:
```typescript
export interface PublishedSite {
  name: string;
  domain: string;
  domain_prefix?: string;
  active_languages: string[];      // e.g. ['ko', 'th']
  language_paths: Record<string, string>;  // e.g. { ko: '/blog', th: '/th/blog' }
  deploy_webhook_url?: string;
  enabled: boolean;
}
```

`Project` 인터페이스에 추가:
```typescript
published_site?: PublishedSite | null;
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
cd contentflow && npx tsc --noEmit 2>&1 | head -40
```

Expected: 새 타입 관련 에러 없음. 단, **WordPress 패널 등 'wordpress' 채널을 참조하는 기존 코드에서 에러 발생할 것** — 이는 Chunk 2에서 정리될 예정이므로 일단 무시.

Windows + PowerShell이면:
```powershell
npx tsc --noEmit 2>&1 | Select-String "wordpress|channel" | Out-File -Encoding utf8 wp-errors.txt
```
Bash가 가능하면 (Git Bash 또는 WSL):
```bash
npx tsc --noEmit 2>&1 | grep -iE "wordpress|channel" > wp-errors.txt
```

`wp-errors.txt`는 작업 디렉토리에 저장. Chunk 2에서 모두 해결되면 삭제(`rm wp-errors.txt`). `.gitignore`되어 있지 않으므로 commit 전 삭제 또는 별도 .gitignore 추가.

- [ ] **Step 3: Commit**

```bash
git add contentflow/src/types/database.ts
git commit -m "feat(types): add PublishedSite, switch channel enum to self_hosted"
```

---

### Task 4: 외부 API 라우트 — publish_records 기반으로 전환

**Files:**
- Modify: `contentflow/src/app/api/blog/by-project/[projectId]/posts/route.ts`

- [ ] **Step 1: 기존 라우트 백업 (참고용)**

```bash
cp contentflow/src/app/api/blog/by-project/[projectId]/posts/route.ts /tmp/posts-route-before.ts
```

- [ ] **Step 2: 라우트 전체 재작성**

`contentflow/src/app/api/blog/by-project/[projectId]/posts/route.ts` 전체 내용을 다음으로 교체:

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Service-role client bypasses RLS — only used for public-read endpoints
// that filter explicitly to status='published' on publish_records.
const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const { searchParams } = new URL(req.url)
  const lang = searchParams.get('lang') || 'ko'

  if (!projectId) {
    return Response.json({ error: 'projectId required' }, { status: 400 })
  }

  // Fetch published self_hosted records for this project+lang
  const { data: records, error: recErr } = await adminClient
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
    .order('published_at', { ascending: false })

  if (recErr) {
    return Response.json({ error: recErr.message }, { status: 500 })
  }
  if (!records || records.length === 0) {
    return Response.json({ posts: [] }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    })
  }

  // Non-Korean: fetch translations for body override
  const contentIds = records.map((r: any) => r.content_id)
  let translations: any[] = []
  if (lang !== 'ko') {
    const { data: trData } = await adminClient
      .from('translations')
      .select('content_id, language, channel_type, status, title, body, cards_json, seo_title, seo_description')
      .in('content_id', contentIds)
      .eq('language', lang)
      .eq('channel_type', 'blog')
      .eq('status', 'completed')
    translations = trData || []
  }

  // Cards
  const blogContentIds = records
    .map((r: any) => r.blog_contents?.id)
    .filter(Boolean)
  const { data: cards } = blogContentIds.length
    ? await adminClient
        .from('blog_cards')
        .select('id, blog_content_id, card_type, content, sort_order')
        .in('blog_content_id', blogContentIds)
        .order('sort_order', { ascending: true })
    : { data: [] as any[] }

  // Build response — skip non-ko records without translation
  const result = records
    .map((r: any) => {
      const tr = lang !== 'ko' ? translations.find((t) => t.content_id === r.content_id) : null
      // Skip if non-ko and no translation (avoid leaking Korean body)
      if (lang !== 'ko' && !tr?.body) return null

      const bc = r.blog_contents
      const postCards = (cards || []).filter((c: any) => c.blog_content_id === bc?.id)
      return {
        id: r.id,
        content_id: r.content_id,
        slug: bc?.url_slug || r.content_id,
        title: tr?.title || bc?.seo_title || r.contents?.title,
        meta_description: tr?.seo_description || bc?.meta_description || '',
        primary_keyword: bc?.primary_keyword || null,
        secondary_keywords: bc?.secondary_keywords || [],
        tags: r.contents?.tags || [],
        language: r.language,
        published_at: r.published_at,
        body_html: tr?.body || r.base_articles?.body || '',
        cards: tr?.cards_json || postCards,
        global_style: bc?.seo_details?.globalStyle || null,
      }
    })
    .filter(Boolean)

  return Response.json({ posts: result }, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
  })
}
```

- [ ] **Step 3: PostgREST embed 해석 검증 — 200 OK 확인**

PostgREST는 `publish_records → contents`(inner), `publish_records → blog_contents`(by content_id FK), `publish_records → base_articles`(by content_id FK) 세 임베드를 동시에 해석해야 함. 두 FK가 같은 `content_id` 키를 공유해 모호성 발생 가능성. 응답이 500이면 임베드 힌트(`!fk_name`) 필요.

```bash
# dev 서버가 이미 떠있다면 그대로, 아니면:
cd contentflow && npm run dev
```

다른 터미널에서:
```bash
# 187 프로젝트 ID 사용
curl -s -w "\nHTTP %{http_code}\n" "http://localhost:3001/api/blog/by-project/6cc3c9c6-1718-4097-b7a0-0f95ae74d913/posts?lang=ko"
curl -s -w "\nHTTP %{http_code}\n" "http://localhost:3001/api/blog/by-project/6cc3c9c6-1718-4097-b7a0-0f95ae74d913/posts?lang=th"
```

Expected: 둘 다 `HTTP 200` + `{"posts":[]}`.

**500이면**: 응답 본문에 `Could not embed ... ambiguous`가 보일 것. 그 경우 라우트의 select 절을 다음으로 수정 (FK 제약 이름은 `\d publish_records` 또는 `information_schema.referential_constraints`로 확인):
```typescript
blog_contents!publish_records_content_id_fkey(...)
base_articles!publish_records_content_id_fkey(...)
```
또는 FK 이름이 같으면 자식 테이블 쪽 FK 사용:
```typescript
blog_contents!blog_contents_content_id_fkey(...)
base_articles!base_articles_content_id_fkey(...)
```

- [ ] **Step 4: Commit**

```bash
git add contentflow/src/app/api/blog/by-project/
git commit -m "feat(api): switch blog posts API to publish_records (self_hosted gate, multilingual skip)"
```

---

### Task 5: API 회귀 통합 테스트 — vitest

**Files:**
- Create: `contentflow/src/app/api/blog/by-project/__tests__/posts.integration.test.ts`

- [ ] **Step 1: vitest 설정 확인**

```bash
cd contentflow && cat vitest.config.ts
```

Expected: 설정 파일 존재. 없으면 다음 step에서 추가 — 그러나 spec에서 이미 있다고 확인됨.

- [ ] **Step 2: 통합 테스트 작성**

```typescript
// src/app/api/blog/by-project/__tests__/posts.integration.test.ts
import { describe, it, expect } from 'vitest'

const BASE = 'http://localhost:3001'
const PROJECT_ID = '6cc3c9c6-1718-4097-b7a0-0f95ae74d913' // 187 project

describe('GET /api/blog/by-project/[id]/posts', () => {
  it('returns valid envelope for ko', async () => {
    const res = await fetch(`${BASE}/api/blog/by-project/${PROJECT_ID}/posts?lang=ko`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('posts')
    expect(Array.isArray(json.posts)).toBe(true)
  })

  it('returns valid envelope for th', async () => {
    const res = await fetch(`${BASE}/api/blog/by-project/${PROJECT_ID}/posts?lang=th`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.posts)).toBe(true)
  })

  it('returns 400 without projectId via routing — checked by Next.js', async () => {
    // Next.js routing prevents empty projectId path. We just ensure unknown id returns empty list, not error.
    const res = await fetch(`${BASE}/api/blog/by-project/00000000-0000-0000-0000-000000000000/posts?lang=ko`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.posts).toEqual([])
  })

  it.todo('skips non-ko records without translation — seed fixture, then verify TH response contains only posts with translation.body')
})
```

- [ ] **Step 3: 테스트 실행**

dev 서버가 떠있는 상태에서:
```bash
cd contentflow && npx vitest run src/app/api/blog/by-project/__tests__/posts.integration.test.ts
```

Expected: 3 tests passed, 1 todo (skip 정책 검증은 Chunk 2/3에서 seed 데이터 만든 뒤 본 테스트로 전환).

- [ ] **Step 4: Commit**

```bash
git add contentflow/src/app/api/blog/by-project/__tests__/posts.integration.test.ts
git commit -m "test(api): integration tests for publish_records-backed posts API"
```

---

**Chunk 1 완료 검증:**

- [ ] DB 마이그레이션 적용됨 (published_site 컬럼, channel enum, deploy_webhook_queue 테이블, pg_cron 잡)
- [ ] 외부 API 라우트가 publish_records 기반으로 전환 + 다국어 fallback skip 정책 동작
- [ ] 187 프로젝트 KR/TH 응답이 빈 배열로 정상 (아직 self_hosted 행 없음)
- [ ] 통합 테스트 3건 통과 + 1건 todo
- [ ] 4개 commit 누적 (마이그레이션 / 타입 / API / 테스트)

→ Chunk 2 (UI)로 진행

---

## Chunk 2: UI — 사이트 등록 + 내부 블로그 패널 + 발행 큐 + 일괄 예약 마법사 (Milestone 2)

### Task 6: project-store에 published_site + publishRecords 슬라이스

**Files:**
- Modify: `contentflow/src/stores/project-store.ts`

- [ ] **Step 1: store 현재 모양 파악**

```bash
grep -nE "createOrUpdateBaseArticle|wp_credentials|publish_records|getBaseArticle" contentflow/src/stores/project-store.ts | head -20
```

기존 패턴(`getX`, `createOrUpdateX` 액션, supabase 미러링) 확인 후 그대로 따른다.

- [ ] **Step 2: store에 새 필드/액션 추가**

다음 변경을 store에 적용:

```typescript
// types/database.ts의 PublishedSite, PublishRecord 임포트
import type { PublishedSite, PublishRecord } from '@/types/database';

interface ProjectStoreState {
  // ... 기존 ...
  publishRecords: PublishRecord[];  // 현재 선택 프로젝트의 self_hosted records
}

interface ProjectStoreActions {
  // (a) 사이트 등록
  updatePublishedSite: (projectId: string, site: PublishedSite | null) => Promise<void>;
  // (b) publish_records — 패널 진입 시 콘텐츠 단위로 fetch
  fetchPublishRecordsForContent: (contentId: string) => Promise<void>;
  getPublishRecordsForContent: (contentId: string) => PublishRecord[];
  // (c) 단건 예약
  schedulePublish: (input: {
    contentId: string;
    projectId: string;
    language: string;
    channel: 'self_hosted';
    scheduledAt: string;  // ISO
  }) => Promise<PublishRecord>;
  // (d) 예약 취소
  cancelPublish: (recordId: string) => Promise<void>;
  // (e) 일괄 insert (마법사용) — onConflict skip
  bulkSchedulePublish: (rows: Array<{
    contentId: string; projectId: string; language: string;
    channel: 'self_hosted'; scheduledAt: string;
  }>) => Promise<{ inserted: number; skipped: number }>;
  // (f) 발행 큐 카드용 — 프로젝트 단위 카운트
  fetchPublishCountsByLanguage: (projectId: string) => Promise<Record<string, { scheduled: number; published: number }>>;
}
```

각 액션 구현 명세:

- `updatePublishedSite`:
  ```typescript
  const { error } = await supabase.from('projects')
    .update({ published_site: site, updated_at: new Date().toISOString() })
    .eq('id', projectId);
  if (error) throw error;
  set((s) => ({ projects: s.projects.map((p) => p.id === projectId ? { ...p, published_site: site } : p) }));
  ```

- `fetchPublishRecordsForContent`:
  ```typescript
  const { data } = await supabase.from('publish_records').select('*')
    .eq('content_id', contentId).eq('channel', 'self_hosted');
  set((s) => ({
    publishRecords: [
      ...s.publishRecords.filter((r) => r.content_id !== contentId || r.channel !== 'self_hosted'),
      ...(data || []),
    ],
  }));
  ```

- `getPublishRecordsForContent`: `get().publishRecords.filter((r) => r.content_id === contentId && r.channel === 'self_hosted')` (단순 selector, store 액션이 아닌 selector로 빼도 됨)

- `schedulePublish`:
  ```typescript
  const row = {
    content_id: input.contentId,
    project_id: input.projectId,
    language: input.language,
    channel: 'self_hosted',
    status: 'scheduled' as const,
    scheduled_at: input.scheduledAt,
  };
  const { data, error } = await supabase.from('publish_records')
    .upsert(row, { onConflict: 'content_id,language,channel', ignoreDuplicates: false })
    .select().single();
  if (error) throw error;
  set((s) => ({ publishRecords: [...s.publishRecords.filter((r) => r.id !== data.id), data] }));
  return data;
  ```

- `cancelPublish`: `.delete().eq('id', recordId)` + 로컬 슬라이스에서 제거

- `bulkSchedulePublish` — **uniq_publish_self_hosted partial index 충돌 정책**:
  Postgres unique partial index는 PostgREST의 `onConflict`로 자동 지정 불가하므로, **사전 dedupe + upsert 패턴** 사용:
  ```typescript
  // 1) 기존 행 조회로 중복 검출
  const contentIds = [...new Set(rows.map((r) => r.contentId))];
  const { data: existing } = await supabase.from('publish_records')
    .select('content_id, language')
    .in('content_id', contentIds)
    .eq('channel', 'self_hosted')
    .in('status', ['scheduled', 'published']);
  const existingKey = new Set((existing || []).map((e) => `${e.content_id}::${e.language}`));

  // 2) 중복 제외하고 insert
  const toInsert = rows.filter((r) => !existingKey.has(`${r.contentId}::${r.language}`)).map((r) => ({
    content_id: r.contentId,
    project_id: r.projectId,
    language: r.language,
    channel: 'self_hosted',
    status: 'scheduled' as const,
    scheduled_at: r.scheduledAt,
  }));
  if (toInsert.length === 0) return { inserted: 0, skipped: rows.length };
  const { data, error } = await supabase.from('publish_records').insert(toInsert).select();
  if (error) throw error;
  set((s) => ({ publishRecords: [...s.publishRecords, ...(data || [])] }));
  return { inserted: data?.length || 0, skipped: rows.length - (data?.length || 0) };
  ```
  사용자 경험: 다이얼로그에서 "5건 예약, 2건 스킵(이미 예약/발행됨)" 식 표시.

- `fetchPublishCountsByLanguage`:
  ```typescript
  const { data } = await supabase.from('publish_records').select('language, status')
    .eq('project_id', projectId).eq('channel', 'self_hosted');
  const counts: Record<string, { scheduled: number; published: number }> = {};
  for (const r of data || []) {
    if (!counts[r.language]) counts[r.language] = { scheduled: 0, published: 0 };
    if (r.status === 'scheduled') counts[r.language].scheduled++;
    else if (r.status === 'published') counts[r.language].published++;
  }
  return counts;
  ```

`debouncedWrite()` 패턴은 mutation이 명시적 액션이라 불필요.

- [ ] **Step 3: 타입체크**

```bash
cd contentflow && npx tsc --noEmit 2>&1 | grep -E "stores/project-store|publishRecords|published_site" | head -20
```
Expected: 새 액션·필드 관련 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add contentflow/src/stores/project-store.ts
git commit -m "feat(store): publish records slice + published_site mutation actions"
```

---

### Task 7: PublishedSiteSection — 프로젝트 설정 사이트 등록 폼

**Files:**
- Create: `contentflow/src/components/project/published-site-section.tsx`
- Modify: 프로젝트 설정 페이지 (해당 페이지 위치는 `src/app/(authenticated)/settings/...` 또는 `src/components/project/project-settings-*.tsx` 중 하나 — `grep -r "project-settings" src/` 로 확인)

- [ ] **Step 1: 컴포넌트 작성**

`src/components/project/published-site-section.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import type { PublishedSite } from '@/types/database';

const ALL_LANGS = [
  { code: 'ko', label: '한국어' },
  { code: 'th', label: 'ไทย' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'ms', label: 'Melayu' },
  { code: 'id', label: 'Indonesia' },
];

interface Props { projectId: string }

export function PublishedSiteSection({ projectId }: Props) {
  const { projects, updatePublishedSite } = useProjectStore();
  const project = projects.find((p) => p.id === projectId);
  const initial: PublishedSite = project?.published_site || {
    name: '',
    domain: '',
    domain_prefix: '',
    active_languages: ['ko'],
    language_paths: { ko: '/blog' },
    deploy_webhook_url: '',
    enabled: false,
  };

  const [site, setSite] = useState<PublishedSite>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project?.published_site) setSite(project.published_site);
  }, [project?.id]);

  function toggleLang(code: string) {
    const active = site.active_languages.includes(code);
    const next_active = active
      ? site.active_languages.filter((l) => l !== code)
      : [...site.active_languages, code];
    const next_paths = { ...site.language_paths };
    if (!active && !next_paths[code]) {
      next_paths[code] = code === 'ko' ? '/blog' : `/${code}/blog`;
    }
    setSite({ ...site, active_languages: next_active, language_paths: next_paths });
  }

  function updatePath(code: string, path: string) {
    setSite({ ...site, language_paths: { ...site.language_paths, [code]: path } });
  }

  async function handleSave() {
    setSaving(true);
    await updatePublishedSite(projectId, site);
    setSaving(false);
  }

  return (
    <section className="border border-border rounded-lg p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">발행 사이트</h3>
        <Switch checked={site.enabled} onCheckedChange={(v) => setSite({ ...site, enabled: v })} />
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">사이트 이름</label>
          <Input value={site.name} onChange={(e) => setSite({ ...site, name: e.target.value })} placeholder="dflo" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">도메인 (프로토콜 포함)</label>
          <Input value={site.domain} onChange={(e) => setSite({ ...site, domain: e.target.value })} placeholder="https://www.dr187growup.com" />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">개발용 path prefix (옵션, 작업 끝나면 빈값)</label>
        <Input value={site.domain_prefix || ''} onChange={(e) => setSite({ ...site, domain_prefix: e.target.value })} placeholder="/test" />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">활성 언어 + 언어별 path</label>
        {ALL_LANGS.map((l) => {
          const active = site.active_languages.includes(l.code);
          return (
            <div key={l.code} className="flex items-center gap-2">
              <Checkbox checked={active} onCheckedChange={() => toggleLang(l.code)} />
              <span className="w-24 text-sm">{l.label} ({l.code})</span>
              <Input
                disabled={!active}
                className="flex-1"
                value={site.language_paths[l.code] || ''}
                onChange={(e) => updatePath(l.code, e.target.value)}
                placeholder={l.code === 'ko' ? '/blog' : `/${l.code}/blog`}
              />
            </div>
          );
        })}
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Railway Deploy Webhook URL (옵션)</label>
        <Input value={site.deploy_webhook_url || ''} onChange={(e) => setSite({ ...site, deploy_webhook_url: e.target.value })} placeholder="https://backboard.railway.app/..." />
      </div>

      <div className="bg-muted/30 p-3 rounded text-xs space-y-1 font-mono">
        <p className="text-muted-foreground mb-1">본진 사이트 fetch URL (읽기 전용):</p>
        {site.active_languages.map((code) => (
          <p key={code}>
            /api/blog/by-project/{projectId}/posts?lang={code}
          </p>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? '저장 중…' : '저장'}
      </Button>
    </section>
  );
}
```

- [ ] **Step 2: 프로젝트 설정 페이지에 임포트**

설정 페이지 위치 찾기:
```bash
grep -rn "프로젝트 설정\|project-settings\|wp_credentials" src/components/project/ src/app/ 2>&1 | head -10
```

해당 페이지(예: `src/components/project/project-settings-panel.tsx`)에서 적절한 섹션(예: WP credentials 섹션 근처)에:
```typescript
import { PublishedSiteSection } from './published-site-section';

// JSX 안:
<PublishedSiteSection projectId={projectId} />
```

기존 WordPress credentials 섹션 컴포넌트는 일단 유지 (Chunk 4에서 제거).

- [ ] **Step 3: 수동 확인 — dev 서버에서 저장**

```
# 브라우저에서:
1. 187 프로젝트 설정 페이지 진입
2. "발행 사이트" 섹션 보임 확인
3. name="dflo", domain="https://www.dr187growup.com", domain_prefix="/test"
4. ko ☑ /blog, th ☑ /th/blog
5. 저장 클릭 → 다시 진입 시 값 유지 확인
```

Supabase MCP `execute_sql`:
```sql
SELECT published_site FROM projects WHERE id='6cc3c9c6-1718-4097-b7a0-0f95ae74d913';
```
Expected: JSON에 name/domain/active_languages/language_paths 포함.

- [ ] **Step 4: Commit**

```bash
git add contentflow/src/components/project/published-site-section.tsx contentflow/src/components/project/[수정한 settings 파일]
git commit -m "feat(ui): PublishedSiteSection for project settings (site registration)"
```

---

### Task 8: WordPress 패널 → internal-blog-panel rename + self_hosted 발행 로직

**Files:**
- Rename: `contentflow/src/components/content/wordpress-panel.tsx` → `internal-blog-panel.tsx`
- Modify: 위 새 파일 내부 — 발행 로직 + 컴포넌트명
- Modify: `contentflow/src/components/content/content-tabs.tsx` — import 경로/탭 메타

- [ ] **Step 1: 파일 rename + 컴포넌트명/export 교체**

```bash
git mv contentflow/src/components/content/wordpress-panel.tsx contentflow/src/components/content/internal-blog-panel.tsx
```

새 파일에서:
- `export function WordpressPanel` → `export function InternalBlogPanel`
- 내부 변수명/주석의 `wordpress`, `wp`, `WordPress` 표기를 의미 단위로 갱신 (`발행 대상`을 가리키는 문구만)

- [ ] **Step 2: WP 잔존 코드 식별 + 제거 목록 작성**

새 파일 `internal-blog-panel.tsx` 안에서 WP 흔적 grep:
```bash
grep -nE "wp_credentials|publishToWordpress|publishToWordPress|WordpressPanel|WP_API|wp-json|app_password|appPassword" contentflow/src/components/content/internal-blog-panel.tsx
```

각 매치를 다음 정책으로 처리:
1. **`useProjectStore` 셀렉터의 `wp_credentials` 참조** → 삭제. published_site 셀렉터로 대체:
   ```typescript
   const project = useProjectStore((s) => s.projects.find((p) => p.id === s.selectedProjectId));
   const site = project?.published_site;
   ```
2. **`publishToWordPress` 또는 유사 액션 호출** → `handleSchedulePublish`로 교체 (Step 3에서 정의)
3. **WP 자격증명 입력 인풋 JSX** (host/username/appPassword 등) → 통째로 제거
4. **wp REST API fetch 코드 (`/wp-json/...`)** → 제거
5. **발행 진행 인디케이터 / WP error toast** → 제거 (예약 발행은 동기 액션이라 인디케이터 불필요)

- [ ] **Step 3: 예약 발행 다이얼로그 통합**

`internal-blog-panel.tsx` 안에 인라인 다이얼로그 또는 별도 컴포넌트(`SchedulePublishDialog`)로 (언어, 시각) 입력 UI 추가:

```typescript
const [scheduleOpen, setScheduleOpen] = useState(false);
const [scheduleLang, setScheduleLang] = useState(site?.active_languages?.[0] || 'ko');
const [scheduleAt, setScheduleAt] = useState(() =>
  new Date(Date.now() + 60*60*1000).toISOString().slice(0, 16)  // 1h 후
);

async function handleSchedulePublish() {
  try {
    await schedulePublish({
      contentId: content.id,
      projectId: project.id,
      language: scheduleLang,
      channel: 'self_hosted',
      scheduledAt: new Date(scheduleAt).toISOString(),
    });
    setScheduleOpen(false);
    // 토스트 (sonner 사용 — 기존 패턴 따라; 없으면 alert 폴백)
    toast.success(`${scheduleLang.toUpperCase()} 예약 완료`);
  } catch (err) {
    toast.error(`예약 실패: ${(err as Error).message}`);
  }
}

// 우측 하단 버튼:
<Button onClick={() => setScheduleOpen(true)}>예약 발행</Button>

<Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
  <DialogContent>
    <DialogHeader><DialogTitle>예약 발행</DialogTitle></DialogHeader>
    <div className="space-y-3">
      <div>
        <label className="text-xs">언어</label>
        <select value={scheduleLang} onChange={(e) => setScheduleLang(e.target.value)} className="w-full p-2 border rounded">
          {(site?.active_languages || ['ko']).map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs">발행 시각</label>
        <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setScheduleOpen(false)}>취소</Button>
      <Button onClick={handleSchedulePublish}>예약</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

LanguageSelector(편집기 우측 상단 언어 탭) 표시 범위:
```typescript
const activeLangs = site?.active_languages || ['ko'];
```

발행 상태 뱃지:
```typescript
const records = useProjectStore((s) => s.getPublishRecordsForContent(content.id));

useEffect(() => {
  void fetchPublishRecordsForContent(content.id);
}, [content.id]);

{activeLangs.map((lang) => {
  const r = records.find((x) => x.language === lang);
  return (
    <Badge key={lang} variant={r?.status === 'published' ? 'default' : r ? 'secondary' : 'outline'}>
      {lang.toUpperCase()} {r ? `· ${r.status}${r.scheduled_at ? ' ' + new Date(r.scheduled_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : ''}` : ''}
    </Badge>
  );
})}
```

- [ ] **Step 4: content-tabs.tsx 임포트/탭 메타 갱신**

```typescript
// import 교체
import { InternalBlogPanel } from './internal-blog-panel';

// 탭 메타: 'wordpress' channelKind 그대로 두면 confusing — 'self_hosted'로 통일
// channelKind 유니온 타입에서 'wordpress' 제거, 'self_hosted' 추가
```

content-tabs.tsx의 `channelKind === 'wordpress'` 조건을 모두 `=== 'self_hosted'`로 교체. 탭 라벨 "WordPress" → "내부 블로그", 아이콘 변경 (`Globe`).

translation 미러링 코드(`content-tabs.tsx:138~150` 부근의 factcheck_report 동기화)는 base 채널 전용이라 유지.

- [ ] **Step 5: 타입체크 + dev 서버 확인**

```bash
cd contentflow && npx tsc --noEmit 2>&1 | grep -E "wordpress|WordpressPanel|internal-blog" | head -20
```
Expected: 에러 0. 누락 import 있으면 그 파일 보정.

브라우저:
1. 콘텐츠 1개 진입
2. 채널 탭에서 "내부 블로그" 보임 (이전 "WordPress" 자리)
3. 패널 열기 → 우측 LanguageSelector는 KR/TH만
4. "예약 발행" 버튼 클릭 → 다이얼로그 → 5분 후 시각 + ko 선택 → 저장
5. publish_records에 행 추가 확인 (`SELECT * FROM publish_records WHERE channel='self_hosted'`)

- [ ] **Step 6: Commit**

```bash
git add contentflow/src/components/content/
git commit -m "feat(ui): WordPress panel → internal-blog-panel + schedule publish via publish_records"
```

---

### Task 9: 발행 큐 self_hosted 카드 + 일괄 예약 진입점

**Files:**
- Create: `contentflow/src/components/publish/self-hosted-card.tsx`
- Modify: `contentflow/src/components/publish/channel-cards.tsx`

- [ ] **Step 1: SelfHostedCard 컴포넌트 작성**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { BulkScheduleDialog } from './bulk-schedule-dialog';

export function SelfHostedCard() {
  const { selectedProjectId, projects, fetchPublishCountsByLanguage } = useProjectStore();
  const project = projects.find((p) => p.id === selectedProjectId);
  const site = project?.published_site;
  const enabled = !!site?.enabled;
  const [counts, setCounts] = useState<Record<string, { scheduled: number; published: number }>>({});
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!enabled || !project) return;
    void fetchPublishCountsByLanguage(project.id).then((c) => {
      const next = { ...c };
      for (const lang of site!.active_languages) {
        if (!next[lang]) next[lang] = { scheduled: 0, published: 0 };
      }
      setCounts(next);
    });
  }, [enabled, project?.id, fetchPublishCountsByLanguage]);

  if (!enabled) {
    return (
      <div className="bg-card border border-dashed border-border rounded-lg p-4 opacity-60">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={18} className="text-muted-foreground" />
          <span className="text-sm font-semibold">내 사이트</span>
        </div>
        <p className="text-xs text-muted-foreground">프로젝트 설정에서 사이트 등록·활성화 필요</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={18} className="text-primary" />
          <div>
            <div className="text-sm font-semibold">내 사이트 ({new URL(site!.domain).hostname})</div>
            <div className="text-xs text-green-500">● 활성</div>
          </div>
        </div>

        <div className="space-y-1 mb-3">
          {site!.active_languages.map((lang) => {
            const c = counts[lang] || { scheduled: 0, published: 0 };
            return (
              <div key={lang} className="text-xs flex justify-between">
                <span>{lang.toUpperCase()}</span>
                <span className="text-muted-foreground">예약 {c.scheduled} · 발행 {c.published}</span>
              </div>
            );
          })}
        </div>

        <Button size="sm" className="w-full" onClick={() => setDialogOpen(true)}>일괄 예약 +</Button>
      </div>

      <BulkScheduleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
```

- [ ] **Step 2: channel-cards.tsx에서 wordpress 자리에 self_hosted 카드 삽입**

`src/components/publish/channel-cards.tsx`:
```typescript
import { SelfHostedCard } from './self-hosted-card';

const CHANNELS = [
  // wordpress 항목 제거
  { id: 'instagram', name: 'Instagram', icon: 'IG', color: 'bg-gradient-to-br from-[#f09433] to-[#dc2743]' },
  { id: 'youtube', name: 'YouTube', icon: 'YT', color: 'bg-[#ff0000]' },
  { id: 'facebook', name: 'Facebook / Threads', icon: 'FB', color: 'bg-[#1877f2]' },
];

// JSX에서: 그리드 첫 칸을 SelfHostedCard로 대체
<div className="grid grid-cols-4 gap-3">
  <SelfHostedCard />
  {CHANNELS.map(ch => (...기존...))}
</div>
```

`isConnected`의 `channelId === 'wordpress'` 분기 제거.

- [ ] **Step 3: 수동 확인**

브라우저 → 발행 큐 페이지:
- WordPress 카드가 없어지고 "내 사이트" 카드 표시
- 사이트 미등록(또는 enabled=false) 시 점선 비활성 카드
- 활성 시 도메인·언어별 카운트·"일괄 예약 +" 버튼

- [ ] **Step 4: Commit**

```bash
git add contentflow/src/components/publish/
git commit -m "feat(ui): self-hosted channel card replaces WordPress in publish queue"
```

---

### Task 10: schedule-distribution 분산 알고리즘 (TDD)

**Files:**
- Create: `contentflow/src/lib/schedule-distribution.ts`
- Create: `contentflow/src/lib/__tests__/schedule-distribution.test.ts`

- [ ] **Step 1: 테스트 작성 (TDD — 실패하는 테스트부터)**

```typescript
// src/lib/__tests__/schedule-distribution.test.ts
import { describe, it, expect } from 'vitest';
import { distributeSchedule } from '../schedule-distribution';

describe('distributeSchedule', () => {
  it('returns exactly N×L slots for N contents and L languages', () => {
    const result = distributeSchedule({
      contentIds: ['c1', 'c2', 'c3'],
      languages: ['ko', 'th'],
      startDate: '2026-05-20',
      perWeek: 5,
      weekdays: [1, 2, 3, 4, 5], // Mon-Fri
      timeSlots: ['09:00'],
      languageOffsetDays: 0,
    });
    expect(result).toHaveLength(6);
  });

  it('respects weekday mask', () => {
    const result = distributeSchedule({
      contentIds: ['c1', 'c2', 'c3', 'c4', 'c5'],
      languages: ['ko'],
      startDate: '2026-05-20', // Wed
      perWeek: 3,
      weekdays: [1, 3, 5], // Mon, Wed, Fri only
      timeSlots: ['10:00'],
      languageOffsetDays: 0,
    });
    for (const slot of result) {
      const day = new Date(slot.scheduledAt).getDay();
      expect([1, 3, 5]).toContain(day);
    }
  });

  it('applies languageOffsetDays — TH falls N days after KR', () => {
    const result = distributeSchedule({
      contentIds: ['c1'],
      languages: ['ko', 'th'],
      startDate: '2026-05-20',
      perWeek: 7,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      timeSlots: ['09:00'],
      languageOffsetDays: 3,
    });
    const ko = result.find((r) => r.contentId === 'c1' && r.language === 'ko');
    const th = result.find((r) => r.contentId === 'c1' && r.language === 'th');
    expect(ko && th).toBeTruthy();
    const diff = (new Date(th!.scheduledAt).getTime() - new Date(ko!.scheduledAt).getTime()) / 86400000;
    expect(diff).toBeCloseTo(3, 0);
  });

  it('past startDate snaps to now+5min', () => {
    const past = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const result = distributeSchedule({
      contentIds: ['c1'],
      languages: ['ko'],
      startDate: past,
      perWeek: 7,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      timeSlots: ['09:00'],
      languageOffsetDays: 0,
    });
    expect(new Date(result[0].scheduledAt).getTime()).toBeGreaterThanOrEqual(Date.now());
  });

  it('rotates through multiple timeSlots round-robin', () => {
    const result = distributeSchedule({
      contentIds: ['c1', 'c2', 'c3'],
      languages: ['ko'],
      startDate: '2026-05-20',
      perWeek: 3,
      weekdays: [3], // Wed only — so 1/week
      timeSlots: ['09:00', '14:00', '19:00'],
      languageOffsetDays: 0,
    });
    // All 3 fall on same day, rotating times
    const times = result.map((r) => r.scheduledAt.slice(11, 16)).sort();
    expect(times).toEqual(['09:00', '14:00', '19:00']);
  });
});
```

- [ ] **Step 2: 테스트 실행 — fail 확인**

```bash
cd contentflow && npx vitest run src/lib/__tests__/schedule-distribution.test.ts
```
Expected: 모듈 없음 에러.

- [ ] **Step 3: 알고리즘 구현**

```typescript
// src/lib/schedule-distribution.ts
export interface DistributeInput {
  contentIds: string[];
  languages: string[];
  startDate: string;             // YYYY-MM-DD
  endDate?: string;              // optional
  perWeek: number;
  weekdays: number[];            // 0=Sun..6=Sat
  timeSlots: string[];           // ['09:00', '14:00'...]
  languageOffsetDays: number;    // 0 → 동시. N → 두 번째 언어는 N일 늦게
}

export interface DistributedSlot {
  contentId: string;
  language: string;
  scheduledAt: string;           // ISO
}

export function distributeSchedule(input: DistributeInput): DistributedSlot[] {
  const slots: DistributedSlot[] = [];
  const totalNeeded = input.contentIds.length;

  // Generate KR (first language) slots from startDate, perWeek, weekdays, timeSlots
  const baseSlots = generateSlotsForLanguage(input, totalNeeded);

  for (let i = 0; i < input.contentIds.length; i++) {
    const cId = input.contentIds[i];
    input.languages.forEach((lang, langIdx) => {
      const base = baseSlots[i];
      const offsetMs = langIdx * input.languageOffsetDays * 86400000;
      const ts = new Date(base.getTime() + offsetMs).toISOString();
      slots.push({ contentId: cId, language: lang, scheduledAt: ts });
    });
  }
  return slots;
}

function generateSlotsForLanguage(input: DistributeInput, n: number): Date[] {
  const result: Date[] = [];
  let cursor = new Date(input.startDate + 'T00:00:00');
  const now = new Date();
  if (cursor.getTime() < now.getTime()) {
    cursor = new Date(now.getTime() + 5 * 60_000);
  }

  let slotIdx = 0;
  while (result.length < n) {
    const dayOfWeek = cursor.getDay();
    if (input.weekdays.includes(dayOfWeek)) {
      // emit perWeek/(weekdays.length) per this day, cycling through timeSlots
      const slotsPerDay = Math.max(1, Math.ceil(input.perWeek / input.weekdays.length));
      for (let s = 0; s < slotsPerDay && result.length < n; s++) {
        const t = input.timeSlots[slotIdx % input.timeSlots.length];
        const [h, m] = t.split(':').map(Number);
        const d = new Date(cursor);
        d.setHours(h, m, 0, 0);
        if (d.getTime() < Date.now()) {
          d.setTime(Date.now() + 5 * 60_000);
        }
        result.push(d);
        slotIdx++;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    // 무한루프 방지: 1년 초과 시 중단
    if ((cursor.getTime() - new Date(input.startDate).getTime()) > 365 * 86400000) break;
  }
  return result;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd contentflow && npx vitest run src/lib/__tests__/schedule-distribution.test.ts
```
Expected: 5 tests pass. fail 있으면 알고리즘 수정 후 재실행.

- [ ] **Step 5: Commit**

```bash
git add contentflow/src/lib/schedule-distribution.ts contentflow/src/lib/__tests__/schedule-distribution.test.ts
git commit -m "feat(lib): schedule-distribution algorithm with vitest coverage"
```

---

### Task 11: BulkScheduleDialog — 일괄 예약 마법사

**Files:**
- Create: `contentflow/src/components/publish/bulk-schedule-dialog.tsx`

- [ ] **Step 1: 다이얼로그 컴포넌트 작성 (5단계)**

```typescript
'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useProjectStore } from '@/stores/project-store';
import { distributeSchedule } from '@/lib/schedule-distribution';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface Props { open: boolean; onOpenChange: (v: boolean) => void }

export function BulkScheduleDialog({ open, onOpenChange }: Props) {
  const { selectedProjectId, projects, contents, bulkSchedulePublish } = useProjectStore();
  const project = projects.find((p) => p.id === selectedProjectId);
  const site = project?.published_site;

  const [stage, setStage] = useState(1);
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [perWeek, setPerWeek] = useState(5);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timeSlots, setTimeSlots] = useState<string>('09:00');
  const [langOffsetDays, setLangOffsetDays] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const projectContents = useMemo(
    () => contents.filter((c) => c.project_id === selectedProjectId),
    [contents, selectedProjectId],
  );
  const filteredContents = useMemo(
    () => categoryFilter ? projectContents.filter((c) => c.category === categoryFilter) : projectContents,
    [projectContents, categoryFilter],
  );

  const previewSlots = useMemo(() => {
    if (stage < 4) return [];
    return distributeSchedule({
      contentIds: selectedContentIds,
      languages: selectedLangs,
      startDate,
      perWeek,
      weekdays,
      timeSlots: timeSlots.split(',').map((t) => t.trim()),
      languageOffsetDays: langOffsetDays,
    });
  }, [stage, selectedContentIds, selectedLangs, startDate, perWeek, weekdays, timeSlots, langOffsetDays]);

  async function handleConfirm() {
    if (!project) return;
    setSubmitting(true);
    try {
      const rows = previewSlots.map((s) => ({
        contentId: s.contentId,
        projectId: project.id,
        language: s.language,
        channel: 'self_hosted' as const,
        scheduledAt: s.scheduledAt,
      }));
      const { inserted, skipped } = await bulkSchedulePublish(rows);
      onOpenChange(false);
      // 토스트 (sonner 사용 — 프로젝트 기존 패턴 확인 후 그에 맞춤. 없으면 alert 폴백)
      toast.success(`${inserted}건 예약 완료${skipped ? ` · ${skipped}건 스킵(이미 예약/발행됨)` : ''}`);
    } catch (err) {
      toast.error(`예약 실패: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>일괄 예약 발행 — 단계 {stage}/5</DialogTitle>
        </DialogHeader>

        {stage === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">콘텐츠 선택 ({selectedContentIds.length}/{filteredContents.length})</p>
            <div className="flex gap-2">
              {['A', 'B', 'C', 'D', 'E'].map((cat) => (
                <Button key={cat} size="sm" variant={categoryFilter?.startsWith(cat) ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter(categoryFilter?.startsWith(cat) ? null : cat + '.')}>
                  {cat}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setSelectedContentIds(filteredContents.map((c) => c.id))}>전체 선택</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedContentIds([])}>전체 해제</Button>
            </div>
            <div className="max-h-80 overflow-y-auto border rounded">
              {filteredContents.map((c) => (
                <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-muted/30 border-b last:border-0">
                  <Checkbox checked={selectedContentIds.includes(c.id)} onCheckedChange={(v) =>
                    setSelectedContentIds((prev) => v ? [...prev, c.id] : prev.filter((x) => x !== c.id))
                  } />
                  <span className="text-xs text-muted-foreground">{c.category}</span>
                  <span className="text-sm">{c.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {stage === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">언어 선택</p>
            {site?.active_languages.map((lang) => (
              <label key={lang} className="flex items-center gap-2">
                <Checkbox checked={selectedLangs.includes(lang)} onCheckedChange={(v) =>
                  setSelectedLangs((prev) => v ? [...prev, lang] : prev.filter((x) => x !== lang))
                } />
                <span>{lang.toUpperCase()}</span>
              </label>
            ))}
          </div>
        )}

        {stage === 3 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs">시작일</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div><label className="text-xs">주당 횟수</label>
                <Input type="number" value={perWeek} onChange={(e) => setPerWeek(+e.target.value)} /></div>
            </div>
            <div>
              <label className="text-xs">요일</label>
              <div className="flex gap-2">
                {WEEKDAY_LABELS.map((l, i) => (
                  <button key={i} type="button"
                    onClick={() => setWeekdays((w) => w.includes(i) ? w.filter((x) => x !== i) : [...w, i].sort())}
                    className={`px-3 py-1 rounded ${weekdays.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs">시간대 (쉼표 구분, 예: 09:00, 14:00)</label>
              <Input value={timeSlots} onChange={(e) => setTimeSlots(e.target.value)} />
            </div>
            <div>
              <label className="text-xs">언어 간 시차 (일) — 두 번째 언어는 첫 언어보다 N일 늦게</label>
              <Input type="number" value={langOffsetDays} onChange={(e) => setLangOffsetDays(+e.target.value)} />
            </div>
          </div>
        )}

        {stage === 4 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">미리보기 — {previewSlots.length}건</p>
            <div className="max-h-80 overflow-y-auto border rounded font-mono text-xs">
              {previewSlots.map((s, i) => {
                const c = projectContents.find((x) => x.id === s.contentId);
                return (
                  <div key={i} className="flex justify-between p-1 border-b last:border-0">
                    <span>{s.scheduledAt.slice(0, 16).replace('T', ' ')}</span>
                    <span className="text-muted-foreground">{s.language.toUpperCase()}</span>
                    <span className="flex-1 ml-2 truncate">{c?.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {stage === 5 && (
          <div className="space-y-2 text-center py-8">
            <p>총 <b>{previewSlots.length}건</b>을 publish_records에 예약 등록합니다.</p>
            <p className="text-xs text-muted-foreground">취소는 발행 큐에서 개별 가능합니다.</p>
          </div>
        )}

        <DialogFooter>
          {stage > 1 && <Button variant="outline" onClick={() => setStage(stage - 1)}>이전</Button>}
          {stage < 5 && (
            <Button onClick={() => setStage(stage + 1)}
              disabled={
                (stage === 1 && selectedContentIds.length === 0) ||
                (stage === 2 && selectedLangs.length === 0)
              }>다음</Button>
          )}
          {stage === 5 && (
            <Button onClick={handleConfirm} disabled={submitting}>
              {submitting ? '예약 중…' : '일괄 예약 확정'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: 다이얼로그 동작 확인 (수동)**

발행 큐 → "내 사이트" 카드 → "일괄 예약 +" 클릭. 5단계 진행:
1. 187 콘텐츠 70개 중 5개 체크
2. ko, th 둘 다 체크
3. 시작일 = 내일, 주5회, 월~금, 09:00, langOffset=2
4. 미리보기 = 10건 (5×2). 날짜 분산 확인
5. 확정 → publish_records에 10행 추가 확인:
```sql
SELECT content_id, language, scheduled_at, status FROM publish_records
WHERE channel='self_hosted' ORDER BY scheduled_at;
```

- [ ] **Step 3: Commit**

```bash
git add contentflow/src/components/publish/bulk-schedule-dialog.tsx
git commit -m "feat(ui): bulk schedule dialog (5-stage wizard with distribution preview)"
```

---

**Chunk 2 완료 검증:**

- [ ] project-store에 published_site/publishRecords 액션 6종 동작
- [ ] 프로젝트 설정에 "발행 사이트" 섹션 노출 + 저장/로드 정상
- [ ] WordPress 탭이 "내부 블로그"로 표시 + 단건 예약 다이얼로그 동작
- [ ] 발행 큐 첫 번째 자리에 "내 사이트" 카드 (도메인·언어별 카운트·"일괄 예약 +")
- [ ] schedule-distribution 단위 테스트 5건 통과
- [ ] BulkScheduleDialog 5단계 흐름 동작 + publish_records 일괄 insert
- [ ] 6개 commit 누적 (store / PublishedSiteSection / internal-blog-panel / self-hosted-card / schedule-distribution / bulk-dialog)

→ Chunk 3 (Cron + dflo)로 진행

---

## Chunk 3: Cron + dflo 본진 사이드 연동 (Milestone 3)

### Task 12: fire-deploy-webhooks API route + Vercel Cron 등록

**Files:**
- Create: `contentflow/src/app/api/cron/fire-deploy-webhooks/route.ts`
- Create or Modify: `contentflow/vercel.json`
- Modify: `contentflow/.env.local.example` (CRON_SECRET 추가)

- [ ] **Step 1: cron route 작성**

`src/app/api/cron/fire-deploy-webhooks/route.ts`:

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const admin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const MAX_RETRY = 3;

export async function GET(req: NextRequest) {
  // Vercel Cron 인증 — Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 1) 큐 전체 폴링 — PostgREST는 column-vs-column 비교를 .or()로 표현 못 함.
  //    모든 row를 가져온 뒤 클라이언트에서 필터.
  const { data: all, error } = await admin
    .from('deploy_webhook_queue')
    .select('project_id, enqueued_at, last_fired_at, retry_count, last_error');
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 발사 대상: 한 번도 안 쏜 행(last_fired_at null) 또는 enqueued_at이 last_fired_at보다 새것
  const pending = (all || []).filter((r: any) =>
    r.last_fired_at === null || new Date(r.enqueued_at).getTime() > new Date(r.last_fired_at).getTime()
  );
  if (!pending.length) {
    return Response.json({ fired: 0, skipped: 0 });
  }

  // 2) 각 행 처리 — race condition 방지:
  //    last_fired_at = row.enqueued_at (행 시점 snapshot) 으로 stamp.
  //    cron이 그 사이 새 enqueue를 했다면 enqueued_at이 더 커지므로 다음 cycle에 다시 잡힘.
  const results: { project_id: string; ok: boolean; error?: string }[] = [];
  for (const row of pending) {
    if (row.retry_count >= MAX_RETRY) {
      results.push({ project_id: row.project_id, ok: false, error: `retry-exhausted: ${row.last_error || 'unknown'}` });
      continue;
    }
    const snapshotFiredAt = row.enqueued_at;  // 행의 enqueued_at 그대로 stamp

    // 3) projects.published_site.deploy_webhook_url 조회
    const { data: project } = await admin
      .from('projects').select('published_site').eq('id', row.project_id).maybeSingle();
    const url = (project?.published_site as any)?.deploy_webhook_url;
    if (!url) {
      await admin.from('deploy_webhook_queue').update({
        last_fired_at: snapshotFiredAt,
        last_error: 'deploy_webhook_url not configured',
      }).eq('project_id', row.project_id);
      results.push({ project_id: row.project_id, ok: false, error: 'no webhook url' });
      continue;
    }

    // 4) webhook POST
    try {
      const r = await fetch(url, { method: 'POST', body: JSON.stringify({}) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await admin.from('deploy_webhook_queue').update({
        last_fired_at: snapshotFiredAt,
        retry_count: 0,
        last_error: null,
      }).eq('project_id', row.project_id);
      results.push({ project_id: row.project_id, ok: true });
    } catch (err) {
      const msg = (err as Error).message;
      await admin.from('deploy_webhook_queue').update({
        retry_count: row.retry_count + 1,
        last_error: msg,
      }).eq('project_id', row.project_id);
      results.push({ project_id: row.project_id, ok: false, error: msg });
    }
  }

  const fired = results.filter((r) => r.ok).length;
  const skipped = results.length - fired;
  return Response.json({ fired, skipped, results });
}
```

**Operator 비상 escape hatch — retry 소진 행 재시도**
3회 실패 후 `retry_count >= MAX_RETRY` 행은 자동 제외됨. 운영자가 원인 수정 후 재시도:
```sql
UPDATE deploy_webhook_queue
SET retry_count = 0, last_error = NULL
WHERE project_id = '<project-id>';
```

- [ ] **Step 2: vercel.json — cron 등록**

`contentflow/vercel.json` (없으면 생성, 있으면 cron 섹션 추가):

```json
{
  "crons": [
    {
      "path": "/api/cron/fire-deploy-webhooks",
      "schedule": "* * * * *"
    }
  ]
}
```

Vercel은 cron 호출 시 자동으로 `Authorization: Bearer ${CRON_SECRET}` 헤더 부여 (CRON_SECRET 환경변수는 Vercel 프로젝트 설정에서 등록).

- [ ] **Step 3: 환경변수 example 갱신**

`contentflow/.env.local.example`에 추가:
```env

# Vercel Cron (production only)
CRON_SECRET=generate_a_random_32char_string
```

로컬 개발 시에는 CRON_SECRET 없이 라우트 인증 우회를 위해 `.env.local`에 임시 값 (예: `dev-secret`) 설정 후 직접 curl로 호출 가능:

```bash
curl -H "Authorization: Bearer dev-secret" http://localhost:3001/api/cron/fire-deploy-webhooks
```

- [ ] **Step 4: 로컬 검증 — 빈 큐 + 가짜 큐 행**

빈 큐 응답 확인:
```bash
# dev 서버 환경변수에 CRON_SECRET=dev-secret 설정 (.env.local 임시 추가) 후
curl -H "Authorization: Bearer dev-secret" http://localhost:3001/api/cron/fire-deploy-webhooks
```
Expected: `{"fired":0,"skipped":0}`

큐에 가짜 행 추가 후 재호출:
```sql
-- Supabase SQL Editor
INSERT INTO deploy_webhook_queue (project_id, enqueued_at)
VALUES ('6cc3c9c6-1718-4097-b7a0-0f95ae74d913', NOW())
ON CONFLICT (project_id) DO UPDATE SET enqueued_at = EXCLUDED.enqueued_at;
```
```bash
curl -H "Authorization: Bearer dev-secret" http://localhost:3001/api/cron/fire-deploy-webhooks
```
Expected: 187 프로젝트 published_site.deploy_webhook_url이 비어있으면 `{"fired":0,"skipped":1,"results":[{...,"error":"no webhook url"}]}`. 등록되어 있으면 실제 webhook 호출됨.

큐 정리:
```sql
DELETE FROM deploy_webhook_queue WHERE project_id='6cc3c9c6-1718-4097-b7a0-0f95ae74d913';
```

- [ ] **Step 5: Commit**

```bash
git add contentflow/src/app/api/cron/ contentflow/vercel.json contentflow/.env.local.example
git commit -m "feat(cron): fire-deploy-webhooks Vercel cron route (debounced webhook dispatch)"
```

---

### Task 13: dflo v4 — build-blog.mjs prerender 스크립트

**Files:**
- Create: `C:/projects/dflo_0.1/v4/scripts/build-blog.mjs`
- Modify: `C:/projects/dflo_0.1/v4/package.json` (build 스크립트 확장)
- Modify: `C:/projects/dflo_0.1/v4/.env.production` (CONTENTFLOW_API_URL 추가; 빌드 시 사용)

- [ ] **Step 1: build-blog.mjs 작성**

`C:/projects/dflo_0.1/v4/scripts/build-blog.mjs`:

```javascript
// Prerender blog routes after `vite build`.
// - Fetches ContentFlow API for active languages
// - Writes dist/<langPath>/<slug>/index.html using dist/index.html as template
// - Injects <title>, <meta description>, hreflang, OG, Article JSON-LD, inlined <article>
// - API failure → empty result for that language → no pages generated (idempotent fail)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'dist');
const TEMPLATE = readFileSync(resolve(DIST, 'index.html'), 'utf8');

const API = process.env.CONTENTFLOW_API_URL || 'https://contentflow.vercel.app';
const PROJECT_ID = process.env.CONTENTFLOW_PROJECT_ID || '6cc3c9c6-1718-4097-b7a0-0f95ae74d913';
const SITE_BASE = process.env.SITE_BASE_URL || 'https://www.dr187growup.com';

// 활성 언어 + path 매핑 (ContentFlow projects.published_site에서 가져올 수도 있지만,
// 빌드 환경변수로 단순화. 변경 시 dflo .env.production 갱신)
const LANGS = [
  { code: 'ko', path: '/blog' },
  { code: 'th', path: '/th/blog' },
];

async function fetchPosts(lang) {
  const url = `${API}/api/blog/by-project/${PROJECT_ID}/posts?lang=${lang}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[build-blog] ${lang}: HTTP ${res.status} — skipping`);
      return [];
    }
    const json = await res.json();
    return json.posts || [];
  } catch (err) {
    console.warn(`[build-blog] ${lang}: fetch failed — ${err.message} — skipping`);
    return [];
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function renderPost({ post, lang, pathBase }) {
  const slug = post.slug;
  const title = escapeHtml(post.title);
  const desc = escapeHtml(post.meta_description || '').slice(0, 160);
  const canonical = `${SITE_BASE}${pathBase}/${slug}`;

  // hreflang for every active language
  const hreflang = LANGS.map((l) =>
    `<link rel="alternate" hreflang="${l.code}" href="${SITE_BASE}${l.path}/${slug}" />`
  ).join('\n    ');

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description || '',
    datePublished: post.published_at,
    inLanguage: lang,
    author: { '@type': 'Organization', name: '187 성장클리닉' },
    publisher: { '@type': 'Organization', name: '연세새봄의원' },
    mainEntityOfPage: canonical,
  });

  let html = TEMPLATE;
  // <title> 교체
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  // <head> 끝 직전에 meta/hreflang/og/schema 주입
  const headInjection = `
    <meta name="description" content="${desc}" />
    <link rel="canonical" href="${canonical}" />
    ${hreflang}
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:type" content="article" />
    <meta property="article:published_time" content="${post.published_at}" />
    <script type="application/ld+json">${schema}</script>
  `;
  html = html.replace('</head>', `${headInjection}\n  </head>`);
  // <body> 안에 본문 인라인 (SPA root div 다음)
  const articleHtml = `<article data-blog-prerendered data-slug="${slug}" data-lang="${lang}">${post.body_html || ''}</article>`;
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/, (match) => `${match}\n    ${articleHtml}`);
  return html;
}

async function main() {
  let total = 0;
  for (const { code, path: pathBase } of LANGS) {
    const posts = await fetchPosts(code);
    console.log(`[build-blog] ${code}: ${posts.length} posts`);
    for (const post of posts) {
      const html = renderPost({ post, lang: code, pathBase });
      const outDir = resolve(DIST, pathBase.replace(/^\//, ''), post.slug);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(resolve(outDir, 'index.html'), html, 'utf8');
      total++;
    }
  }
  console.log(`[build-blog] done — ${total} files`);
}

main().catch((err) => {
  console.error('[build-blog] fatal', err);
  process.exit(1);  // 빌드 실패로 처리
});
```

- [ ] **Step 2: package.json build 스크립트 확장**

`C:/projects/dflo_0.1/v4/package.json` scripts 섹션 수정:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && npm run build:i18n && vite build && npm run build:blog",
    "build:i18n": "node scripts/build-i18n.mjs",
    "build:blog": "node scripts/build-blog.mjs",
    "test:i18n": "node --test scripts/test/*.mjs",
    "start": "vite preview --port ${PORT:-3000} --host 0.0.0.0",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 3: 환경변수 설정**

`C:/projects/dflo_0.1/v4/.env.production` (없으면 생성):

```env
# 빌드 타임 (Node — build-blog.mjs)
CONTENTFLOW_API_URL=https://contentflow.vercel.app
CONTENTFLOW_PROJECT_ID=6cc3c9c6-1718-4097-b7a0-0f95ae74d913
SITE_BASE_URL=https://www.dr187growup.com

# 런타임 (브라우저 — usePosts 훅. Vite는 VITE_* prefix만 클라이언트로 노출)
VITE_CONTENTFLOW_API=https://contentflow.vercel.app
VITE_CONTENTFLOW_PROJECT_ID=6cc3c9c6-1718-4097-b7a0-0f95ae74d913
```

두 쌍이 필요한 이유: build-blog.mjs는 Node 스크립트라 `process.env`만 사용, SPA의 usePosts 훅은 Vite를 통해 `import.meta.env.VITE_*`만 노출됨. 같은 값이라도 변수명을 둘 다 등록해야 함.

Railway 프로젝트 환경변수에도 4개 모두 등록(Railway Console → Variables).

- [ ] **Step 4: 로컬 빌드 sanity 체크**

```bash
cd C:/projects/dflo_0.1/v4
# 임시로 ContentFlow 로컬 API 가리키기
CONTENTFLOW_API_URL=http://localhost:3001 npm run build
```

Expected:
- `vite build` 정상 종료 → `dist/` 생성
- `build:blog` 로그 `[build-blog] ko: 0 posts`, `[build-blog] th: 0 posts` (아직 발행된 글 없음), `done — 0 files`
- 빌드 실패 없음

Chunk 2 Task 8/11에서 콘텐츠 1개를 5분 후로 예약 발행해두면, 5분 후 cron이 transition → 큐 enqueue, Vercel cron이 webhook fire → Railway rebuild → build:blog이 1 post를 가져와 `dist/blog/{slug}/index.html` 생성. 이건 Chunk 4 E2E에서 검증.

- [ ] **Step 5: Commit (dflo 리포)**

dflo는 별도 git 리포일 가능성. 확인:
```bash
cd C:/projects/dflo_0.1 && git status -s | head -5
```

dflo 리포에서:
```bash
cd C:/projects/dflo_0.1
git add v4/scripts/build-blog.mjs v4/package.json v4/.env.production
git commit -m "feat(blog): prerender script — fetch ContentFlow API, generate static HTML per slug/lang"
```

---

### Task 14: dflo v4 — BlogList / BlogPost 페이지 컴포넌트

**Files:**
- Create: `C:/projects/dflo_0.1/v4/src/pages/Blog/BlogList.tsx`
- Create: `C:/projects/dflo_0.1/v4/src/pages/Blog/BlogPost.tsx`
- Create: `C:/projects/dflo_0.1/v4/src/pages/Blog/usePosts.ts` (data hook)

- [ ] **Step 1: usePosts 훅 (런타임 CSR 폴백)**

```typescript
// v4/src/pages/Blog/usePosts.ts
import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_CONTENTFLOW_API || 'https://contentflow.vercel.app';
const PROJECT_ID = import.meta.env.VITE_CONTENTFLOW_PROJECT_ID || '6cc3c9c6-1718-4097-b7a0-0f95ae74d913';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  body_html: string;
  published_at: string;
  language: string;
  tags: string[];
}

export function usePosts(lang: 'ko' | 'th') {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/blog/by-project/${PROJECT_ID}/posts?lang=${lang}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) { setPosts(j.posts || []); setLoading(false); }})
      .catch(() => { if (!cancelled) { setLoading(false); }});
    return () => { cancelled = true; };
  }, [lang]);
  return { posts, loading };
}

export function usePost(lang: 'ko' | 'th', slug: string) {
  const { posts, loading } = usePosts(lang);
  return { post: posts.find((p) => p.slug === slug) || null, loading };
}
```

- [ ] **Step 2: BlogList.tsx**

```typescript
import { Link } from 'react-router-dom';
import { usePosts } from './usePosts';

interface Props { lang: 'ko' | 'th' }

export default function BlogList({ lang }: Props) {
  const { posts, loading } = usePosts(lang);
  const pathBase = lang === 'ko' ? '/blog' : `/${lang}/blog`;
  if (loading) return <div className="p-8 text-center">로딩 중…</div>;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        {lang === 'ko' ? '187 성장 가이드' : '187 Growth Guide'}
      </h1>
      <ul className="space-y-4">
        {posts.map((p) => (
          <li key={p.id} className="border-b pb-4">
            <Link to={`${pathBase}/${p.slug}`} className="block hover:opacity-70">
              <h2 className="text-xl font-semibold">{p.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{p.meta_description}</p>
              <time className="text-xs text-gray-400 mt-1 block">
                {new Date(p.published_at).toLocaleDateString(lang)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 3: BlogPost.tsx (CSR 폴백 — prerender HTML이 본문 인라인되어 있으면 그게 우선 표시)**

```typescript
import { useParams } from 'react-router-dom';
import { usePost } from './usePosts';

interface Props { lang: 'ko' | 'th' }

export default function BlogPost({ lang }: Props) {
  const { slug = '' } = useParams<{ slug: string }>();
  const { post, loading } = usePost(lang, slug);

  if (loading) return <div className="p-8 text-center">로딩 중…</div>;
  if (!post) return <div className="p-8 text-center">글을 찾을 수 없습니다.</div>;

  return (
    <main className="max-w-3xl mx-auto p-6 prose">
      <h1>{post.title}</h1>
      <time className="text-sm text-gray-500">
        {new Date(post.published_at).toLocaleDateString(lang)}
      </time>
      <div dangerouslySetInnerHTML={{ __html: post.body_html }} />
    </main>
  );
}
```

prerender HTML에서 본문은 `<article data-blog-prerendered>...</article>`로 SPA root 바깥에 인라인되어 있어 봇은 그것을 읽음. React는 그 노드를 hydrate하지 않으므로 hydration mismatch는 발생하지 않고, BlogPost가 마운트되면 SPA가 자체 `<main>`을 렌더. 그러나 동일 콘텐츠가 화면에 두 번 보이지 않도록 마운트 시 prerender 노드를 제거:

```typescript
// BlogPost.tsx 안에 추가
useEffect(() => {
  document.querySelectorAll(`[data-blog-prerendered][data-slug="${slug}"][data-lang="${lang}"]`)
    .forEach((el) => el.remove());
}, [slug, lang]);
```

- [ ] **Step 4: Commit**

```bash
cd C:/projects/dflo_0.1
git add v4/src/pages/Blog/
git commit -m "feat(blog): BlogList, BlogPost components + usePosts data hook"
```

---

### Task 15: dflo v4 — 라우터에 블로그 라우트 4개 추가

**Files:**
- Modify: `C:/projects/dflo_0.1/v4/src/app/router.tsx`

- [ ] **Step 1: 라우트 4개 추가**

`createBrowserRouter([...])` 배열에 다음 4개 추가 (lazy + Suspense 기존 패턴 따라).
`Suspense`와 `SuspenseFallback`은 router.tsx 상단에 이미 import되어 있으니 재import 금지. `lazy`만 import 목록에 없으면 추가.

```typescript
import { lazy } from 'react';  // 기존 import 줄에 lazy 추가

const BlogList = lazy(() => import('@/pages/Blog/BlogList'));
const BlogPost = lazy(() => import('@/pages/Blog/BlogPost'));

// 배열 안에 추가:
{
  path: '/blog',
  element: (
    <Suspense fallback={<SuspenseFallback />}>
      <BlogList lang="ko" />
    </Suspense>
  ),
},
{
  path: '/blog/:slug',
  element: (
    <Suspense fallback={<SuspenseFallback />}>
      <BlogPost lang="ko" />
    </Suspense>
  ),
},
{
  path: '/th/blog',
  element: (
    <Suspense fallback={<SuspenseFallback />}>
      <BlogList lang="th" />
    </Suspense>
  ),
},
{
  path: '/th/blog/:slug',
  element: (
    <Suspense fallback={<SuspenseFallback />}>
      <BlogPost lang="th" />
    </Suspense>
  ),
},
```

- [ ] **Step 2: 로컬 dev에서 라우트 확인**

```bash
cd C:/projects/dflo_0.1/v4 && npm run dev
```

브라우저:
- `http://localhost:5173/blog` → BlogList (글 0개일 가능성, 로딩 후 빈 상태)
- `http://localhost:5173/th/blog` → 동일
- `http://localhost:5173/blog/test-slug` → "글을 찾을 수 없습니다"

ContentFlow 로컬 dev에 발행 글이 있으면 환경변수 임시 변경 후:
```bash
VITE_CONTENTFLOW_API=http://localhost:3001 npm run dev
```

- [ ] **Step 3: 빌드 검증**

```bash
cd C:/projects/dflo_0.1/v4
npm run build
```

Expected: vite build 정상 + build:blog 0 files (글 없으면) 또는 N files (있으면). `dist/blog/` 디렉토리 생성 여부 확인.

- [ ] **Step 4: Commit**

```bash
cd C:/projects/dflo_0.1
git add v4/src/app/router.tsx
git commit -m "feat(router): add /blog and /th/blog routes (list + detail)"
```

---

**Chunk 3 완료 검증:**

- [ ] `/api/cron/fire-deploy-webhooks` 가 빈 큐 / 가짜 큐에 대해 정상 응답
- [ ] `vercel.json`에 cron 등록 (배포 후 Vercel 콘솔에 cron 1개 표시되는지 확인 — 본 배포 전엔 sanity로 충분)
- [ ] dflo v4 `npm run build` 가 성공하며 `build:blog` 단계 실행
- [ ] dflo 로컬 dev에서 `/blog`, `/th/blog`, `/blog/:slug`, `/th/blog/:slug` 라우트 동작
- [ ] ContentFlow 1개 commit + dflo 3개 commit 누적

→ Chunk 4 (E2E 검증 + WP 잔존 정리)로 진행

---

## Chunk 4: E2E 검증 + WP 잔존 코드 정리 (Milestone 4)

### Task 16: E2E 발행 흐름 — 수동 검증 시나리오

**Files:** (수정 없음 — 검증 작업)

이 task는 코드 변경 없이 시스템 전체 흐름을 검증합니다. 환경: ContentFlow는 로컬 dev (또는 staging), dflo는 로컬 build → preview.

- [ ] **Step 1: 사전 상태 정리**

```sql
-- 187 프로젝트의 self_hosted 행 정리 (이전 Chunk 2 테스트 잔재)
DELETE FROM publish_records
WHERE project_id='6cc3c9c6-1718-4097-b7a0-0f95ae74d913' AND channel='self_hosted';

DELETE FROM deploy_webhook_queue
WHERE project_id='6cc3c9c6-1718-4097-b7a0-0f95ae74d913';
```

ContentFlow 프로젝트 설정에서 187 프로젝트 published_site 활성화 + KR/TH path 확인. deploy_webhook_url은 비워 둠 (E2E에선 webhook 모킹).

- [ ] **Step 2: 콘텐츠 1개를 KR/TH 둘 다 5분 후로 예약**

브라우저:
1. 콘텐츠 목록에서 첫 번째 콘텐츠 진입
2. 내부 블로그 탭 → 한국어 선택 → "예약 발행" → 시각 = NOW + 5분 → 예약
3. 태국어로 전환 → "예약 발행" → 동일 시각 → 예약

DB 확인:
```sql
SELECT id, content_id, language, status, scheduled_at FROM publish_records
WHERE project_id='6cc3c9c6-1718-4097-b7a0-0f95ae74d913' AND channel='self_hosted';
```
Expected: 2행 (ko + th), 둘 다 `status='scheduled'`, `scheduled_at` 약 5분 후.

- [ ] **Step 3: pg_cron 전환 검증 (5분 대기 후)**

5분 경과 후:
```sql
SELECT id, language, status, scheduled_at, published_at FROM publish_records
WHERE project_id='6cc3c9c6-1718-4097-b7a0-0f95ae74d913' AND channel='self_hosted';
```
Expected: 두 행 모두 `status='published'`, `published_at IS NOT NULL`.

```sql
SELECT project_id, enqueued_at, last_fired_at FROM deploy_webhook_queue
WHERE project_id='6cc3c9c6-1718-4097-b7a0-0f95ae74d913';
```
Expected: 1행, `enqueued_at` ≈ status 전환 시각, `last_fired_at IS NULL` (아직 webhook 안 쏨).

만약 5분 후에도 전환이 안 됐다면 cron 잡 동작 확인:
```sql
SELECT * FROM cron.job_run_details WHERE jobid=(SELECT jobid FROM cron.job WHERE jobname='publish-self-hosted')
ORDER BY start_time DESC LIMIT 5;
```

- [ ] **Step 4: cron route 수동 발사 — webhook URL 없는 케이스**

```bash
curl -H "Authorization: Bearer dev-secret" http://localhost:3001/api/cron/fire-deploy-webhooks
```
Expected: `fired:0, skipped:1`, results에 `"error":"no webhook url"`.

```sql
SELECT last_fired_at, last_error FROM deploy_webhook_queue
WHERE project_id='6cc3c9c6-1718-4097-b7a0-0f95ae74d913';
```
Expected: `last_fired_at` 채워짐 (snapshot of enqueued_at), `last_error='deploy_webhook_url not configured'`.

- [ ] **Step 5: cron route 수동 발사 — webhook URL 있는 케이스 (모킹)**

testing webhook URL 발급 (가장 단순: https://webhook.site 에 임시 endpoint 생성). 그 URL을 187 프로젝트 published_site.deploy_webhook_url에 저장.

큐 강제 re-enqueue:
```sql
UPDATE deploy_webhook_queue
SET enqueued_at=NOW(), last_fired_at=NULL, retry_count=0, last_error=NULL
WHERE project_id='6cc3c9c6-1718-4097-b7a0-0f95ae74d913';
```

```bash
curl -H "Authorization: Bearer dev-secret" http://localhost:3001/api/cron/fire-deploy-webhooks
```
Expected: `fired:1, skipped:0`. webhook.site에서 POST 수신 확인.

- [ ] **Step 6: 외부 API 응답 확인**

KR 콘텐츠는 base_articles 본문이 있고, TH는 translations에 본문이 있으므로 둘 다 노출되어야 함:
```bash
curl -s "http://localhost:3001/api/blog/by-project/6cc3c9c6-1718-4097-b7a0-0f95ae74d913/posts?lang=ko" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'ko posts: {len(d[\"posts\"])}'); print('first:', d['posts'][0]['title'] if d['posts'] else None)"

curl -s "http://localhost:3001/api/blog/by-project/6cc3c9c6-1718-4097-b7a0-0f95ae74d913/posts?lang=th" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'th posts: {len(d[\"posts\"])}'); print('first:', d['posts'][0]['title'] if d['posts'] else None)"
```
Expected: `ko posts: 1`, `th posts: 1`. 첫 글 제목 표시.

- [ ] **Step 7: dflo build:blog 통합 검증**

```bash
cd C:/projects/dflo_0.1/v4
CONTENTFLOW_API_URL=http://localhost:3001 \
SITE_BASE_URL=https://www.dr187growup.com \
CONTENTFLOW_PROJECT_ID=6cc3c9c6-1718-4097-b7a0-0f95ae74d913 \
  npm run build
```
Expected:
- 로그: `[build-blog] ko: 1 posts`, `[build-blog] th: 1 posts`, `done — 2 files`
- 파일 생성 확인:
  ```bash
  ls dist/blog/*/index.html dist/th/blog/*/index.html
  ```
  → 2개 파일

생성된 HTML 검증:
```bash
# <title> 검증
grep -o "<title>[^<]*</title>" dist/blog/*/index.html

# canonical link 검증
grep "rel=\"canonical\"" dist/blog/*/index.html

# JSON-LD schema 검증
grep "application/ld+json" dist/blog/*/index.html | head -1

# 본문 인라인 검증
grep "data-blog-prerendered" dist/blog/*/index.html
```
Expected: 4건 모두 매치.

- [ ] **Step 8: dflo preview에서 라우트 동작**

```bash
cd C:/projects/dflo_0.1/v4 && npm run preview
```
브라우저:
- `http://localhost:3000/blog` → BlogList에 글 1개
- `http://localhost:3000/blog/{slug}` → 글 본문 (인라인 prerender 노드는 useEffect로 제거됨)
- `http://localhost:3000/th/blog`, `/th/blog/{slug}` → 동일

DevTools → "View Page Source"로 static HTML 확인 → meta·schema·본문 모두 인라인.

- [ ] **Step 9: 검증 결과 기록**

E2E 통과 직후 `memory/self_hosted_blog.md`에 다음 1줄 추가 (Task 18에서 본 파일 생성 시 함께 반영):
```
## E2E 통과 일자
- {YYYY-MM-DD}: KR+TH 각 1건 발행 → cron transition → webhook fire(mock) → dflo build → 정적 HTML 2건 생성 확인
```

- [ ] **Step 10: Commit (검증 후 정리)**

대부분 코드 변경 없음. 만약 검증 중 작은 fix가 있었다면 (예: dflo .env.production 값 보정):
```bash
git add -A
git commit -m "fix: minor adjustments from E2E validation"
```

---

### Task 17: WordPress 잔존 코드·라우트 제거

**Files:**
- Delete: `contentflow/src/app/api/publish/wordpress/route.ts`
- Modify: WP credentials 입력 UI (프로젝트 설정 내 wp-related section)
- Modify: 기타 grep 결과의 WP 참조

- [ ] **Step 1: WP 잔존 코드 grep — 마지막 정리 대상 파악**

Windows 환경 — Claude Code의 `Grep` 도구 또는 PowerShell `Select-String` 사용:

```powershell
# PowerShell
Select-String -Path "src/**/*.ts","src/**/*.tsx" -Pattern "wp_credentials|wp-json|WordpressPanel|publishToWordPress|app_password" -List
```

또는 (Bash tool 사용 시):
```bash
grep -rnE "wp_credentials|wp-json|WordpressPanel|publishToWordPress|app_password" src/ 2>&1 | head -30
```

이 시점까지 남아 있어야 할 것:
- `src/types/database.ts`의 `Project.wp_credentials?: ...` 필드 정의 (DB 컬럼은 잔존, 코드는 더 이상 쓰지 않음)
- `src/components/project/[기존 WP credentials 섹션]` UI (있다면)

제거 대상:
- `src/app/api/publish/wordpress/route.ts` (WP REST 발행 라우트)
- 위 라우트를 호출하는 모든 클라이언트 코드 (이미 Task 8에서 internal-blog-panel에서 제거됨)
- 프로젝트 설정 페이지의 WP credentials 입력 섹션 UI

- [ ] **Step 2: 라우트 파일 삭제**

```powershell
# PowerShell
Remove-Item contentflow/src/app/api/publish/wordpress/route.ts
Remove-Item contentflow/src/app/api/publish/wordpress -ErrorAction SilentlyContinue
```

또는 Bash:
```bash
cd contentflow
rm src/app/api/publish/wordpress/route.ts
rmdir src/app/api/publish/wordpress 2>/dev/null || true
```

만약 `src/app/api/publish/wordpress/` 안에 다른 라우트(예: oauth callback)가 있으면 그것도 함께 제거 또는 유지 판단. 보통 단일 route.ts만 있을 가능성.

- [ ] **Step 3: WP credentials 입력 UI 컴포넌트 제거**

```bash
grep -rln "wp_credentials" src/components/project/ 2>&1
```

해당 파일에서 WP credentials 인풋 JSX 블록만 제거. `Project.wp_credentials` 타입 정의는 유지(DB 컬럼이 있어 일관성).

- [ ] **Step 4: TypeScript + 잔존 grep 클린업**

```bash
cd contentflow && npx tsc --noEmit 2>&1 | head -20
```
Expected: 에러 0.

Step 1과 동일한 grep 재실행 → 결과 0건이어야 함 (DB 컬럼 정의에 남는 `wp_credentials` 타입 하나 제외):
```powershell
Select-String -Path "src/**/*.ts","src/**/*.tsx" -Pattern "WordpressPanel|publishToWordPress|wp-json" -List
```
Expected: 매치 없음.

이전에 임시 메모해둔 `wp-errors.txt` 삭제:
```powershell
Remove-Item wp-errors.txt -ErrorAction SilentlyContinue
```

- [ ] **Step 5: dev 서버 종합 확인**

브라우저:
1. 프로젝트 설정에서 WP credentials 섹션 사라짐
2. 콘텐츠 편집기 채널 탭에 "WordPress" 없음, "내부 블로그" 있음
3. 발행 큐에서 "내 사이트" 카드만, "WordPress" 카드 없음

- [ ] **Step 6: Commit**

```bash
cd contentflow
git add -A
git commit -m "chore: remove WordPress publishing remnants (route + credentials UI)"
```

---

### Task 18: 문서 동기화 — CLAUDE.md + memory

**Files:**
- Modify: `contentflow/CLAUDE.md`
- Modify: `C:/Users/101024/.claude/projects/C--projects-ContentFlow/memory/MEMORY.md` + 신규 메모리 파일

- [ ] **Step 1: CLAUDE.md 업데이트**

`contentflow/CLAUDE.md`에서:
- "WordPress" 언급을 "내부 블로그"로 교체
- "외부 사이트 블로그 연동 API" 섹션 갱신 — `publish_records` 기반 게이트 + cron 자동 발행 + Vercel cron deploy webhook 흐름 명시
- "마케팅 전략 페이지" 섹션 인근에 "self_hosted 발행 채널" 1줄 추가
- 채널 탭 목록의 "WordPress" → "내부 블로그"
- 명령어 섹션에 별도 신규 명령어 없음 (npm run dev 그대로)

- [ ] **Step 2: 신규 메모리 파일 작성**

`C:/Users/101024/.claude/projects/C--projects-ContentFlow/memory/self_hosted_blog.md`:

```markdown
---
name: self-hosted-blog-publishing
description: 187/dflo 자체 사이트 블로그 예약 발행 시스템 — 데이터 흐름, 채널 키, cron 두 개의 관계
type: reference
---

ContentFlow → dflo(dr187growup.com) 본진 블로그 발행 시스템 (2026-05-18 구축).

## 핵심 흐름
1. 사용자 콘텐츠 편집기 "내부 블로그" 탭 또는 발행 큐 "일괄 예약" → `publish_records`(channel='self_hosted', status='scheduled')
2. Supabase `pg_cron`(`publish-self-hosted`, 매 1분) → scheduled→published 전환 + `deploy_webhook_queue` enqueue
3. Vercel Cron(`/api/cron/fire-deploy-webhooks`, 매 1분) → queue 폴링 → Railway deploy webhook 호출 (debounce: row.enqueued_at snapshot)
4. dflo Railway 빌드 → `vite build && build:blog` → ContentFlow API에서 글 fetch → 정적 HTML 생성 (`dist/blog/{slug}/index.html`)

## 마스터 상태
- 외부 API `/api/blog/by-project/{pid}/posts?lang=` 게이트 = `publish_records.status='published'`
- 다국어 fallback: lang≠ko 인데 translations 없으면 응답에서 skip (한국어 노출 금지)

## 자료 위치
- spec: `docs/superpowers/specs/2026-05-18-self-hosted-blog-publishing-design.md`
- plan: `docs/superpowers/plans/2026-05-18-self-hosted-blog-publishing.md`
- 마이그레이션: `supabase/migrations/2026-05-18-self-hosted-channel.sql`
- dflo: `C:/projects/dflo_0.1/v4/scripts/build-blog.mjs`, `v4/src/pages/Blog/`

## 채널 키
publish_records.channel = 'self_hosted' (이전 'wordpress' 대체)
translations.channel_type = 'blog' (기존 그대로 — translations는 채널 무관)
```

`MEMORY.md`에 1줄 추가:
```markdown
- [Self-Hosted Blog Publishing](self_hosted_blog.md) — 187/dflo 본진 블로그 자동 예약 발행 흐름
```

- [ ] **Step 3: Plan/Spec 상태 마킹**

Plan 파일 ## Done 섹션은 이미 작성됨. spec 파일 상단에 한 줄 추가:
```bash
# docs/superpowers/specs/2026-05-18-self-hosted-blog-publishing-design.md 상단 frontmatter 아래에:
# > **Status:** ✅ Implemented (YYYY-MM-DD) — see plans/2026-05-18-self-hosted-blog-publishing.md
```

- [ ] **Step 4: 사용자 워크플로우 마무리 — commit + push**

사용자 글로벌 CLAUDE.md "업데이트 하자" 워크플로우 4단계 준수:

```bash
cd C:/projects/ContentFlow
git add contentflow/CLAUDE.md contentflow/docs/superpowers/
git commit -m "docs: sync CLAUDE.md + mark self-hosted blog spec as implemented"
git push origin main
```

dflo 리포도 push:
```bash
cd C:/projects/dflo_0.1
git push origin main
```

memory 파일 `~/.claude/projects/.../memory/self_hosted_blog.md`은 Task 18 Step 2에서 이미 작성됨 — 별도 push 없음 (사용자 로컬 영역).

---

**Chunk 4 완료 검증:**

- [ ] 수동 E2E 시나리오 9 step 모두 통과 (예약 → cron transition → webhook fire → dflo build:blog → 정적 HTML 생성)
- [ ] WordPress REST 발행 라우트 제거됨
- [ ] 프로젝트 설정 WP credentials UI 제거됨
- [ ] CLAUDE.md / memory 동기화
- [ ] ContentFlow 2개 commit 추가

---

## Done — Definition of Done 체크리스트

- [ ] **DB**: published_site 컬럼, channel enum, deploy_webhook_queue 테이블, pg_cron 잡 모두 적용·검증됨
- [ ] **API**: `/api/blog/by-project/{pid}/posts` publish_records 기반 + 다국어 fallback skip
- [ ] **UI**: 프로젝트 설정 PublishedSiteSection, 콘텐츠 편집기 "내부 블로그" 탭, 발행 큐 self_hosted 카드, BulkScheduleDialog 5단계 모두 동작
- [ ] **Cron**: pg_cron `publish-self-hosted` + Vercel cron `/api/cron/fire-deploy-webhooks` 두 루프 가동
- [ ] **dflo**: build-blog.mjs로 정적 HTML 생성 + 4개 라우트 (`/blog`, `/blog/:slug`, `/th/blog`, `/th/blog/:slug`)
- [ ] **WordPress 제거**: 발행 라우트·UI·credentials 입력 모두 제거. DB 컬럼 `wp_credentials`만 잔존(다음 정리)
- [ ] **E2E**: KR+TH 각 1건 예약 → cron transition → webhook fire → dflo prerender → 정적 HTML 2건 노출 확인
- [ ] **테스트**: schedule-distribution vitest 5건 + API integration 3건 + 1 todo 통과
- [ ] **문서**: spec/plan에 ✅ Implemented 마킹, CLAUDE.md / memory 동기화
- [ ] **Git**: ContentFlow + dflo 모두 push 완료

**다음 작업**: Phase B (별도 spec) — 70개 한국어 + 70개 태국어 SEO 블로그 글 일괄 제작 + ComfyUI(`C:\ComfyUI_windows_portable`) 이미지 200~350장 생성. 발행은 본 Phase A의 일괄 예약 마법사 활용 — 주 5회, 4~6주 분산.
