# Phase 1: 기반 구조 리팩토링 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ContentFlow의 레이아웃을 사이드바 모듈형으로 전환하고, IndexedDB에서 Supabase로 데이터 레이어를 마이그레이션하며, 인증/권한 시스템을 추가한다.

**Architecture:** 기존 아우터/이너 패널 구조를 좌측 사이드바 + 우측 메인 영역으로 교체. Zustand store의 IndexedDB persistence를 Supabase 클라이언트로 전환. Supabase Auth + RLS로 팀 멤버 관리. ChannelType에 'wordpress'와 'naver_blog' 추가.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Zustand 5, Supabase (Auth + PostgreSQL + RLS), TipTap

**Spec:** `docs/superpowers/specs/2026-04-11-contentflow-v2-design.md`

---

## File Structure Overview

### New Files
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx               # Login page
│   │   └── layout.tsx                   # Auth layout (centered, no sidebar)
│   ├── (dashboard)/
│   │   ├── layout.tsx                   # New sidebar layout
│   │   ├── content/page.tsx             # Content creation module
│   │   ├── ideas/page.tsx               # Ideas module (placeholder)
│   │   ├── calendar/page.tsx            # Calendar module (placeholder)
│   │   ├── publish/page.tsx             # Publishing module (placeholder)
│   │   ├── monitoring/page.tsx          # Monitoring module (placeholder)
│   │   ├── seo/page.tsx                 # SEO module (placeholder)
│   │   ├── analytics/page.tsx           # Analytics module
│   │   ├── competitors/page.tsx         # Competitor analysis (placeholder)
│   │   ├── strategy/page.tsx            # Marketing strategy
│   │   └── settings/page.tsx            # Project settings
│   ├── api/
│   │   └── auth/
│   │       └── callback/route.ts        # Supabase OAuth callback
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx                  # New sidebar navigation
│   │   ├── sidebar-nav-item.tsx         # Individual nav item
│   │   ├── project-switcher.tsx         # Project dropdown
│   │   └── top-bar.tsx                  # Page title bar
│   └── auth/
│       └── login-form.tsx               # Email/password login form
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # Browser Supabase client
│   │   ├── server.ts                    # Server Supabase client
│   │   └── middleware.ts                # Auth middleware helper
│   └── migrations/
│       └── migrate-indexeddb.ts         # One-time migration utility
├── middleware.ts                         # Next.js middleware (auth redirect)
supabase/
└── migrations/
    ├── 001_initial_schema.sql           # Existing (update)
    ├── 002_auth_and_rls.sql             # Auth tables + RLS policies
    └── 003_new_channel_types.sql        # ChannelType updates
```

### Modified Files
```
src/
├── app/
│   └── dashboard/                       # DELETE entire folder (replaced by (dashboard))
├── stores/
│   └── project-store.ts                 # Replace IndexedDB with Supabase client
├── types/
│   └── database.ts                      # Add new types, update ChannelType
├── components/
│   └── content/
│       └── content-tabs.tsx             # Minor: remove layout responsibility
```

---

## Task 0: Prerequisites & Setup

- [ ] **Step 1: Install Supabase packages**

Run: `cd contentflow && npm install @supabase/ssr`
(`@supabase/supabase-js` is already installed)

- [ ] **Step 2: Set up environment variables**

Ensure `.env.local` has these Supabase values configured:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 3: Link Supabase project**

Run: `npx supabase link --project-ref your-project-ref`
Then apply existing migrations: `npx supabase db push`

- [ ] **Step 4: Commit**

```bash
cd contentflow && git add package.json package-lock.json .env.local.example
git commit -m "chore: add @supabase/ssr package and update env template"
```

---

## Task 1: Supabase Client Setup

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Test: `src/lib/__tests__/supabase-client.test.ts`

Uses `@supabase/ssr` for both browser and server clients to ensure consistent cookie-based auth handling across the app.

- [ ] **Step 1: Write failing test for browser client**

```typescript
// src/lib/__tests__/supabase-client.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({ from: vi.fn() })),
}))

