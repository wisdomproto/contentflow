# Phase B — 187 SEO 블로그 글 메타·이미지 일괄 제작

## Overview

Phase A(self-hosted blog publishing infrastructure)가 완료된 상태에서, 187 성장클리닉
70개 콘텐츠를 한국어·태국어 양쪽으로 발행할 수 있도록 **SEO 메타와 이미지를 일괄
제작**한다. 본문은 이미 잘 작성되어 있으므로 손대지 않는다.

### 출발 상태
- 70개 콘텐츠 (카테고리 A:20, B:15, C:7, D:18, E:10)
- 한국어 base_articles 평균 3,057자, HTML h1/h2/p 구조
- 태국어 번역 70/70 완료 (translations 테이블, language=th, channel_type=base)
- blog_contents 1행만 있음 (SEO 메타 거의 비어있음)
- ComfyUI: Flux dev fp8 + Pixar-style LoRA 등 설치 완료

### 종료 상태
- 70개 blog_contents 행 (한국어 SEO 메타 풀세트)
- 70 × 3 = 210장 R2 이미지 (text-free Pixar 일러스트)
- 한국어/태국어 본문 양쪽에 동일 위치 `<img>` 태그 삽입
- 70개 translations 행 (태국어 SEO 메타: seo_title, seo_description)
- Phase A의 BulkScheduleDialog로 발행 가능 상태

### 발행은 별도 사용자 액션
이 spec 범위는 "제작 완료까지". 실제 발행 일정은 사용자가 Phase A 마법사로
KR 70 × TH 70 = 140건을 4~6주 분산 예약.

---

## 핵심 결정사항 (11개)

1. **본문 불변** — `base_articles.body` (한국어) + `translations.body` (태국어 R2 HTML) 그대로 유지. 이미지 `<img>` 태그만 in-place 삽입
2. **이미지 3장/글** — hero (h1 직후) + section-1 (첫 h2 직후) + section-2 (두 번째 h2 직후). 총 70×3=210장
3. **text-free 일러스트** — Flux/SDXL 텍스트 렌더 약점 회피 + ko/th 공유. negative prompt에 명시
4. **Pixar-style LoRA** — `pixar-style.safetensors` strength 0.8. 따뜻한 3D 의료·아동 콘텐츠 톤
5. **CLI + sample 검증 흐름** — `node scripts/phase-b-run-all.mjs --sample` → 사용자 UI 검수 → `--all` 일괄
6. **slug 정책** — primary_keyword 영문 의미 변환 (Gemini 생성). ko/th 공유 (한 글의 URL이 언어별 동일 slug, path만 다름)
7. **태국어 SEO 메타는 한국어 검수 후 자동 번역** — translations 테이블의 seo_title, seo_description 컬럼 사용
8. **DB 변경 없음** — 기존 테이블·컬럼만 사용 (blog_contents, translations, base_articles)
9. **R2 경로** — `{projectId}/images/blog-illustrations/{contentId}-{slot}.webp`
10. **멱등 재실행 안전** — body의 `class="phase-b-injected"` img 모두 제거 후 재삽입. R2 같은 키 덮어쓰기. 단계별 skip 가능
11. **ComfyUI 로컬 의존** — `C:\ComfyUI_windows_portable` 실행 중이어야 함. 시작 시 사전 체크 + 실패 시 안내

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│ Phase B 파이프라인 (CLI 4단계, --sample 또는 --all)                │
│                                                                   │
│  ① SEO 메타 생성 (한국어)                                          │
│    scripts/phase-b-generate-seo-meta.mjs                          │
│    Gemini Flash 호출                                              │
│    INPUT  : contents.title + base_articles.body                   │
│    OUTPUT : blog_contents 1행/콘텐츠                              │
│             seo_title, url_slug, meta_description,                │
│             primary_keyword, secondary_keywords                   │
│                                                                   │
│  ② 이미지 생성 (3장)                                              │
│    scripts/phase-b-generate-images.mjs                            │
│    a) lib/blog-image-prompt.mjs (Gemini) → 영어 prompt 3개         │
│    b) lib/comfyui-client.mjs → ComfyUI POST /prompt + WebSocket   │
│    c) PNG 결과를 sharp로 webp 변환                                │
│    d) R2 PUT (PutObjectCommand)                                   │
│    OUTPUT : projects/{pid}/images/blog-illustrations/             │
│               {contentId}-hero.webp                               │
│               {contentId}-section-1.webp                          │
│               {contentId}-section-2.webp                          │
│                                                                   │
│  ③ body HTML <img> 삽입 (한국어 + 태국어)                          │
│    scripts/phase-b-insert-image-tags.mjs                          │
│    a) 기존 phase-b-injected img 제거 (멱등)                       │
│    b) h1 직후 hero, 첫 h2 직후 section-1, 두 번째 h2 직후 section-2│
│    c) 한국어 → base_articles.body UPDATE                          │
│    d) 태국어 → translations.body가 가리키는 R2 HTML fetch +       │
│       동일 규칙 삽입 + 같은 R2 키로 PUT (URL 불변)                │
│                                                                   │
│  ④ 태국어 SEO 메타 (Gemini 번역)                                  │
│    scripts/phase-b-translate-seo-meta.mjs                         │
│    INPUT  : 한국어 blog_contents 메타                             │
│    OUTPUT : translations 행 (language=th, channel_type=blog)      │
│             title, seo_title, seo_description                     │
│             body는 ③에서 갱신된 URL 그대로                        │
│                                                                   │
│  진행 로그 → logs/phase-b-{timestamp}.log                          │
│  중단 안전, 재실행 시 단계별 skip                                  │
└───────────────────────────────────────────────────────────────────┘
                          │
                          ▼
              [사용자 검수 — ContentFlow UI]
                  내부 블로그 탭에서 sample 1건 확인
                          │
                          ▼
                  [Phase A의 BulkScheduleDialog]
                  KR 70 + TH 70 = 140건 분산 예약
                          │
                          ▼
               [Phase A 자동 발행 체인 → dflo]
