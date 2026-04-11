# Phase 6: Supabase 실제 데이터 연동 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** IndexedDB 기반의 useProjectStore를 Supabase 실시간 연동으로 전환. 31개 파일이 사용하는 기존 store를 점진적으로 마이그레이션하여 모든 데이터가 Supabase에 저장/조회되도록 한다.

**Architecture:** 기존 useProjectStore의 CRUD 메서드를 Supabase 호출로 교체하는 "Inside-Out" 전략. 컴포넌트 코드는 최소한으로 변경하고, store 내부만 Supabase 클라이언트로 전환. IndexedDB persistence 제거 후 Supabase가 단일 데이터 소스가 됨.

**Tech Stack:** Supabase (PostgreSQL + RLS), @supabase/ssr, Zustand 5

**Spec:** `docs/superpowers/specs/2026-04-11-contentflow-v2-design.md`

---

## 전략: Inside-Out Migration

**왜 Inside-Out인가?**
- 31개 파일이 `useProjectStore`를 사용 중
- 컴포넌트마다 수정하면 오래 걸리고 버그 리스크 높음
- 대신 **store 내부만 바꾸면** 컴포넌트는 자동으로 Supabase 연동됨

**방식:**
```
Before: Component → useProjectStore() → Zustand state (IndexedDB)
After:  Component → useProjectStore() → Zustand state + Supabase sync
```

store의 각 CRUD 메서드가:
1. Supabase에 먼저 쓰기
2. 성공하면 Zustand state 업데이트 (UI 즉시 반영)
3. 앱 시작 시 Supabase에서 데이터 로드 → Zustand에 세팅

---

## Task 1: Supabase 인증 연동 — Store에 user_id 주입

**Files:**
- Create: `src/hooks/use-auth.ts`
- Modify: `src/app/(dashboard)/layout.tsx` — 인증된 사용자 정보 로드

현재 store의 CRUD 메서드들은 `user_id`를 안 넣고 있음. Supabase RLS가 `auth.uid()`를 사용하므로, 인증된 클라이언트를 사용하면 자동으로 처리됨.

- [ ] **Step 1: Create useAuth hook**

```typescript
// src/hooks/use-auth.ts
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

- [ ] **Step 2: Add auth guard to dashboard layout**

Read `src/app/(dashboard)/layout.tsx`. Add `useAuth()` to ensure user is loaded before rendering children. Show loading skeleton while auth is resolving.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-auth.ts src/app/\(dashboard\)/layout.tsx
git commit -m "feat: add useAuth hook and auth guard to dashboard"
```

---

## Task 2: Store 리팩토링 — 데이터 로드를 Supabase에서

**Files:**
- Modify: `src/stores/project-store.ts` — 앱 시작 시 Supabase에서 데이터 로드

현재 store는 IndexedDB에서 persist된 데이터를 자동으로 복원함. 이를 Supabase fetch로 교체.

- [ ] **Step 1: Add loadFromSupabase 메서드**

store에 새 메서드 추가:

```typescript
loadFromSupabase: async () => {
  const supabase = createClient()
  
  // Load projects
  const { data: projects } = await supabase.from('projects').select('*').order('sort_order')
  if (projects) set({ projects })

  // Load contents for selected project
  const selectedProjectId = get().selectedProjectId
  if (selectedProjectId) {
    const { data: contents } = await supabase.from('contents').select('*')
      .eq('project_id', selectedProjectId).order('sort_order')
    if (contents) set({ contents })
  }
}
```

- [ ] **Step 2: Call loadFromSupabase on app start**

In dashboard layout, after auth is confirmed, call `useProjectStore.getState().loadFromSupabase()`

- [ ] **Step 3: Commit**

---

## Task 3: Project CRUD → Supabase

**Files:**
- Modify: `src/stores/project-store.ts` — addProject, updateProject, deleteProject

- [ ] **Step 1: Modify addProject**

```typescript
addProject: async (name: string) => {
  const supabase = createClient()
  const id = generateId('proj')
  const now = new Date().toISOString()
  const newProject = { id, name, sort_order: get().projects.length, created_at: now, updated_at: now }

  // Write to Supabase first
  const { error } = await supabase.from('projects').insert(newProject)
  if (error) { console.error('Failed to create project:', error); return }

  // Update local state
  set((s) => ({ projects: [...s.projects, newProject as any] }))
  get().selectProject(id)
}
```

- [ ] **Step 2: Modify updateProject**

```typescript
updateProject: async (id: string, updates: Partial<Project>) => {
  const supabase = createClient()
  const { error } = await supabase.from('projects').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) { console.error('Failed to update project:', error); return }

  set((s) => ({
    projects: s.projects.map((p) => p.id === id ? { ...p, ...updates } : p),
  }))
}
```

- [ ] **Step 3: Modify deleteProject**

```typescript
deleteProject: async (id: string) => {
  const supabase = createClient()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) { console.error('Failed to delete project:', error); return }

  set((s) => ({
    projects: s.projects.filter((p) => p.id !== id),
    selectedProjectId: s.selectedProjectId === id ? null : s.selectedProjectId,
    // ... cascade clear related data
  }))
}
```