describe('createClient', () => {
  it('creates a browser Supabase client with env vars', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    const { createClient } = await import('@/lib/supabase/client')
    const client = createClient()
    expect(client).toBeDefined()
    expect(client.from).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd contentflow && npx vitest run src/lib/__tests__/supabase-client.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement browser client**

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: Implement server client**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd contentflow && npx vitest run src/lib/__tests__/supabase-client.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd contentflow && git add src/lib/supabase/ src/lib/__tests__/supabase-client.test.ts
git commit -m "feat: add Supabase client setup (browser + server)"
```

---

## Task 2: Supabase Migration — Auth & RLS

**Files:**
- Create: `supabase/migrations/002_auth_and_rls.sql`
- Create: `supabase/migrations/003_new_channel_types.sql`
- Modify: `supabase/migrations/001_initial_schema.sql` (reference only, don't modify in production)

- [ ] **Step 1: Create auth migration with RLS**

```sql
-- supabase/migrations/002_auth_and_rls.sql

-- Project members table
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is member of project
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
    AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Projects: members can read, admins can update/delete
CREATE POLICY "Members can view projects"
  ON projects FOR SELECT
  USING (is_project_member(id));

CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = projects.id
    AND user_id = auth.uid()
    AND role = 'admin'
  ));

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = projects.id
    AND user_id = auth.uid()
    AND role = 'admin'
  ));

CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Contents: follow project membership
CREATE POLICY "Members can view contents"
  ON contents FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Editors+ can manage contents"
  ON contents FOR ALL
  USING (EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = contents.project_id
    AND user_id = auth.uid()
    AND role IN ('admin', 'editor')
  ));

-- Project members: admins manage, all members can view
CREATE POLICY "Members can view team"
  ON project_members FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Admins can manage team"
  ON project_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'admin'
  ));

-- Auto-add creator as admin when project is created
CREATE OR REPLACE FUNCTION add_project_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_creator();
```

- [ ] **Step 2: Create channel types migration**

```sql
-- supabase/migrations/003_new_channel_types.sql

-- Add target_languages to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_languages TEXT[] DEFAULT ARRAY['ko'];

-- Channel connections table
CREATE TABLE channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('wordpress', 'naver_blog', 'instagram', 'facebook', 'threads', 'youtube')),
  language TEXT NOT NULL DEFAULT 'ko',
  account_id TEXT,
  account_name TEXT,
  vault_secret_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, platform, language)
);

ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view channels"
  ON channel_connections FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Admins can manage channels"
  ON channel_connections FOR ALL
  USING (EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = channel_connections.project_id
    AND user_id = auth.uid()
    AND role = 'admin'
  ));
```

- [ ] **Step 3: Commit**

```bash
cd contentflow && git add supabase/migrations/
git commit -m "feat: add auth RLS policies and channel connection schema"
```

---

## Task 3: Update TypeScript Types

**Files:**
- Modify: `src/types/database.ts`
- Test: `src/types/__tests__/database.test.ts` (type-checking test)

- [ ] **Step 1: Write type test**

```typescript
// src/types/__tests__/database.test.ts
import { describe, it, expectTypeOf } from 'vitest'
import type { ChannelType, ProjectMember, ChannelConnection } from '@/types/database'

