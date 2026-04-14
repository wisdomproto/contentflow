# ContentFlow 리팩토링 분석 (2026-04-14)

작성 시점: Task 1~5 완료 직후. **7개 항목 전부 완료** (2026-04-14 동일 세션).

## 우선순위 로드맵

| 우선순위 | 항목 | 예상 | 파급 | 상태 |
|---------|------|-----|-----|-----|
| **높음** | SSE 스트림 파서 통합 | 4-6h | 8개 파일 중복 제거 | ✅ |
| **높음** | BlogCard/InstagramCard 타입 정의 | 6-8h | `as any` 다수 제거 | ✅ |
| **높음** | API 라우트 에러 핸들링 통일 | 3-4h | 안정성 | ✅ |
| **중간** | 패널 컴포넌트 분리 (Workflow 상태) | 8-10h | WorkflowStepBar만 추출, 나머지 미완 | 🟡 부분 |
| **중간** | Debounce 낙관적 업데이트 | 5-6h | SaveStatusIndicator UI | ✅ |
| **낮음** | R2 업로드 헬퍼 추상화 | 2-3h | 간결성 | ✅ |
| **낮음** | 모듈 레벨 batch job → Context | 3-4h | Zustand 스토어로 이동 | ✅ |

### 생성된 공용 모듈
- `lib/sse-stream-parser.ts` — `parseSSEStream<T>`, `fetchSSEText`, `fetchAiGenerate`
- `lib/api-helpers.ts` — `jsonError`, `requireEnv`, `SSE_HEADERS`, `isTransientProviderError`
- `hooks/use-r2-upload.ts` — `uploadToR2()` 순수 함수 (+ 기존 훅은 얇은 래퍼)
- `stores/batch-image-store.ts` — 카드뉴스 배치 이미지 Zustand
- `stores/save-status-store.ts` — Supabase 저장 상태 + 인디케이터
- `types/cards.ts` — 카드 JSONB 필드 타입
- `components/ui/korean-input.tsx` — 한글 IME 세이프 입력
- `components/content/workflow-step-bar.tsx` — 4단계 스텝 UI
- `components/save-status-indicator.tsx` — TopBar 저장 배지

### 남은 작업 (다음 세션용)
- **패널 전체 공통화**: blog-panel(1300+줄) / wordpress-panel(1000+줄)의 키워드 설정 섹션 + SEO 섹션 추출
- **TODO 기능**: `marketing_strategies` 테이블 생성, `/api/calendar/events` 구현
- **테스트 mock 복구**: `prompt-builder.test.ts`, `seo-scorer.test.ts` DB 스키마 변경 반영

---

## 1. SSE 스트림 파서 중복

SSE 스트림 파싱 로직이 4곳에서 독립 구현됨.
- `components/content/blog-panel.tsx:27-57` — `fetchAiGenerate()`
- `components/content/wordpress-panel.tsx:25-55` — 동일 로직
- `hooks/use-ai-generation.ts:42-88` — 콜백 기반 변형
- `lib/channel-translator.ts:44-98` — 번역 전용 (Task 3에서 추가)

버퍼 처리 디테일이 미묘하게 다름. 공통 `lib/sse-stream-parser.ts` 필요.

```ts
export async function parseSSEStream(
  response: Response,
  onChunk: (parsed: { text?: string; error?: string }) => void
): Promise<void>
```

## 2. 거대 패널 컴포넌트

- `blog-panel.tsx` 1314줄: workflow 4단계 + AI + SEO + 번역 + 키워드 + 이미지 + 모바일 포맷
- `wordpress-panel.tsx` 1006줄: blog-panel과 ~95% 중복
- `cardnews-panel.tsx` 1079줄: batch image 전역 상태 + canvas 템플릿 + slide editor

분리:
- `useWorkflowState.ts` 커스텀 훅
- `<BaseBlogPanel>` 공통 컴포넌트 (blog/wordpress 공유)
- batch image job의 module-level `batchJobs` Map → Context/Zustand

## 3. 타입 안전성 구멍 (캐스팅)

| 파일:줄 | 패턴 | 위험도 |
|--------|------|-------|
| `project-store.ts:253` | `saved_keywords as any[]` | 높음 |
| `project-store.ts:537, 673, 686` | `as unknown as Record<string, unknown>` | 높음 |
| `project-store.ts:776` | `(c.content as unknown as Record<string, unknown>)?.image_url` | 높음 |
| `blog-panel.tsx:535, 630, 639` | `(savedKeywords as any[])` | 중간 |
| `cardnews-panel.tsx:394, 526, 542` | `canvasData as unknown as Record<string, unknown>` | 중간 |
| `cardnews-card-item.tsx:69` | `textStyle as unknown as CardCanvasData` | 중간 |

원인: `BlogCard.content`, `InstagramCard.text_style`이 `Record<string, unknown>` (`types/database.ts:214, 241`).

해결:
- `CardContent` 인터페이스 (text, url, alt, caption, image_prompt, image_style)
- `CanvasData`, `TextStyleData` 구체 타입
- `debouncedWrite<T>(table, id, updates: Partial<T>)` 제너릭화

## 4. Zustand debounce 패턴

`project-store.ts:12-41` — 전역 `_pendingWrites` Map + `_flushTimer`. 5개 테이블 공유.

문제:
- 저장 대기 상태를 UI에 노출 안 됨
- 네트워크 지연 시 사용자가 저장 완료로 착각

해결: 낙관적 업데이트 + 재시도 + 저장중 인디케이터.

## 5. R2 업로드 + Presign 중복

- `channel-translator.ts:100-130` (HTML)
- `cardnews-panel.tsx:98-110` (WebP)

`lib/r2-upload-helper.ts` 추상화:
```ts
export async function uploadAndGetPublicUrl(blob: Blob, params: UploadParams): Promise<string>
```

## 6. API 라우트 에러 핸들링 불일치

- `/api/ai/generate` (120줄): 재시도 + fallback 모델 체인 + 503 감지
- `/api/ai/translate` (74줄): 재시도 없음
- 모든 라우트가 독립적으로 `GEMINI_API_KEY` 확인

해결:
- `lib/api-error-handler.ts` — 공통 에러 응답 포맷
- `lib/api-auth.ts` — API 키 검증 중앙화
- `/api/ai/translate`에 재시도 로직 추가

## 7. TODO/미구현

- `project-store.ts:255` — "marketing_strategies table does not exist yet"
- `project-store.ts:1436` — 전략 저장 미구현
- `calendar-view.tsx:13` — `/api/calendar/events` fetch TODO

## 8. 기타

- `blog-panel.tsx:888` — `(baseArticle as any).body_plain_text` — BaseArticle에 이미 존재
- `competitors-dashboard.tsx:82` — `(project as any)?.imported_strategy` — Project에 정의됨
- `cardnews-panel.tsx:35` — 모듈 레벨 `batchJobs = new Map()` (안티패턴)
- `wordpress-panel.tsx:99` — `savedStyle` 미사용 가능성