- [ ] **Step 4: Test — create project, refresh, verify it persists from Supabase**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: migrate project CRUD to Supabase"
```

---

## Task 4: Content CRUD → Supabase

**Files:**
- Modify: `src/stores/project-store.ts` — addContent, updateContent, deleteContent, selectProject (load contents)

- [ ] **Step 1: Modify selectProject to load contents from Supabase**

```typescript
selectProject: async (id: string | null) => {
  set({ selectedProjectId: id, selectedContentId: null, showProjectSettings: false })
  if (!id) { set({ contents: [] }); return }

  const supabase = createClient()
  const { data } = await supabase.from('contents').select('*').eq('project_id', id).order('sort_order')
  if (data) set({ contents: data })
}
```

- [ ] **Step 2: Modify addContent, updateContent, deleteContent**

Same pattern as Task 3: Supabase first → local state update.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: migrate content CRUD to Supabase"
```

---

## Task 5: BaseArticle CRUD → Supabase

**Files:**
- Modify: `src/stores/project-store.ts` — createOrUpdateBaseArticle, getBaseArticle

- [ ] **Step 1: Modify getBaseArticle to fetch from Supabase if not in local cache**

- [ ] **Step 2: Modify createOrUpdateBaseArticle to write to Supabase**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: migrate base article CRUD to Supabase"
```

---

## Task 6: Blog Content/Cards CRUD → Supabase

**Files:**
- Modify: `src/stores/project-store.ts` — all blog-related methods

This is the most complex migration because blog panel has the most CRUD operations: addBlogContent, updateBlogContent, deleteBlogContent, getBlogContents, addBlogCard, updateBlogCard, deleteBlogCard, getBlogCards, setBlogCardsForContent.

- [ ] **Step 1: Modify getBlogContents to fetch from Supabase**

When `selectContent(id)` is called, also load blog contents:

```typescript
selectContent: async (id: string | null) => {
  set({ selectedContentId: id })
  if (!id) return

  const supabase = createClient()
  // Load all channel contents for this content
  const [blogRes, instaRes, threadsRes, ytRes] = await Promise.all([
    supabase.from('blog_contents').select('*').eq('content_id', id),
    supabase.from('instagram_contents').select('*').eq('content_id', id),
    supabase.from('threads_contents').select('*').eq('content_id', id),
    supabase.from('youtube_contents').select('*').eq('content_id', id),
  ])

  set({
    blogContents: blogRes.data || [],
    instagramContents: instaRes.data || [],
    threadsContents: threadsRes.data || [],
    youtubeContents: ytRes.data || [],
  })
}
```

- [ ] **Step 2: Modify blog CRUD methods**

Each method: Supabase write → local state update. For cards, also load on blog content expand.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: migrate blog content/cards CRUD to Supabase"
```

---

## Task 7: Instagram/Threads/YouTube CRUD → Supabase

**Files:**
- Modify: `src/stores/project-store.ts`

Same pattern as Task 6 for remaining channels.

- [ ] **Step 1: Instagram content/cards**
- [ ] **Step 2: Threads content/cards**
- [ ] **Step 3: YouTube content/cards**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: migrate instagram/threads/youtube CRUD to Supabase"
```

---

## Task 8: Strategy CRUD → Supabase

**Files:**
- Modify: `src/stores/project-store.ts` — strategy methods

Strategy uses a `marketing_strategies` table (from the initial schema). Migrate createOrUpdateStrategy, updateStrategyTab, deleteStrategy.

- [ ] **Step 1: Migrate strategy methods**
- [ ] **Step 2: Commit**

```bash
git commit -m "feat: migrate strategy CRUD to Supabase"
```

---

## Task 9: Remove IndexedDB Persistence

**Files:**
- Modify: `src/stores/project-store.ts` — remove persist middleware

Now that all CRUD goes through Supabase, IndexedDB persistence is no longer needed.

- [ ] **Step 1: Remove idb-keyval imports and persist wrapper**

Remove:
- `import { get, set, del } from 'idb-keyval'`
- The custom storage adapter
- The `persist()` middleware wrapper
- `createJSONStorage` usage

Keep the store as a plain Zustand store (no persistence — data comes from Supabase on load).

- [ ] **Step 2: Remove `partialize` config**

- [ ] **Step 3: Test — app reload should load data from Supabase, not IndexedDB**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: remove IndexedDB persistence, Supabase is single source of truth"
```

---

## Task 10: Build + Integration Test

- [ ] **Step 1: Run tests** — `npx vitest run`
- [ ] **Step 2: Run build** — `rm -rf .next && npx next build`
- [ ] **Step 3: Manual E2E test**

1. Login → dashboard loads
2. Create project → check Supabase dashboard (Table Editor → projects)
3. Create content → check Supabase
4. Write base article → check Supabase
5. Generate blog content → check Supabase
6. Refresh page → all data reloads from Supabase
7. Delete content → verify cascade in Supabase
8. Create second user → verify RLS (can't see other's projects)

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: complete Phase 6 — full Supabase data integration"
```

---

## Risk & Rollback

**Risk:** Store의 1247줄을 수정하므로 중간에 깨질 수 있음.

**Mitigation:**
- 각 Task 후 빌드 확인
- Task 3 (Project) 성공 확인 후 나머지 진행
- 문제 시 git revert로 이전 커밋으로 복구

**Rollback:**
- `git revert` + IndexedDB persistence 다시 활성화