describe('database types', () => {
  it('ChannelType includes wordpress and naver_blog', () => {
    expectTypeOf<'wordpress'>().toMatchTypeOf<ChannelType>()
    expectTypeOf<'naver_blog'>().toMatchTypeOf<ChannelType>()
  })

  it('ProjectMember has required fields', () => {
    expectTypeOf<ProjectMember>().toHaveProperty('project_id')
    expectTypeOf<ProjectMember>().toHaveProperty('user_id')
    expectTypeOf<ProjectMember>().toHaveProperty('role')
  })

  it('ChannelConnection has required fields', () => {
    expectTypeOf<ChannelConnection>().toHaveProperty('platform')
    expectTypeOf<ChannelConnection>().toHaveProperty('language')
    expectTypeOf<ChannelConnection>().toHaveProperty('account_name')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd contentflow && npx vitest run src/types/__tests__/database.test.ts`
Expected: FAIL — types not found

- [ ] **Step 3: Update ChannelType and add new interfaces**

In `src/types/database.ts`, make these changes:

Replace the existing ChannelType:
```typescript
// OLD: type ChannelType = 'blog' | 'instagram' | 'threads' | 'youtube'
// NEW:
type ChannelType = 'wordpress' | 'naver_blog' | 'instagram' | 'facebook' | 'threads' | 'youtube'
```

Add at the end of the file:
```typescript
// === V2 Types ===

type MemberRole = 'admin' | 'editor' | 'viewer'

interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: MemberRole
  invited_at: string
  created_at: string
}

interface ChannelConnection {
  id: string
  project_id: string
  platform: ChannelType
  language: string
  account_id: string | null
  account_name: string | null
  vault_secret_id: string | null
  created_at: string
  updated_at: string
}

// Extend Project with target_languages
// Note: Add `target_languages: string[]` to the existing Project interface
```

Also add `target_languages: string[]` to the existing `Project` interface (after `api_keys` field).

- [ ] **Step 4: Update any 'blog' references to 'naver_blog'**

Search codebase for `'blog'` usage as ChannelType. Key files:
- `src/stores/project-store.ts` — content CRUD methods
- `src/components/content/content-tabs.tsx` — tab labels
- `src/lib/prompt-builder.ts` — channel-specific prompts

For each file, replace `'blog'` channel references with `'naver_blog'` where it refers to Naver blog. The existing blog editor functionality stays the same, just the type name changes.

- [ ] **Step 5: Run tests**

Run: `cd contentflow && npx vitest run`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
cd contentflow && git add src/types/ src/stores/ src/components/ src/lib/
git commit -m "feat: update ChannelType, add ProjectMember and ChannelConnection types"
```

---

## Task 4: Next.js Auth Middleware

**Files:**
- Create: `src/middleware.ts`
- Create: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Create middleware helper**

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if not authenticated (except auth pages)
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if authenticated and on login page
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/content'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 2: Create root middleware**

```typescript
// src/middleware.ts
import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
```

- [ ] **Step 3: Commit**

```bash
cd contentflow && git add src/middleware.ts src/lib/supabase/middleware.ts
git commit -m "feat: add auth middleware for route protection"
```

---

## Task 5: Login Page

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/components/auth/login-form.tsx`
- Create: `src/app/api/auth/callback/route.ts`

- [ ] **Step 1: Create auth layout**

```typescript
// src/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create login form component**

```typescript
// src/components/auth/login-form.tsx
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const supabase = createBrowserClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    window.location.href = '/content'
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">ContentFlow</h1>
        <p className="text-muted-foreground mt-1">
          {mode === 'login' ? '로그인' : '회원가입'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? '처리중...' : mode === 'login' ? '로그인' : '가입하기'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === 'login' ? (
          <>계정이 없으신가요? <button onClick={() => setMode('signup')} className="text-primary underline">회원가입</button></>
        ) : (
          <>이미 계정이 있으신가요? <button onClick={() => setMode('login')} className="text-primary underline">로그인</button></>
        )}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Create login page**

```typescript
// src/app/(auth)/login/page.tsx
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return <LoginForm />
}
```

- [ ] **Step 4: Create auth callback route**

```typescript
// src/app/api/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/content'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(next, request.url))
}
```

- [ ] **Step 5: Commit**

```bash
cd contentflow && git add src/app/\(auth\)/ src/components/auth/ src/app/api/auth/
git commit -m "feat: add login page and auth callback"
```

---

## Task 6: Sidebar Layout

**Files:**
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/sidebar-nav-item.tsx`
- Create: `src/components/layout/project-switcher.tsx`
- Create: `src/components/layout/top-bar.tsx`
- Create: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create SidebarNavItem component**

```typescript
// src/components/layout/sidebar-nav-item.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SidebarNavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  badge?: number
}

export function SidebarNavItem({ href, icon, label, badge }: SidebarNavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      )}
    >
      <span className="text-base shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: Create ProjectSwitcher component**

```typescript
// src/components/layout/project-switcher.tsx
'use client'

import { useProjectStore } from '@/stores/project-store'

export function ProjectSwitcher() {
  const { projects, selectedProjectId, selectProject } = useProjectStore()
  const selectedProject = projects.find(p => p.id === selectedProjectId)

  return (
    <div className="p-3 border-b border-border">
      <button
        className="w-full flex items-center gap-2 bg-accent/50 hover:bg-accent px-3 py-2 rounded-lg transition-colors"
        onClick={() => {/* TODO: dropdown */}}
      >
        <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
          {selectedProject?.name?.charAt(0) || '?'}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-semibold truncate">
            {selectedProject?.name || '프로젝트 선택'}
          </div>
        </div>
        <span className="text-muted-foreground text-xs">▼</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create Sidebar component**

```typescript
// src/components/layout/sidebar.tsx
'use client'

import { ProjectSwitcher } from './project-switcher'
import { SidebarNavItem } from './sidebar-nav-item'
import { Settings, User } from 'lucide-react'

const navGroups = [
  {
    label: '콘텐츠',
    items: [
      { href: '/content', icon: '📝', label: '콘텐츠 생성' },
      { href: '/ideas', icon: '💡', label: '아이디어' },
      { href: '/calendar', icon: '📅', label: '캘린더' },
    ],
  },
  {
    label: '발행',
    items: [
      { href: '/publish', icon: '🚀', label: '채널 발행' },
      { href: '/monitoring', icon: '💬', label: '모니터링' },
    ],
  },
  {
    label: '분석',
    items: [
      { href: '/seo', icon: '🔍', label: 'SEO 분석' },
      { href: '/analytics', icon: '📊', label: '애널리틱스' },
      { href: '/competitors', icon: '🎯', label: '경쟁사 분석' },
    ],
  },
  {
    label: '전략',
    items: [
      { href: '/strategy', icon: '💡', label: '마케팅 전략' },
    ],
  },
]

export function Sidebar() {
  return (
    <aside className="w-56 bg-card border-r border-border flex flex-col h-full shrink-0">
      <ProjectSwitcher />

      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarNavItem key={item.href} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-2 border-t border-border space-y-0.5">
        <SidebarNavItem href="/settings" icon={<Settings size={16} />} label="설정" />
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Create TopBar component**

```typescript
// src/components/layout/top-bar.tsx
'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/content': '콘텐츠 생성',
  '/ideas': '아이디어',
  '/calendar': '캘린더',
  '/publish': '채널 발행',
  '/monitoring': '모니터링',
  '/seo': 'SEO 분석',
  '/analytics': '애널리틱스',
  '/competitors': '경쟁사 분석',
  '/strategy': '마케팅 전략',
  '/settings': '설정',
}

export function TopBar() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || ''

  return (
    <div className="h-12 border-b border-border flex items-center px-5 shrink-0">
      <h1 className="text-sm font-semibold">{title}</h1>
    </div>
  )
}
```

- [ ] **Step 5: Create dashboard layout with sidebar**

```typescript
// src/app/(dashboard)/layout.tsx
'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
cd contentflow && git add src/components/layout/ src/app/\(dashboard\)/layout.tsx
git commit -m "feat: add sidebar layout with module navigation"
```

---

## Task 7: Route Migration — Move Dashboard Pages

**Files:**
- Create: `src/app/(dashboard)/content/page.tsx`
- Create: `src/app/(dashboard)/analytics/page.tsx`
- Create: `src/app/(dashboard)/strategy/page.tsx`
- Create: `src/app/(dashboard)/settings/page.tsx`
- Create placeholder pages for: ideas, calendar, publish, monitoring, seo, competitors
- Delete: `src/app/dashboard/` (old route group)

- [ ] **Step 1: Create content page (port from dashboard/page.tsx)**

Read `src/app/dashboard/page.tsx` for current logic. The content page should render the existing content-tabs and project-settings components based on state. Port the conditional rendering logic (lines 27-58 of the old dashboard page) but remove strategy/analytics conditions — those are now separate routes.

```typescript
// src/app/(dashboard)/content/page.tsx
'use client'

import { useProjectStore } from '@/stores/project-store'
import { ContentTabs } from '@/components/content/content-tabs'
import { ProjectSettings } from '@/components/project/project-settings'

export default function ContentPage() {
  const { selectedProjectId, selectedContentId, showProjectSettings } = useProjectStore()

  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        좌측에서 프로젝트를 선택하세요
      </div>
    )
  }

  if (showProjectSettings || !selectedContentId) {
    return <ProjectSettings />
  }

  return <ContentTabs />
}
```

- [ ] **Step 2: Create analytics page**

```typescript
// src/app/(dashboard)/analytics/page.tsx
'use client'

