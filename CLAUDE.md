# ContentFlow AI - Project Conventions

## Overview
ContentFlow AI는 한국 시장 타겟 AI 마케팅 컨텐츠 자동 생성 도구입니다.
아이디어 하나로 네이버 블로그 → 인스타 카드뉴스 → 숏폼 대본까지 채널별 최적화 컨텐츠를 자동 생성합니다.
MVP: 폴더/페르소나 관리, 기본 설정 탭, 블로그 탭 (섹션 기반 에디터)

## Tech Stack
- Next.js 14 (App Router), TypeScript (strict), Tailwind CSS
- Zustand (state), TanStack Query (async), Tiptap (rich text), @dnd-kit (drag-drop)
- pnpm as package manager
- No database yet — localStorage for persistence

## Project Structure
- `src/app/` — Next.js App Router pages and layouts
- `src/components/` — React components organized by feature domain
  - `layout/` — AppShell, Header, Sidebar, MainEditor, RightPanel
  - `sidebar/` — FolderTree, FolderItem, ContentItem, FolderSettingsDrawer
  - `tabs/` — TabBar, BasicSettingsTab, BlogTab, CardNewsTab, VideoTab
  - `blog/` — BlogEditor, Section, SectionImage, SectionText
  - `editor/` — TiptapEditor, EditorToolbar
  - `right-panel/` — PreviewPanel, SeoChecklist, KeywordPanel
  - `persona/` — PersonaForm, PersonaPreview
  - `ui/` — Button, Input, Badge, Drawer, Spinner, Toast, etc.
- `src/stores/` — Zustand stores (one per domain: folder, content, UI)
- `src/types/` — TypeScript interfaces and types
- `src/lib/` — Pure utility functions and constants
- `src/hooks/` — Custom React hooks
- `src/mock/` — Mock data for frontend-first development
- `docs/` — PRD and design documents

## Conventions

### Components
- All components use named exports (no default exports)
- Client Components: `'use client'` directive at top
- Server Components are default; only add `'use client'` when interactivity is needed
- Component files: PascalCase (`FolderItem.tsx`)

### State Management (Zustand)
- One store per domain: `useFolderStore`, `useContentStore`, `useUIStore`
- Use selectors: `const folders = useFolderStore(s => s.folders)`
- Actions defined inside store, not outside
- `useFolderStore`, `useContentStore` use `persist` middleware (localStorage)
- `useUIStore` is ephemeral (no persist)

### Styling
- Tailwind utility classes only; no custom CSS except CSS variables in globals.css
- Use `cn()` from `src/lib/utils.ts` for conditional classes
- Korean fonts: Pretendard (primary), Noto Sans KR (fallback)
- Color palette: CSS variables in globals.css → Tailwind config

### TypeScript
- Strict mode; no `any`
- Interfaces for objects, types for unions/intersections
- Zod for runtime validation at data boundaries

### File Naming
- Components: PascalCase (`BlogEditor.tsx`)
- Hooks: camelCase with `use` prefix (`useAutoSave.ts`)
- Stores: camelCase with `use` prefix (`useContentStore.ts`)
- Types/utilities: camelCase (`content.ts`, `utils.ts`)

### Data Flow
- ContentContext is the central data model shared across all tabs
- Tabs read/write to same ContentContext via `useContentStore`
- Tab switching: Zustand client state (NOT URL routing)
- Mock data in `src/mock/` until backend exists

### Language
- UI strings: Korean (한국어)
- Code (variables, comments, docs): English

## Commands
- `pnpm dev` — Start development server
- `pnpm build` — Production build
- `pnpm lint` — ESLint
- `pnpm format` — Prettier