```

---

## 데이터 모델 (DB 변경 없음)

기존 테이블만 사용. 신규 마이그레이션 X.

### blog_contents (한국어 SEO 메타)
| 컬럼 | 의미 | 예시 |
|------|------|------|
| content_id | FK contents.id | uuid |
| seo_title | 검색 제목 (60자 이내) | "키 유전 80% 오해와 환경의 진실" |
| url_slug | 영문 슬러그 | "genetics-vs-environment-height" |
| meta_description | 160자 요약 | "..." |
| primary_keyword | 메인 키워드 | "키성장" |
| secondary_keywords | 보조 키워드 3개 | ["키크는법", "예상키계산법", "성장클리닉"] |
| seo_details | JSONB (옵션) | { og_image_url: "..." } |

### translations (태국어 SEO 메타)
| 컬럼 | 의미 |
|------|------|
| content_id | FK |
| language | 'th' |
| channel_type | 'blog' (기존 'base'와 별도 행) |
| status | 'completed' |
| title | 태국어 글 제목 |
| seo_title | 태국어 SEO 제목 |
| seo_description | 태국어 메타 설명 |
| body | R2 URL (Phase A 결과 + ③ 단계에서 img 삽입된 동일 URL) |

### base_articles.body (한국어 본문)
- 기존 HTML 그대로
- ③ 단계에서 `<img class="phase-b-injected" ...>` 태그만 in-place 삽입

### R2 객체
```
{projectId}/images/blog-illustrations/{contentId}-hero.webp
{projectId}/images/blog-illustrations/{contentId}-section-1.webp
{projectId}/images/blog-illustrations/{contentId}-section-2.webp
```

---

## 스크립트 (CLI)

### `scripts/phase-b-run-all.mjs`
오케스트레이터. CLI 옵션:
- `--sample` — 첫 콘텐츠 1개 처리
- `--content-id=xxx` — 특정 콘텐츠 1개
- `--sample-per-category` — 카테고리(A·B·C·D·E)별 1개씩 = 5개 (톤 대표성 검증용)
- `--all` — 70개 일괄 (멱등 skip)
- `--retry-failed` — 이전 로그의 실패 슬롯만 재시도
- `--category=A` — 카테고리 필터
- `--dry-run` — 실행 안 함, 무엇이 처리될지만 출력

### `scripts/phase-b-generate-seo-meta.mjs`
한국어 SEO 메타 생성. Gemini Flash + 검증 (길이·필수 필드).
실패 시 1회 재생성, 그래도 실패면 로그.

### `scripts/lib/extract-headings.mjs` (공용 유틸)
한국어 base_articles.body에서 h1·h2 텍스트를 파싱. `phase-b-generate-images.mjs`(prompt 생성)와 `phase-b-insert-image-tags.mjs`(alt 텍스트) 둘 다 호출.
```typescript
export function extractHeadings(html: string): { h1: string; h2: string[] }
```

### `scripts/phase-b-generate-images.mjs`
ComfyUI 호출. 단계:
1. `lib/extract-headings.mjs`로 h1 + h2[] 텍스트 추출
2. `lib/blog-image-prompt.mjs`로 각 슬롯의 영어 prompt 생성 (h2 0개 → hero만, h2 1개 → hero + section-1, h2 2+ → 3장)
3. `lib/comfyui-client.mjs`로 1장씩 순차 호출 (병렬 X)
4. PNG → webp 변환 (sharp 0.34 — package.json에 없으면 추가)
5. R2 업로드

### `scripts/phase-b-insert-image-tags.mjs`
body HTML 수정:
```typescript
function injectImages(html: string, urls: {hero, section1, section2}, alts: {h1, h2_1, h2_2}): string {
  // 1) 기존 phase-b-injected img 제거
  html = html.replace(/<img[^>]*class="[^"]*phase-b-injected[^"]*"[^>]*\/?>\s*/g, '');
  // 2) h1 직후 hero 삽입
  html = html.replace(/(<\/h1>)/, `$1<img src="${urls.hero}" alt="${escapeHtml(alts.h1)}" loading="lazy" class="phase-b-injected blog-hero" />`);
  // 3) 첫 h2 직후
  let h2Count = 0;
  html = html.replace(/<\/h2>/g, (match) => {
    h2Count++;
    if (h2Count === 1 && urls.section1) {
      return `${match}<img src="${urls.section1}" alt="${escapeHtml(alts.h2_1)}" loading="lazy" class="phase-b-injected" />`;
    }
    if (h2Count === 2 && urls.section2) {
      return `${match}<img src="${urls.section2}" alt="${escapeHtml(alts.h2_2)}" loading="lazy" class="phase-b-injected" />`;
    }
    return match;
  });
  return html;
}
```

한국어: `base_articles.body` UPDATE
태국어: `translations.body` URL에서 HTML fetch → 위 함수 호출 → 동일 URL로 R2 PUT (덮어쓰기)

### `scripts/phase-b-translate-seo-meta.mjs`
Gemini로 한국어 메타 → 태국어 번역. translations 행 upsert (`channel_type='blog'`).

**중요**: 새 'blog' 행은 별도 R2 URL을 가지지 않음. 대신 ③ 단계에서 갱신된 **'base' 행의 body URL을 그대로 복사**:
```sql
INSERT INTO translations (content_id, language, channel_type, status, title, seo_title, seo_description, body)
SELECT content_id, 'th', 'blog', 'completed', :title_th, :seo_title_th, :seo_description_th, body
FROM translations WHERE content_id=:id AND language='th' AND channel_type='base';
```
이렇게 'blog' 행이 'base'와 동일한 R2 HTML을 가리키므로 이미지 삽입 결과가 자연스럽게 상속된다.

### `scripts/lib/comfyui-client.mjs`
```typescript
export async function generateImage(opts: {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps?: number;
  loraStrength?: number;
}): Promise<Buffer>  // PNG bytes
```
ComfyUI `/prompt` POST → WebSocket `/ws` 수신 → 완료 시 `view` 엔드포인트에서 PNG 다운로드.

### `scripts/lib/blog-image-prompt.mjs`
```typescript
export async function buildIllustrationPrompts(opts: {
  title: string;
  h2Texts: string[];
}): Promise<{ hero: string; section1?: string; section2?: string }>
```
Gemini Flash로 한국어 제목/소제목 → 영어 일러스트 prompt 변환. 시스템 규칙:
- "no text, no letters, no characters, no watermark"
- "Pixar-style 3D illustration, warm tone"
- "medical or family context appropriate"
- "Korean parent and child OR universal silhouette"

### `scripts/lib/workflow-blog-illustration.json`
ComfyUI workflow 템플릿 (placeholder 치환):
- Checkpoint: `flux1-dev-fp8.safetensors`
- LoRA: `pixar-style.safetensors`, strength 0.8
- Sampler: Euler, 20 steps
- Size: 1024×1024 (hero) / 768×768 (section)
- Negative: `text, watermark, signature, words, letters, chinese characters, korean characters, thai characters, blurry, low quality`

---

## 사용자 흐름

### Sample 검증 단계
```bash
# 1. ComfyUI 시작
C:\ComfyUI_windows_portable\run_nvidia_gpu.bat