import { useProjectStore } from '@/stores/project-store'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

export default function AnalyticsPage() {
  const { selectedProjectId } = useProjectStore()

  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        프로젝트를 선택하세요
      </div>
    )
  }

  return <AnalyticsDashboard />
}
```

- [ ] **Step 3: Create strategy page**

```typescript
// src/app/(dashboard)/strategy/page.tsx
'use client'

import { useProjectStore } from '@/stores/project-store'
import { StrategyDashboard } from '@/components/strategy/strategy-dashboard'

export default function StrategyPage() {
  const { selectedProjectId } = useProjectStore()

  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        프로젝트를 선택하세요
      </div>
    )
  }

  return <StrategyDashboard />
}
```

- [ ] **Step 4: Create settings page**

```typescript
// src/app/(dashboard)/settings/page.tsx
'use client'

import { useProjectStore } from '@/stores/project-store'
import { ProjectSettings } from '@/components/project/project-settings'

export default function SettingsPage() {
  const { selectedProjectId } = useProjectStore()

  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        프로젝트를 선택하세요
      </div>
    )
  }

  return <ProjectSettings />
}
```

- [ ] **Step 5: Create placeholder pages for new modules**

Each placeholder follows the same pattern:

```typescript
// src/app/(dashboard)/ideas/page.tsx (and similar for calendar, publish, monitoring, seo, competitors)
export default function IdeasPage() {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <p className="text-4xl mb-4">💡</p>
        <p className="text-lg font-medium">아이디어</p>
        <p className="text-sm">Phase 4에서 구현 예정</p>
      </div>
    </div>
  )
}
```

Create 6 placeholder pages: ideas, calendar, publish, monitoring, seo, competitors.

- [ ] **Step 6: Update root page redirect**

```typescript
// src/app/page.tsx
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/content')
}
```

- [ ] **Step 7: Remove old dashboard folder**

Delete `src/app/dashboard/` entirely (layout.tsx, page.tsx, loading.tsx, error.tsx, strategy/).

- [ ] **Step 8: Run the app and verify**

Run: `cd contentflow && npm run dev`
- Verify: `/content` shows sidebar + content area
- Verify: sidebar navigation links work
- Verify: `/analytics`, `/strategy`, `/settings` load correct components
- Verify: placeholder pages show for future modules

- [ ] **Step 9: Commit**

```bash
cd contentflow && git add -A
git commit -m "feat: migrate routes from /dashboard to sidebar layout with module pages"
```

---

## Task 8: Sidebar Project List Integration

**Files:**
- Modify: `src/components/layout/sidebar.tsx` — add project list below project switcher
- Modify: `src/components/layout/project-switcher.tsx` — dropdown with project list

The old `project-tree.tsx` sidebar showed a hierarchical project/content list. In the new layout, the project switcher dropdown handles project selection, and the content list remains within the content page itself.

- [ ] **Step 1: Upgrade ProjectSwitcher with dropdown**

Update `src/components/layout/project-switcher.tsx` to show a dropdown menu listing all projects when clicked. Use shadcn/ui `DropdownMenu` component. Include a "+ 새 프로젝트" button at the bottom that triggers `CreateProjectDialog`.

The `selectProject` function from the store should be called when a project is selected.

- [ ] **Step 2: Move content list into content page**

The current `project-tree.tsx` shows both projects and content list. Since projects are now in the switcher, the content list should be rendered inside `src/app/(dashboard)/content/page.tsx` as a left panel, keeping the existing left(list) + right(editor) layout within the content module.

Read `src/components/sidebar/project-tree.tsx` to understand what it renders. The content list portion should be extracted or the content page should render it directly.

- [ ] **Step 3: Test navigation flow**

- Select project via switcher → content list updates
- Click content → editor opens on right
- Switch modules via sidebar → content area changes
- Switch project → all module data refreshes

- [ ] **Step 4: Commit**

```bash
cd contentflow && git add -A
git commit -m "feat: integrate project switcher dropdown and content list"
```

---

## Task 9a: Supabase Query Layer

**Files:**
- Create: `src/lib/supabase/queries.ts`
- Test: `src/lib/__tests__/supabase-queries.test.ts`

- [ ] **Step 1: Create Supabase query helpers for all tables**

```typescript
// src/lib/supabase/queries.ts
import { createClient } from './client'
import type { Project, Content, BaseArticle, BlogContent, BlogCard,
  InstagramContent, InstagramCard, ThreadsContent, ThreadsCard,
  YoutubeContent, YoutubeCard } from '@/types/database'

