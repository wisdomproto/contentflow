# Threads Channel Completion - Design Spec

## Overview

스레드 채널을 블로그/카드뉴스와 동일 수준(에디터 + AI 생성 + 미리보기)으로 완성한다.

## Current State

이미 구현됨:
- `threads-panel.tsx` — AI 생성, 프롬프트 다이얼로그, 전체 복사
- `threads-card-item.tsx` — textarea, 500자 카운터, 연결선, 삭제
- Zustand store — ThreadsContent/Card CRUD 전체
- `prompt-builder.ts` — `buildThreadsPrompt()` 완성

## Changes Required

### 1. Drag-and-Drop (카드 순서 이동)

**Files:** `threads-panel.tsx`, `threads-card-item.tsx`, `project-store.ts`

- `threads-panel.tsx`: dnd-kit `DndContext` + `SortableContext` 래핑 (블로그 패턴 참조)
- `threads-card-item.tsx`: `useSortable` 훅 + 드래그 핸들(`GripVertical`) 추가
- `project-store.ts`: `reorderThreadsCards(threadsContentId, activeId, overId)` 추가

### 2. Threads Preview Dialog

**New file:** `threads-preview-dialog.tsx`

PRD 4.6.3 기반 Threads UI 시뮬레이션:
- 프로필 영역 (아바타 + username)
- 포스트 본문 텍스트
- 이미지/미디어 (있는 경우)
- 반응 아이콘 (하트, 댓글, 리포스트, 공유)
- 멀티 스레드 연결선
- 글자수 카운터
- 텍스트 복사 기능

`threads-panel.tsx`에 미리보기 버튼 + 다이얼로그 연결.

### 3. Image Attachment Support

**Files:** `threads-card-item.tsx`, `threads-panel.tsx`

- 각 카드에 이미지 생성/삭제 UI 추가
- `ThreadsCard.media_url` / `media_type` 필드 활용 (이미 타입 정의됨)
- 이미지 생성: `/api/ai/generate-image` 엔드포인트 + `useImageGeneration` 훅 재사용
- `ChannelModelSelector`에서 `showImageModel={true}`로 변경
- 블로그보다 간단한 UI: 이미지 추가 버튼 + 프롬프트 입력 + 미리보기/삭제

## Architecture

기존 패턴을 그대로 따른다:
- State: Zustand store (`project-store.ts`)
- AI: `useAiGeneration` (텍스트), `useImageGeneration` (이미지)
- Prompt: `buildThreadsPrompt()` (이미 완성)
- UI: shadcn/ui + Tailwind + lucide-react

## Out of Scope

- Threads API 자동 업로드 (다른 채널도 미구현)
- 예약 게시
- 팩트체크