# 2. Sample 1건 처리 (~4-5분)
cd C:/projects/ContentFlow/contentflow
node scripts/phase-b-run-all.mjs --sample

# 3. ContentFlow UI에서 검수
# - 콘텐츠 진입 → 내부 블로그 탭
# - KR/TH 둘 다 본문에 이미지 3장 확인
# - SEO 메타 (title, slug, description, keywords) 확인
# - 이미지 톤·alt 텍스트 확인
```

### 톤 조정 (필요 시)
- 이미지 톤 NG → `scripts/lib/workflow-blog-illustration.json` LoRA/strength/sampler 조정 후 `--sample` 재실행
- prompt 톤 NG → `scripts/lib/blog-image-prompt.mjs` 시스템 프롬프트 조정
- SEO 메타 NG → `scripts/phase-b-generate-seo-meta.mjs` 프롬프트 조정
- slug 형식 NG → slug 생성 규칙 수정 (영문 transliteration vs 의미 변환)

재실행 시 R2 같은 키 덮어쓰기 + body img 멱등 삽입이므로 안전.

### 전체 일괄
```bash
# 백그라운드 실행 권장 (4-5시간)
node scripts/phase-b-run-all.mjs --all > logs/phase-b.log 2>&1 &
# 또는 PowerShell:
Start-Process node -ArgumentList "scripts/phase-b-run-all.mjs", "--all" -RedirectStandardOutput logs/phase-b.log
```

진행 로그 확인:
```bash
tail -f logs/phase-b.log
```

중단 시 (Ctrl+C 또는 GPU 재시작) → 다시 `--all` 실행하면 처리된 콘텐츠 자동 skip + 미처리분만 진행.

### 발행
완료 후 ContentFlow UI:
1. 발행 큐 → 내 사이트 카드 → "일괄 예약 +"
2. 70개 전체 + KR/TH + 주 5회 + 월~금 + 09:00,14:00 + 시차 2일
3. 미리보기 확인 → 일괄 예약 확정 (140건)
4. Phase A 자동 발행 체인이 cron으로 처리

---

## 에지 케이스 / 오류 처리

| 케이스 | 처리 |
|--------|------|
| ComfyUI 미실행 | 시작 시 `/system_stats` 체크 → 즉시 종료 + 안내 |
| ComfyUI 5분 timeout | 슬롯당 2회 재시도, 실패 시 로그 + 다음 콘텐츠 |
| Gemini 메타 검증 실패 (길이·필드) | 1회 재생성, 그래도 실패 시 로그 + 사용자 알림 |
| body에 h2가 0개 | hero만 삽입, section 슬롯 skip |
| body에 h2가 1개 | hero + section-1만 |
| body에 h1이 없음 | hero를 body 맨 앞에 prepend (실무상 거의 없는 케이스) |
| 태국어 body HTML이 R2에서 fetch 실패 | 태국어 body 단계 skip, 로그 |
| 동일 콘텐츠 재실행 | 모든 단계 멱등 (skip + 덮어쓰기) |
| R2 업로드 실패 | 3회 재시도, 실패 시 슬롯 skip |
| 콘텐츠 일부만 처리 후 중단 | 다음 실행에서 미처리분만 |
| prompt에 한글 그대로 들어가서 Flux 렌더 시 한글 글자 그림 | negative prompt에 명시 + Gemini prompt가 영어로 변환 보장 |

---

## 테스트 전략

### 단위 테스트 (vitest)
- `lib/blog-image-prompt.test.mjs` — Gemini mock → prompt 형식 검증 (no-text rule 포함 여부)
- `lib/comfyui-client.test.mjs` — mock WebSocket → workflow JSON 구조 검증
- `phase-b-insert-image-tags.test.mjs` — HTML 입력 → 멱등성 검증 (3번 실행해도 img 3장만)

### 수동 검증
- Sample 1건 처리 후 UI 검수 (가장 중요한 테스트)
- 톤 조정 사이클 (NG → 조정 → 재실행)

### 회귀 검증
- Phase A의 dflo build:blog 스크립트 실행 → 정적 HTML에 R2 이미지 URL이 정상 src로 들어가는지 확인
- 외부 API `/api/blog/by-project/{pid}/posts?lang=ko`에서 body_html에 `<img class="phase-b-injected">` 보이는지

---

## 비용·시간

| 항목 | 단위 | 70개 총 |
|---|---|---|
| Gemini Flash (메타 + prompt + 번역) | ~$0.003/콘텐츠 | ~$0.21 |
| ComfyUI Flux 이미지 | 로컬 GPU (전기료만) | ~3.5시간 GPU |
| R2 쓰기/저장 | $0.0036/GB writes, $0.015/GB-mo | <$0.05 |
| **총** | | **~$0.26 + GPU 시간** |

Sample 1건은 ~4-5분. 전체 ~4-5시간.

---

## Out of Scope

- 실제 발행 (Phase A BulkScheduleDialog가 담당)
- 본문 SEO 재작성 (사용자 결정: 본문 불변)
- 내부 링크 자동 생성 (수동 추가 또는 향후 별도 spec)
- og:image 메타 (dflo build:blog에서 R2 hero URL을 og:image로 자동 사용 — Phase A에서 처리)
- VN/EN 메타·번역 (사용자 결정: KR/TH만)
- 카테고리 C(치료사례) 글에 환자 사진 (의료광고법 — 일러스트로 대체)
- 이미지 후가공·편집 (수동, ContentFlow의 이미지 편집기로 가능)

---

## Migration Order

**Milestone 1 — 인프라**
1. `scripts/lib/comfyui-client.mjs` + workflow 템플릿
2. `scripts/lib/blog-image-prompt.mjs`
3. ComfyUI client 단위 테스트 + mock

**Milestone 2 — 단계 스크립트**
4. `scripts/phase-b-generate-seo-meta.mjs`
5. `scripts/phase-b-generate-images.mjs`
6. `scripts/phase-b-insert-image-tags.mjs` + 멱등 단위 테스트
7. `scripts/phase-b-translate-seo-meta.mjs`

**Milestone 3 — 오케스트레이터**
8. `scripts/phase-b-run-all.mjs` (--sample, --all, --retry-failed, --category, --dry-run)
9. Sample 1건 실행 → 사용자 검수

**Milestone 4 — 전체 실행**
10. `--all` 백그라운드 실행
11. 완료 후 BulkScheduleDialog로 140건 예약

---

## Phase C 예고 (이 spec 범위 외)

향후 별도 spec으로:
- VN/EN 번역 + 메타·이미지
- 내부 링크 자동 추천 (관련 글 cross-link)
- og:image 다국어 분리 (필요 시)
- 카테고리별 LoRA 변형 실험
- A/B 테스트 (썸네일 변형 vs 단일)