function getClient() {
  return createClient()
}

export const projectQueries = {
  list: () => getClient().from('projects').select('*').order('sort_order'),
  get: (id: string) => getClient().from('projects').select('*').eq('id', id).single(),
  create: (data: Partial<Project>) => getClient().from('projects').insert(data).select().single(),
  update: (id: string, data: Partial<Project>) => getClient().from('projects').update(data).eq('id', id),
  delete: (id: string) => getClient().from('projects').delete().eq('id', id),
}

export const contentQueries = {
  listByProject: (projectId: string) =>
    getClient().from('contents').select('*').eq('project_id', projectId).order('sort_order'),
  create: (data: Partial<Content>) => getClient().from('contents').insert(data).select().single(),
  update: (id: string, data: Partial<Content>) => getClient().from('contents').update(data).eq('id', id),
  delete: (id: string) => getClient().from('contents').delete().eq('id', id),
}

export const baseArticleQueries = {
  getByContent: (contentId: string) =>
    getClient().from('base_articles').select('*').eq('content_id', contentId).single(),
  create: (data: Partial<BaseArticle>) => getClient().from('base_articles').insert(data).select().single(),
  update: (id: string, data: Partial<BaseArticle>) => getClient().from('base_articles').update(data).eq('id', id),
  delete: (id: string) => getClient().from('base_articles').delete().eq('id', id),
}

// Repeat same pattern for:
// blogContentQueries, blogCardQueries
// instagramContentQueries, instagramCardQueries
// threadsContentQueries, threadsCardQueries
// youtubeContentQueries, youtubeCardQueries
// Each with: getByContent/listByParent, create, update, delete
```

Create query helpers for ALL 10 entity types following this exact pattern.

- [ ] **Step 2: Write basic test**

```typescript
// src/lib/__tests__/supabase-queries.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
  }),
}))

describe('projectQueries', () => {
  it('list returns a query builder', async () => {
    const { projectQueries } = await import('@/lib/supabase/queries')
    const result = projectQueries.list()
    expect(result).toBeDefined()
  })
})
```

- [ ] **Step 3: Run test**

Run: `cd contentflow && npx vitest run src/lib/__tests__/supabase-queries.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd contentflow && git add src/lib/supabase/queries.ts src/lib/__tests__/supabase-queries.test.ts
git commit -m "feat: add Supabase query layer for all entity types"
```

---

## Task 9b: Data Hooks

**Files:**
- Create: `src/hooks/use-projects.ts`
- Create: `src/hooks/use-contents.ts`
- Create: `src/hooks/use-channel-data.ts`

- [ ] **Step 1: Create useProjects hook**

```typescript
// src/hooks/use-projects.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { projectQueries } from '@/lib/supabase/queries'
import type { Project } from '@/types/database'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data } = await projectQueries.list()
    if (data) setProjects(data)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { projects, loading, refresh }
}

export function useProject(id: string | null) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setProject(null); setLoading(false); return }
    projectQueries.get(id).then(({ data }) => {
      setProject(data)
      setLoading(false)
    })
  }, [id])

  return { project, loading }
}
```

- [ ] **Step 2: Create useContents hook**

```typescript
// src/hooks/use-contents.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { contentQueries } from '@/lib/supabase/queries'
import type { Content } from '@/types/database'

export function useContents(projectId: string | null) {
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!projectId) { setContents([]); setLoading(false); return }
    const { data } = await contentQueries.listByProject(projectId)
    if (data) setContents(data)
    setLoading(false)
  }, [projectId])

  useEffect(() => { refresh() }, [refresh])

  return { contents, loading, refresh }
}
```

- [ ] **Step 3: Create useChannelData hook**

A generic hook for fetching channel-specific data (baseArticle, blogContent, blogCards, etc.) by content_id. Create one hook per channel type following the same pattern as above.

- [ ] **Step 4: Commit**

```bash
cd contentflow && git add src/hooks/
git commit -m "feat: add data hooks wrapping Supabase queries"
```

---

## Task 9c: Refactor Store to UI-Only + Update Components

**Files:**
- Modify: `src/stores/project-store.ts` → rename to `src/stores/ui-store.ts`
- Modify: ALL components that use `useProjectStore()`

This is a systematic migration. The store keeps ONLY UI state. All data CRUD goes through hooks + queries.

- [ ] **Step 1: Create new UI-only store**

```typescript
// src/stores/ui-store.ts
import { create } from 'zustand'

interface UIState {
  selectedProjectId: string | null
  selectedContentId: string | null
  sidebarCollapsed: boolean
  showProjectSettings: boolean

  selectProject: (id: string | null) => void
  selectContent: (id: string | null) => void
  toggleSidebar: () => void
  setShowProjectSettings: (show: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedProjectId: null,
  selectedContentId: null,
  sidebarCollapsed: false,
  showProjectSettings: false,

  selectProject: (id) => set({ selectedProjectId: id, selectedContentId: null }),
  selectContent: (id) => set({ selectedContentId: id }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setShowProjectSettings: (show) => set({ showProjectSettings: show }),
}))
```

- [ ] **Step 2: Audit all useProjectStore() usages**

Run: `cd contentflow && grep -r "useProjectStore" src/ --include="*.tsx" --include="*.ts" -l`

For each file found, replace:
- Data reads (`projects`, `contents`, `blogContents`, etc.) → use data hooks
- Data writes (`addProject`, `updateContent`, etc.) → use Supabase queries directly
- UI state reads/writes (`selectedProjectId`, `showProjectSettings`, etc.) → use `useUIStore()`

- [ ] **Step 3: Update components one group at a time**

Order: layout components → content components → strategy → analytics → project settings.
Test after each group to catch regressions early.

- [ ] **Step 4: Remove old store file**

Delete `src/stores/project-store.ts` once all references are migrated to `useUIStore` + hooks.
Remove `idb-keyval` import and IndexedDB persistence code.

- [ ] **Step 5: Run full test suite**

Run: `cd contentflow && npx vitest run`
Fix any failing tests.

- [ ] **Step 6: Manual smoke test**

Run: `cd contentflow && npm run dev`
- Create project → verify Supabase persistence
- Create content → verify persistence
- Refresh → data loads from Supabase
- Switch projects → data isolation works

- [ ] **Step 7: Commit**

```bash
cd contentflow && git add -A
git commit -m "feat: migrate store to UI-only, data layer via Supabase hooks"
```

---

## Task 10: IndexedDB Migration Utility

**Files:**
- Create: `src/lib/migrations/migrate-indexeddb.ts`
- Create: `src/app/(dashboard)/settings/migrate/page.tsx`

For users with existing IndexedDB data, provide a one-time migration page.

- [ ] **Step 1: Create migration utility**

```typescript
// src/lib/migrations/migrate-indexeddb.ts
import { get } from 'idb-keyval'
import { createBrowserClient } from '@/lib/supabase/client'

export async function migrateFromIndexedDB(): Promise<{ success: boolean; message: string }> {
  const supabase = createBrowserClient()

  try {
    // Read old Zustand persisted state from IndexedDB
    const oldState = await get('project-storage')
    if (!oldState) return { success: true, message: 'No data to migrate' }

    const parsed = JSON.parse(oldState as string)
    const state = parsed?.state

    if (!state?.projects?.length) return { success: true, message: 'No projects found' }

    // Migrate projects
    for (const project of state.projects) {
      const { error } = await supabase.from('projects').upsert(project)
      if (error) throw error
    }

    // Migrate contents and all channel data
    for (const content of state.contents || []) {
      await supabase.from('contents').upsert(content)
    }
    for (const item of state.baseArticles || []) {
      await supabase.from('base_articles').upsert(item)
    }
    for (const item of state.blogContents || []) {
      await supabase.from('blog_contents').upsert(item)
    }
    for (const item of state.blogCards || []) {
      await supabase.from('blog_cards').upsert(item)
    }
    // ... same for instagram, threads, youtube

    return { success: true, message: `Migrated ${state.projects.length} projects` }
  } catch (err) {
    return { success: false, message: String(err) }
  }
}
```

- [ ] **Step 2: Create migration page in settings**

A simple page with a "마이그레이션 시작" button that calls the utility and shows results.

- [ ] **Step 3: Commit**

```bash
cd contentflow && git add src/lib/migrations/ src/app/\(dashboard\)/settings/migrate/
git commit -m "feat: add one-time IndexedDB to Supabase migration utility"
```

---

## Task 11: Project Settings — Languages & Channels

**Files:**
- Modify: `src/components/project/project-settings.tsx` — add language and channel tabs
- Create: `src/components/project/target-languages-section.tsx`
- Create: `src/components/project/channel-connections-section.tsx`

- [ ] **Step 1: Create target languages section**

A component that shows current target languages as badges and allows adding/removing. Uses the `target_languages` field on the Project.

- [ ] **Step 2: Create channel connections section**

A component that shows connected channels (WordPress/Meta/YouTube) with their language mappings and connection status. For now, store API credentials directly — OAuth flows will be implemented in Phase 2.

- [ ] **Step 3: Add tabs to project settings**

The existing `project-settings.tsx` has 10 tabs. Add 2 more:
- "언어" tab → `TargetLanguagesSection`
- "채널 연동" tab → `ChannelConnectionsSection`

- [ ] **Step 4: Commit**

```bash
cd contentflow && git add src/components/project/
git commit -m "feat: add language and channel connection settings"
```

---

## Task 12: seomachine FastAPI Microservice Setup

**Files:**
- Create: `seo-service/requirements.txt`
- Create: `seo-service/main.py`
- Create: `seo-service/Dockerfile`

Basic scaffolding for the Python SEO analysis service. Full module integration happens in Phase 3.

- [ ] **Step 1: Create FastAPI project**

```
seo-service/
├── main.py
├── requirements.txt
└── Dockerfile
```

```python
# seo-service/requirements.txt
fastapi==0.115.0
uvicorn==0.34.0
textstat==0.7.13
nltk==3.9.4
```

- [ ] **Step 2: Create minimal FastAPI app**

```python
# seo-service/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ContentFlow SEO Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze/readability")
def analyze_readability(body: dict):
    """Placeholder — full implementation in Phase 3"""
    return {"score": 0, "message": "Not yet implemented"}
```

- [ ] **Step 3: Create Dockerfile**

```dockerfile
# seo-service/Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 4: Test locally**

Run: `cd seo-service && pip install -r requirements.txt && uvicorn main:app --port 8000`
Verify: `curl http://localhost:8000/health` → `{"status":"ok"}`

- [ ] **Step 5: Add SEO_SERVICE_URL to ContentFlow env**

Add to `.env.local.example`:
```
# SEO Analysis Service
SEO_SERVICE_URL=http://localhost:8000
```

- [ ] **Step 6: Commit**

```bash
git add seo-service/ contentflow/.env.local.example
git commit -m "feat: scaffold seomachine FastAPI microservice"
```

---

## Task 13: Final Integration Test & Cleanup

- [ ] **Step 0: Audit 'blog' → 'naver_blog' rename completeness**

Run: `cd contentflow && grep -rn "'blog'" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "naver_blog"`
Check every remaining `'blog'` reference. Some may be legitimate (e.g., "blog post" text strings), but any ChannelType usage must be `'naver_blog'`.

- [ ] **Step 1: Run full build**

Run: `cd contentflow && npm run build`
Fix any TypeScript errors.

- [ ] **Step 2: Run full test suite**

Run: `cd contentflow && npx vitest run`
Fix any failing tests.

- [ ] **Step 3: Manual E2E walkthrough**

1. Open app → redirected to login
2. Sign up → redirected to /content
3. Create project with target languages → saved to Supabase
4. Create content → saved to Supabase
5. Navigate sidebar modules → each page loads
6. Switch project → data updates
7. Refresh → all data persists

- [ ] **Step 4: Clean up old files**

- Delete `src/app/dashboard/` if not already deleted
- Delete `src/components/sidebar/project-tree.tsx` if replaced
- Remove unused imports across codebase

- [ ] **Step 5: Final commit**

```bash
cd contentflow && git add -A
git commit -m "feat: complete Phase 1 — sidebar layout, Supabase migration, auth"
```
