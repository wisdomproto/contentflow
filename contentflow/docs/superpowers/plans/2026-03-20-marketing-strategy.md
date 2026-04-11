# AI 마케팅 전략 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI marketing strategy feature that analyzes target URLs, collects Naver keyword data, and generates a 5-tab strategy dashboard (Overview/Competitors, Keywords, Channel/Funnel, Content/Topics, KPI/Action Plan) with content tab integration.

**Architecture:** Hybrid approach — dedicated strategy page (`/dashboard/strategy`) for full strategy creation + keyword banner in blog panel for content-level integration. Strategy data stored in Zustand (IndexedDB) as a 1:1 relationship with Project. AI generation uses Gemini SSE streaming with Naver API real data as context.

**Tech Stack:** Next.js 16 App Router, TypeScript, Zustand + idb-keyval, Gemini AI (SSE), Naver Search Ads API + DataLab API, cheerio (HTML parsing), shadcn/ui + Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-20-marketing-strategy-design.md`

---

## File Map

### New Files (Create)
| File | Responsibility |
|------|---------------|
| `src/types/strategy.ts` | All strategy TypeScript interfaces |
| `src/app/api/ai/strategy/crawl/route.ts` | URL crawling with cheerio |
| `src/app/api/naver/keywords/trend/route.ts` | Naver DataLab trend API |
| `src/app/api/ai/strategy/generate/route.ts` | Full strategy SSE generation |
| `src/app/api/ai/strategy/regenerate/route.ts` | Per-tab SSE regeneration |
| `src/lib/strategy-prompt-builder.ts` | Strategy prompt construction |
| `src/hooks/use-strategy-generation.ts` | Strategy SSE streaming hook |
| `src/components/strategy/strategy-input-form.tsx` | 6-field input form |
| `src/components/strategy/strategy-hero.tsx` | Hero stats banner |
| `src/components/strategy/strategy-tabs.tsx` | 5-tab navigation |
| `src/components/strategy/overview-tab.tsx` | Tab ① Overview + Competitors |
| `src/components/strategy/keyword-tab.tsx` | Tab ② Keyword analysis |
| `src/components/strategy/keyword-table.tsx` | Sortable/filterable keyword table |
| `src/components/strategy/channel-tab.tsx` | Tab ③ Channel + Funnel |
| `src/components/strategy/content-tab.tsx` | Tab ④ Content + Topics |
| `src/components/strategy/topic-table.tsx` | Filterable topic list table |
| `src/components/strategy/kpi-tab.tsx` | Tab ⑤ KPI + Action Plan |
| `src/components/strategy/strategy-dashboard.tsx` | Dashboard wrapper (hero + tabs + content) |
| `src/app/dashboard/strategy/page.tsx` | Strategy page route |

### Modified Files
| File | Change |
|------|--------|
| `src/stores/project-store.ts` | Add `strategies` array + CRUD + cascade delete + partialize |
| `src/components/content/blog-panel.tsx` | Add keyword recommendation banner |
| `src/app/dashboard/page.tsx` | Add "AI 마케팅 전략" button in project header |
| `package.json` | Add `cheerio` dependency |

---

## Task 1: Types & Dependencies

**Files:**
- Create: `src/types/strategy.ts`
- Modify: `package.json`

- [ ] **Step 1: Install cheerio**

```bash
cd /c/projects/ContentFlow-0.1/contentflow && npm install cheerio
```

- [ ] **Step 2: Create strategy types file**

Create `src/types/strategy.ts` with all interfaces from the spec. This is the foundation — every other task depends on these types.

```typescript
// src/types/strategy.ts
// AI 마케팅 전략 타입 정의

export type StrategyTab = 'overview' | 'keywords' | 'channelStrategy' | 'contentStrategy' | 'kpiAction';

export interface TabStatus {
  status: 'idle' | 'generating' | 'complete' | 'error';
  errorMessage?: string;
}

export interface GenerationStatus {
  overall: 'idle' | 'generating' | 'complete' | 'error';
  tabs: Record<StrategyTab, TabStatus>;
}

export interface StrategyInput {
  targetUrls: string[];
  businessInfo: {
    industry: string;
    services: string;
    targetCustomer: string;
    usp: string;
    channels: string[];
  };
  seedKeywords: string[];
  competitors: { name: string; url?: string }[];
  budget?: {
    monthlyRange: string;
    teamSize: number;
  };
}

// Tab ① Overview + Competitors
export interface DifferentiatorCard {
  label: string;
  title: string;
  description: string;
  color: 'teal' | 'amber' | 'coral' | 'purple';
}

export interface IssueCard {
  severity: 'critical' | 'warning' | 'opportunity';
  title: string;
  description: string;
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface CompetitorCard {
  name: string;
  type: string;
  strengths: string;
  weaknesses: string;
  strategy: string;
}

export interface OverviewData {
  summary: string;
  differentiators: DifferentiatorCard[];
  issues: IssueCard[];
  heroStats: HeroStat[];
  competitors: CompetitorCard[];
  positioning: string;
}

// Tab ② Keywords
export interface KeywordItem {
  keyword: string;
  totalSearch: number;
  pcSearch: number;
  mobileSearch: number;
  mobileRatio: number;
  competition: 'high' | 'medium' | 'low';
  plAvgDepth: number;
  pcClickCount: number;
  mobileClickCount: number;
  pcCtr: number;
  mobileCtr: number;
  category: string;
  isGolden: boolean;
}

export interface GoldenKeyword {
  keyword: string;
  totalSearch: number;
  competition: string;
  strategy: string;
  priority: number;
}

export interface KeywordInsight {
  title: string;
  description: string;
  color: 'teal' | 'amber' | 'coral' | 'purple';
}

export interface KeywordTrend {
  keyword: string;
  monthly: { period: string; ratio: number }[];
}

export interface KeywordData {
  items: KeywordItem[];
  goldenKeywords: GoldenKeyword[];
  insights: KeywordInsight[];
  trends: KeywordTrend[];
  categories: string[];
}

// Tab ③ Channel + Funnel
export interface FunnelStep {
  icon: string;
  title: string;
  description: string;
}

export interface ChannelCard {
  channel: string;
  icon: string;
  frequency: string;
  bestTime: string;
  strategy: string;
  keywords: string[];
  adBudget?: string;
}

export interface ScheduleRow {
  channel: string;
  days: Record<string, string>;
  weeklyCount: string;
  time: string;
}

export interface RoleCard {
  role: string;
  title: string;
  tasks: string;
}

export interface ChannelStrategyData {
  funnel: FunnelStep[];
  funnelActions: string;
  homepageOptimization: string;
  channels: ChannelCard[];
  schedule: ScheduleRow[];
  roles: RoleCard[];
  globalStrategy?: string;
}

// Tab ④ Content + Topics
export interface ContentCategory {
  code: string;
  name: string;
  description: string;
  topicCount: number;
}

export interface TopicItem {
  id: string;
  category: string;
  title: string;
  angle: string;
  keywords: string[];
  targetChannels: string[];
  source: string;
  youtubeStatus?: 'new' | 'done' | 'similar';
  youtubeMatch?: string;
}

export interface ContentStrategyData {
  categories: ContentCategory[];
  cycleInfo: string;
  categoryRatios: string;
  topics: TopicItem[];
}

// Tab ⑤ KPI + Action
export interface ChannelKpi {
  channel: string;
  icon: string;
  metrics: string[];
  target: string;
}

export interface ActionItem {
  priority: 'now' | 'soon' | 'mid';
  action: string;
  description?: string;
  timeline: string;
  cost: string;
  assignee: string;
}

export interface KpiActionData {
  channelKpis: ChannelKpi[];
  integratedKpi: {
    metrics: string[];
    warning: string;
  };
  actions: ActionItem[];
  budgetSummary: string;
}

// Top-level
export interface MarketingStrategy {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  input: StrategyInput;
  overview: OverviewData | null;
  keywords: KeywordData | null;
  channelStrategy: ChannelStrategyData | null;
  contentStrategy: ContentStrategyData | null;
  kpiAction: KpiActionData | null;
  generationStatus: GenerationStatus;
}

// Crawl result
export interface CrawlResult {
  url: string;
  success: boolean;
  title?: string;
  description?: string;
  headings?: string[];
  bodyText?: string;
  error?: string;
}

// SSE event types
export type StrategySSEEvent =
  | { type: 'tab_start'; tab: StrategyTab }
  | { type: 'chunk'; tab: StrategyTab; content: string }
  | { type: 'tab_complete'; tab: StrategyTab; data: unknown }
  | { type: 'tab_error'; tab: StrategyTab; error: string }
  | { type: 'complete' };
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit src/types/strategy.ts
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/strategy.ts package.json package-lock.json
git commit -m "feat(strategy): add strategy type definitions and cheerio dependency"
```

---

## Task 2: Store — Strategy CRUD

**Files:**
- Modify: `src/stores/project-store.ts`

- [ ] **Step 1: Add strategy imports and state**

At top of `project-store.ts`, add to imports:

```typescript
import type { MarketingStrategy, StrategyInput, GenerationStatus, StrategyTab } from '@/types/strategy';
```

Add to `ProjectState` interface (after `youtubeCards: YoutubeCard[];`):

```typescript
  strategies: MarketingStrategy[];
```

Add strategy CRUD method signatures to the interface:

```typescript
  // Strategy CRUD
  getStrategy: (projectId: string) => MarketingStrategy | undefined;
  createOrUpdateStrategy: (projectId: string, input: StrategyInput) => string;
  updateStrategyTab: (strategyId: string, tab: StrategyTab, data: unknown) => void;
  updateStrategyStatus: (strategyId: string, status: Partial<GenerationStatus>) => void;
  deleteStrategy: (projectId: string) => void;
```

- [ ] **Step 2: Add initial state**

In the `create` call, add initial state (after `youtubeCards: []`):

```typescript
    strategies: [],
```

- [ ] **Step 3: Implement strategy CRUD methods**

Add after the youtube card methods:

```typescript
    // ====== Strategy ======
    getStrategy: (projectId) => {
      return get().strategies.find((s) => s.projectId === projectId);
    },

    createOrUpdateStrategy: (projectId, input) => {
      const existing = get().strategies.find((s) => s.projectId === projectId);
      const now = new Date().toISOString();

      if (existing) {
        set((state) => ({
          strategies: state.strategies.map((s) =>
            s.projectId === projectId
              ? { ...s, input, updatedAt: now, overview: null, keywords: null, channelStrategy: null, contentStrategy: null, kpiAction: null, generationStatus: { overall: 'idle', tabs: { overview: { status: 'idle' }, keywords: { status: 'idle' }, channelStrategy: { status: 'idle' }, contentStrategy: { status: 'idle' }, kpiAction: { status: 'idle' } } } }
              : s
          ),
        }));
        return existing.id;
      }

      const id = generateId('strategy');
      const newStrategy: MarketingStrategy = {
        id,
        projectId,
        createdAt: now,
        updatedAt: now,
        input,
        overview: null,
        keywords: null,
        channelStrategy: null,
        contentStrategy: null,
        kpiAction: null,
        generationStatus: {
          overall: 'idle',
          tabs: {
            overview: { status: 'idle' },
            keywords: { status: 'idle' },
            channelStrategy: { status: 'idle' },
            contentStrategy: { status: 'idle' },
            kpiAction: { status: 'idle' },
          },
        },
      };
      set((state) => ({ strategies: [...state.strategies, newStrategy] }));
      return id;
    },

    updateStrategyTab: (strategyId, tab, data) => {
      set((state) => ({
        strategies: state.strategies.map((s) =>
          s.id === strategyId
            ? {
                ...s,
                [tab]: data,
                updatedAt: new Date().toISOString(),
                generationStatus: {
                  ...s.generationStatus,
                  tabs: { ...s.generationStatus.tabs, [tab]: { status: 'complete' } },
                },
              }
            : s
        ),
      }));
    },

    updateStrategyStatus: (strategyId, status) => {
      set((state) => ({
        strategies: state.strategies.map((s) =>
          s.id === strategyId
            ? {
                ...s,
                generationStatus: {
                  ...s.generationStatus,
                  ...status,
                  tabs: { ...s.generationStatus.tabs, ...(status.tabs || {}) },
                },
              }
            : s
        ),
      }));
    },

    deleteStrategy: (projectId) => {
      set((state) => ({
        strategies: state.strategies.filter((s) => s.projectId !== projectId),
      }));
    },
```

- [ ] **Step 4: Add cascade delete to deleteProject**

In the `deleteProject` method's `set()` callback, find the return object that contains `projects: state.projects.filter(...)`. After the last `filter` line (for `youtubeCards`), add:

```typescript
        strategies: state.strategies.filter((s) => s.projectId !== projectId),
```

The result should look like:
```typescript
    // ... existing lines
    youtubeCards: state.youtubeCards.filter((card) => !ytContentIds.includes(card.youtube_content_id)),
    strategies: state.strategies.filter((s) => s.projectId !== projectId),  // ← 추가
```

- [ ] **Step 5: Add to partialize**

In the `partialize` function, add:

```typescript
        strategies: state.strategies,
```

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | head -20
```

Expected: No type errors related to strategy.

- [ ] **Step 7: Commit**

```bash
git add src/stores/project-store.ts
git commit -m "feat(strategy): add strategy CRUD to Zustand store with cascade delete"
```

---

## Task 3: URL Crawl API

**Files:**
- Create: `src/app/api/ai/strategy/crawl/route.ts`

- [ ] **Step 1: Create crawl route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import type { CrawlResult } from '@/types/strategy';

async function crawlUrl(url: string): Promise<CrawlResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentFlow/1.0)' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { url, success: false, error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header').remove();

    const title = $('title').text().trim() || undefined;
    const description = $('meta[name="description"]').attr('content')?.trim() || undefined;
    const headings = $('h1, h2, h3').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 20);
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 2000) || undefined;

    return { url, success: true, title, description, headings, bodyText };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { url, success: false, error: message.includes('abort') ? '타임아웃 (10초)' : message };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { urls } = (await req.json()) as { urls: string[] };

    if (!urls?.length) {
      return NextResponse.json({ error: 'URL을 입력해 주세요.' }, { status: 400 });
    }

    // Max 5 URLs
    const limitedUrls = urls.slice(0, 5);
    const results = await Promise.all(limitedUrls.map(crawlUrl));

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: `서버 오류: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify route loads**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/strategy/crawl/route.ts
git commit -m "feat(strategy): add URL crawl API endpoint with cheerio"
```

---

## Task 4: Naver DataLab Trend API

**Files:**
- Create: `src/app/api/naver/keywords/trend/route.ts`

- [ ] **Step 1: Create trend route**

```typescript
import { NextRequest, NextResponse } from 'next/server';

const DATALAB_URL = 'https://openapi.naver.com/v1/datalab/search';

export async function POST(req: NextRequest) {
  try {
    const { keywords, startDate, endDate } = (await req.json()) as {
      keywords: string[];
      startDate: string;  // "2025-03-01"
      endDate: string;    // "2026-03-01"
    };

    if (!keywords?.length) {
      return NextResponse.json({ error: '키워드를 입력해 주세요.' }, { status: 400 });
    }

    const clientId = process.env.NAVER_DATALAB_CLIENT_ID || '';
    const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET || '';

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: '네이버 DataLab API 키가 설정되지 않았습니다.' }, { status: 400 });
    }

    // DataLab allows max 5 keyword groups per request
    const groups = keywords.slice(0, 5).map((kw) => ({
      groupName: kw,
      keywords: [kw],
    }));

    const response = await fetch(DATALAB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      body: JSON.stringify({
        startDate: startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        endDate: endDate || new Date().toISOString().slice(0, 10),
        timeUnit: 'month',
        keywordGroups: groups,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `DataLab API 오류 (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform to our format
    const trends = (data.results || []).map((result: { title: string; data: { period: string; ratio: number }[] }) => ({
      keyword: result.title,
      monthly: result.data.map((d: { period: string; ratio: number }) => ({
        period: d.period,
        ratio: d.ratio,
      })),
    }));

    return NextResponse.json({ trends });
  } catch (err) {
    return NextResponse.json(
      { error: `서버 오류: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/naver/keywords/trend/route.ts
git commit -m "feat(strategy): add Naver DataLab trend API endpoint"
```

---

## Task 5: Strategy Prompt Builder

**Files:**
- Create: `src/lib/strategy-prompt-builder.ts`

- [ ] **Step 1: Create prompt builder**

Build prompts for each of the 5 tabs. Each prompt includes business context, keyword data, and crawl results as context.

```typescript
import type { StrategyInput, KeywordItem, CrawlResult, StrategyTab } from '@/types/strategy';

interface PromptContext {
  input: StrategyInput;
  keywordData?: KeywordItem[];
  crawlResults?: CrawlResult[];
  existingTabs?: Record<string, unknown>;
}

function buildContextBlock(ctx: PromptContext): string {
  const parts: string[] = [];

  parts.push(`## 비즈니스 정보
- 업종: ${ctx.input.businessInfo.industry}
- 서비스: ${ctx.input.businessInfo.services}
- 타겟 고객: ${ctx.input.businessInfo.targetCustomer}
- 차별화: ${ctx.input.businessInfo.usp}
- 보유 채널: ${ctx.input.businessInfo.channels.join(', ')}`);

  if (ctx.input.budget) {
    parts.push(`- 월 예산: ${ctx.input.budget.monthlyRange}
- 인원: ${ctx.input.budget.teamSize}명`);
  }

  if (ctx.input.competitors.length > 0) {
    parts.push(`\n## 경쟁사\n${ctx.input.competitors.map((c) => `- ${c.name}${c.url ? ` (${c.url})` : ''}`).join('\n')}`);
  }

  if (ctx.crawlResults?.length) {
    const successful = ctx.crawlResults.filter((r) => r.success);
    if (successful.length > 0) {
      parts.push(`\n## 웹사이트 분석 결과`);
      successful.forEach((r) => {
        parts.push(`### ${r.url}
- 제목: ${r.title || '없음'}
- 설명: ${r.description || '없음'}
- 주요 헤딩: ${r.headings?.join(' | ') || '없음'}
- 본문 요약: ${r.bodyText?.slice(0, 500) || '없음'}`);
      });
    }
  }

  if (ctx.keywordData?.length) {
    const top20 = [...ctx.keywordData].sort((a, b) => b.totalSearch - a.totalSearch).slice(0, 20);
    parts.push(`\n## 키워드 데이터 (상위 20개)
| 키워드 | 월 검색량 | 모바일% | 경쟁 |
|--------|----------|---------|------|
${top20.map((k) => `| ${k.keyword} | ${k.totalSearch.toLocaleString()} | ${k.mobileRatio}% | ${k.competition} |`).join('\n')}`);
  }

  return parts.join('\n');
}

export function buildStrategyPrompt(tab: StrategyTab, ctx: PromptContext, instruction?: string): string {
  const context = buildContextBlock(ctx);

  const tabPrompts: Record<StrategyTab, string> = {
    overview: `당신은 SNS 마케팅 전문 컨설턴트입니다.

아래 비즈니스 정보와 데이터를 분석하여 "개요·경쟁사" 전략을 JSON으로 생성해주세요.

${context}

${instruction ? `\n사용자 추가 지시: ${instruction}\n` : ''}

반드시 아래 JSON 구조로 응답하세요 (다른 텍스트 없이 JSON만):
{
  "summary": "비즈니스 핵심 요약 (2~3문장)",
  "differentiators": [
    { "label": "라벨", "title": "제목", "description": "설명", "color": "teal|amber|coral|purple" }
  ],
  "issues": [
    { "severity": "critical|warning|opportunity", "title": "제목", "description": "설명" }
  ],
  "heroStats": [
    { "value": "숫자", "label": "라벨" }
  ],
  "competitors": [
    { "name": "경쟁사명", "type": "유형", "strengths": "강점", "weaknesses": "약점", "strategy": "전략" }
  ],
  "positioning": "차별화 포지셔닝 요약"
}`,

    keywords: `당신은 네이버 SEO 및 키워드 분석 전문가입니다.

아래 키워드 데이터를 분석하여 키워드 전략을 JSON으로 생성해주세요.

${context}

${instruction ? `\n사용자 추가 지시: ${instruction}\n` : ''}

반드시 아래 JSON 구조로 응답하세요:
{
  "goldenKeywords": [
    { "keyword": "키워드", "totalSearch": 0, "competition": "낮음|중간", "strategy": "공략법", "priority": 1 }
  ],
  "insights": [
    { "title": "인사이트 제목", "description": "설명", "color": "teal|amber|coral|purple" }
  ],
  "categories": ["카테고리1", "카테고리2"],
  "categoryMap": { "키워드": "카테고리" }
}

참고: items, trends 데이터는 네이버 API에서 직접 가져오므로 생성하지 마세요. goldenKeywords, insights, categories, categoryMap만 생성하세요.`,

    channelStrategy: `당신은 멀티채널 SNS 마케팅 전략가입니다.

아래 데이터를 기반으로 채널·퍼널 전략을 JSON으로 생성해주세요.

${context}

${instruction ? `\n사용자 추가 지시: ${instruction}\n` : ''}

반드시 아래 JSON 구조로 응답하세요:
{
  "funnel": [
    { "icon": "이모지", "title": "단계명", "description": "설명" }
  ],
  "funnelActions": "퍼널별 핵심 액션 설명",
  "homepageOptimization": "홈페이지 전환 최적화 제안",
  "channels": [
    { "channel": "채널명", "icon": "이모지", "frequency": "주 N회", "bestTime": "시간대", "strategy": "전략 설명", "keywords": ["키워드"], "adBudget": "예산" }
  ],
  "schedule": [
    { "channel": "채널명", "days": {"월":"콘텐츠","화":"—"}, "weeklyCount": "N회", "time": "시간" }
  ],
  "roles": [
    { "role": "A 담당", "title": "역할명", "tasks": "담당 업무" }
  ]
}`,

    contentStrategy: `당신은 콘텐츠 마케팅 전문가입니다.

아래 데이터를 기반으로 콘텐츠 전략과 주제 목록을 JSON으로 생성해주세요.
주제는 50~100개를 생성하세요.

${context}

${instruction ? `\n사용자 추가 지시: ${instruction}\n` : ''}

반드시 아래 JSON 구조로 응답하세요:
{
  "categories": [
    { "code": "A", "name": "카테고리명", "description": "설명", "topicCount": 0 }
  ],
  "cycleInfo": "사이클 설명 (예: 5주 1사이클 = 연 10회)",
  "categoryRatios": "카테고리별 비율 설명",
  "topics": [
    { "id": "A-01", "category": "A", "title": "주제 제목", "angle": "콘텐츠 각도", "keywords": ["키워드"], "targetChannels": ["블로그","유튜브"], "source": "출처" }
  ]
}`,

    kpiAction: `당신은 마케팅 성과 측정 및 전략 실행 전문가입니다.

아래 데이터를 기반으로 KPI 체계와 액션플랜을 JSON으로 생성해주세요.

${context}

${instruction ? `\n사용자 추가 지시: ${instruction}\n` : ''}

반드시 아래 JSON 구조로 응답하세요:
{
  "channelKpis": [
    { "channel": "채널명", "icon": "이모지", "metrics": ["지표1","지표2"], "target": "목표치" }
  ],
  "integratedKpi": {
    "metrics": ["통합 지표1", "통합 지표2"],
    "warning": "주의사항"
  },
  "actions": [
    { "priority": "now|soon|mid", "action": "액션명", "description": "설명", "timeline": "기간", "cost": "비용", "assignee": "담당" }
  ],
  "budgetSummary": "예산 배분 요약"
}`,
  };

  return tabPrompts[tab];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/strategy-prompt-builder.ts
git commit -m "feat(strategy): add strategy prompt builder for 5 tabs"
```

---

## Task 6: Strategy Generation API (SSE)

**Files:**
- Create: `src/app/api/ai/strategy/generate/route.ts`
- Create: `src/app/api/ai/strategy/regenerate/route.ts`

- [ ] **Step 1: Create generate route**

Reference existing `/api/ai/generate/route.ts` pattern for Gemini SSE setup.

```typescript
import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { buildStrategyPrompt } from '@/lib/strategy-prompt-builder';
import type { StrategyInput, KeywordItem, CrawlResult, StrategyTab } from '@/types/strategy';

const TABS_ORDER: StrategyTab[] = ['overview', 'keywords', 'channelStrategy', 'contentStrategy', 'kpiAction'];

export async function POST(req: NextRequest) {
  const { input, keywordData, crawlData, model } = (await req.json()) as {
    input: StrategyInput;
    keywordData?: KeywordItem[];
    crawlData?: CrawlResult[];
    model?: string;
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }), { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      for (const tab of TABS_ORDER) {
        send({ type: 'tab_start', tab });

        try {
          const prompt = buildStrategyPrompt(tab, {
            input,
            keywordData,
            crawlResults: crawlData,
          });

          const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: prompt,
          });

          const text = response.text || '';

          // Send text as chunk
          send({ type: 'chunk', tab, content: text });

          // Parse JSON from response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const data = JSON.parse(jsonMatch[0]);
              send({ type: 'tab_complete', tab, data });
            } catch {
              send({ type: 'tab_error', tab, error: 'JSON 파싱 실패' });
            }
          } else {
            send({ type: 'tab_error', tab, error: '응답에서 JSON을 찾을 수 없습니다' });
          }
        } catch (err) {
          send({ type: 'tab_error', tab, error: (err as Error).message });
        }
      }

      send({ type: 'complete' });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Create regenerate route**

```typescript
import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { buildStrategyPrompt } from '@/lib/strategy-prompt-builder';
import type { StrategyInput, KeywordItem, CrawlResult, StrategyTab } from '@/types/strategy';

export async function POST(req: NextRequest) {
  const { tab, instruction, input, keywordData, crawlData, model } = (await req.json()) as {
    tab: StrategyTab;
    instruction?: string;
    input: StrategyInput;
    keywordData?: KeywordItem[];
    crawlData?: CrawlResult[];
    model?: string;
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }), { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      send({ type: 'tab_start', tab });

      try {
        const prompt = buildStrategyPrompt(tab, {
          input,
          keywordData,
          crawlResults: crawlData,
        }, instruction);

        const response = await ai.models.generateContent({
          model: model || 'gemini-2.5-flash',
          contents: prompt,
        });

        const text = response.text || '';
        send({ type: 'chunk', tab, content: text });

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const data = JSON.parse(jsonMatch[0]);
            send({ type: 'tab_complete', tab, data });
          } catch {
            send({ type: 'tab_error', tab, error: 'JSON 파싱 실패' });
          }
        } else {
          send({ type: 'tab_error', tab, error: '응답에서 JSON을 찾을 수 없습니다' });
        }
      } catch (err) {
        send({ type: 'tab_error', tab, error: (err as Error).message });
      }

      send({ type: 'complete' });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/strategy/generate/route.ts src/app/api/ai/strategy/regenerate/route.ts
git commit -m "feat(strategy): add strategy generation and regeneration SSE API endpoints"
```

---

## Task 7: Strategy Generation Hook

**Files:**
- Create: `src/hooks/use-strategy-generation.ts`

- [ ] **Step 1: Create the hook**

Follow the pattern from `use-ai-generation.ts` but handle multi-tab SSE events.

```typescript
'use client';

import { useCallback, useRef, useState } from 'react';
import type { StrategyTab, StrategySSEEvent, StrategyInput, KeywordItem, CrawlResult } from '@/types/strategy';

interface UseStrategyGenerationOptions {
  onTabStart?: (tab: StrategyTab) => void;
  onTabComplete?: (tab: StrategyTab, data: unknown) => void;
  onTabError?: (tab: StrategyTab, error: string) => void;
  onComplete?: () => void;
}

export function useStrategyGeneration({
  onTabStart,
  onTabComplete,
  onTabError,
  onComplete,
}: UseStrategyGenerationOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTab, setCurrentTab] = useState<StrategyTab | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (input: StrategyInput, keywordData?: KeywordItem[], crawlData?: CrawlResult[]) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsGenerating(true);

      try {
        const res = await fetch('/api/ai/strategy/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input, keywordData, crawlData }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const error = await res.json();
          onTabError?.('overview', error.error || '생성 실패');
          setIsGenerating(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            try {
              const event: StrategySSEEvent = JSON.parse(trimmed.slice(6));
              switch (event.type) {
                case 'tab_start':
                  setCurrentTab(event.tab);
                  onTabStart?.(event.tab);
                  break;
                case 'tab_complete':
                  onTabComplete?.(event.tab, event.data);
                  break;
                case 'tab_error':
                  onTabError?.(event.tab, event.error);
                  break;
                case 'complete':
                  onComplete?.();
                  break;
              }
            } catch {
              // skip malformed
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          onTabError?.('overview', (err as Error).message);
        }
      } finally {
        setIsGenerating(false);
        setCurrentTab(null);
      }
    },
    [onTabStart, onTabComplete, onTabError, onComplete]
  );

  const regenerateTab = useCallback(
    async (tab: StrategyTab, instruction: string, input: StrategyInput, keywordData?: KeywordItem[]) => {
      setIsGenerating(true);
      setCurrentTab(tab);

      try {
        const res = await fetch('/api/ai/strategy/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tab, instruction, input, keywordData }),
        });

        if (!res.ok) {
          const error = await res.json();
          onTabError?.(tab, error.error || '재생성 실패');
          setIsGenerating(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            try {
              const event: StrategySSEEvent = JSON.parse(trimmed.slice(6));
              if (event.type === 'tab_complete') onTabComplete?.(event.tab, event.data);
              if (event.type === 'tab_error') onTabError?.(event.tab, event.error);
            } catch {
              // skip
            }
          }
        }
      } catch (err) {
        onTabError?.(tab, (err as Error).message);
      } finally {
        setIsGenerating(false);
        setCurrentTab(null);
      }
    },
    [onTabComplete, onTabError]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setCurrentTab(null);
  }, []);

  return { isGenerating, currentTab, generate, regenerateTab, abort };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-strategy-generation.ts
git commit -m "feat(strategy): add strategy generation SSE hook"
```

---

## Task 8: Strategy Input Form

**Files:**
- Create: `src/components/strategy/strategy-input-form.tsx`

- [ ] **Step 1: Create input form component**

6-field form with auto-fill from project settings. Uses shadcn/ui components.

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useProjectStore } from '@/stores/project-store';
import { Loader2, Plus, X, Sparkles } from 'lucide-react';
import type { StrategyInput } from '@/types/strategy';

interface StrategyInputFormProps {
  onSubmit: (input: StrategyInput) => void;
  isGenerating: boolean;
}

export function StrategyInputForm({ onSubmit, isGenerating }: StrategyInputFormProps) {
  const { selectedProjectId, projects } = useProjectStore();
  const project = projects.find((p) => p.id === selectedProjectId);

  const [targetUrls, setTargetUrls] = useState<string[]>(['']);
  const [industry, setIndustry] = useState(project?.industry || '');
  const [services, setServices] = useState(project?.brand_description || '');
  const [targetCustomer, setTargetCustomer] = useState(() => {
    if (!project?.target_audience) return '';
    if (typeof project.target_audience === 'string') return project.target_audience;
    // Extract readable values from object
    return Object.values(project.target_audience).filter(Boolean).join(', ');
  });
  const [usp, setUsp] = useState(project?.usp || '');
  const [channels, setChannels] = useState(project?.brand_name ? '네이버 블로그, 인스타그램, 유튜브, 스레드' : '');
  const [seedKeywords, setSeedKeywords] = useState('');
  const [competitors, setCompetitors] = useState<{ name: string; url?: string }[]>([]);
  const [competitorInput, setCompetitorInput] = useState('');
  const [monthlyRange, setMonthlyRange] = useState('');
  const [teamSize, setTeamSize] = useState('1');

  const handleSubmit = () => {
    const input: StrategyInput = {
      targetUrls: targetUrls.filter(Boolean),
      businessInfo: {
        industry,
        services,
        targetCustomer,
        usp,
        channels: channels.split(',').map((c) => c.trim()).filter(Boolean),
      },
      seedKeywords: seedKeywords.split(',').map((k) => k.trim()).filter(Boolean),
      competitors,
      budget: monthlyRange ? { monthlyRange, teamSize: parseInt(teamSize) || 1 } : undefined,
    };
    onSubmit(input);
  };

  const addUrl = () => setTargetUrls([...targetUrls, '']);
  const removeUrl = (i: number) => setTargetUrls(targetUrls.filter((_, idx) => idx !== i));
  const updateUrl = (i: number, v: string) => setTargetUrls(targetUrls.map((u, idx) => (idx === i ? v : u)));

  const addCompetitor = () => {
    if (!competitorInput.trim()) return;
    setCompetitors([...competitors, { name: competitorInput.trim() }]);
    setCompetitorInput('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">AI 마케팅 전략 생성</h2>
        <p className="text-sm text-muted-foreground">비즈니스 정보를 입력하면 AI가 통합 마케팅 전략을 수립합니다.</p>
      </div>

      {/* 타겟 URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium">🔗 타겟 URL (선택)</label>
        {targetUrls.map((url, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="https://example.com" value={url} onChange={(e) => updateUrl(i, e.target.value)} />
            {targetUrls.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeUrl(i)}><X size={16} /></Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addUrl}><Plus size={14} className="mr-1" />URL 추가</Button>
      </div>

      {/* 비즈니스 정보 */}
      <div className="space-y-3">
        <label className="text-sm font-medium">🏢 비즈니스 정보 (필수)</label>
        <Input placeholder="업종 (예: 소아 성장 클리닉)" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        <Textarea placeholder="주요 서비스/제품 설명" value={services} onChange={(e) => setServices(e.target.value)} rows={2} />
        <Input placeholder="타겟 고객 (예: 초등학생 자녀를 둔 30~45세 부모)" value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)} />
        <Input placeholder="차별화 포인트 (USP)" value={usp} onChange={(e) => setUsp(e.target.value)} />
        <Input placeholder="보유 채널 (쉼표 구분)" value={channels} onChange={(e) => setChannels(e.target.value)} />
      </div>

      {/* 키워드 시드 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">🔍 핵심 키워드 (필수, 쉼표 구분)</label>
        <Textarea placeholder="성장클리닉, 키크는법, 성조숙증, 성장호르몬" value={seedKeywords} onChange={(e) => setSeedKeywords(e.target.value)} rows={2} />
      </div>

      {/* 경쟁사 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">⚔️ 경쟁사 (선택)</label>
        <div className="flex gap-2">
          <Input placeholder="경쟁사 이름" value={competitorInput} onChange={(e) => setCompetitorInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCompetitor()} />
          <Button variant="outline" onClick={addCompetitor}><Plus size={14} /></Button>
        </div>
        {competitors.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {competitors.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm">
                {c.name}
                <button onClick={() => setCompetitors(competitors.filter((_, idx) => idx !== i))}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 예산 & 인력 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">💰 월 마케팅 예산 (선택)</label>
          <Input placeholder="예: 300-500만원" value={monthlyRange} onChange={(e) => setMonthlyRange(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">👥 담당 인원</label>
          <Input type="number" min="1" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
        </div>
      </div>

      {/* Submit */}
      <Button className="w-full h-12 text-base" onClick={handleSubmit} disabled={isGenerating || !industry || !seedKeywords}>
        {isGenerating ? (
          <><Loader2 size={18} className="animate-spin mr-2" />전략 생성 중...</>
        ) : (
          <><Sparkles size={18} className="mr-2" />전략 생성하기</>
        )}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/strategy/strategy-input-form.tsx
git commit -m "feat(strategy): add strategy input form with project auto-fill"
```

---

## Task 9: Strategy Dashboard & Tab Components

**Files:**
- Create: `src/components/strategy/strategy-hero.tsx`
- Create: `src/components/strategy/strategy-tabs.tsx`
- Create: `src/components/strategy/overview-tab.tsx`
- Create: `src/components/strategy/keyword-tab.tsx`
- Create: `src/components/strategy/keyword-table.tsx`
- Create: `src/components/strategy/channel-tab.tsx`
- Create: `src/components/strategy/content-tab.tsx`
- Create: `src/components/strategy/topic-table.tsx`
- Create: `src/components/strategy/kpi-tab.tsx`
- Create: `src/components/strategy/strategy-dashboard.tsx`

This is the largest task. Each tab renders its data type from the store. Follow the sample HTML's card/table/grid layout using Tailwind CSS.

- [ ] **Step 1: Create strategy-hero.tsx**

Hero banner with key stats. Reference the sample HTML's `.hero` section.

```typescript
'use client';

import type { HeroStat } from '@/types/strategy';

interface StrategyHeroProps {
  projectName: string;
  stats: HeroStat[];
}

export function StrategyHero({ projectName, stats }: StrategyHeroProps) {
  return (
    <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 px-8 py-10 text-white">
      <div className="max-w-5xl mx-auto">
        <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 px-3 py-1 rounded-full text-xs font-medium mb-3">
          📋 통합 마케팅 전략
        </span>
        <h1 className="text-3xl font-black tracking-tight mb-2">{projectName}<br/>통합 마케팅 전략 대시보드</h1>
        <p className="text-sm text-white/70 max-w-xl mb-6">
          키워드 데이터 + 채널 전략 + 콘텐츠 자동화(ContentFlow) 를 하나로 연결하는 마케팅 로드맵
        </p>
        {stats.length > 0 && (
          <div className="flex gap-7 flex-wrap">
            {stats.map((s, i) => (
              <div key={i}>
                <div className="text-2xl font-black tracking-tight">{s.value}</div>
                <div className="text-xs text-white/55 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create strategy-tabs.tsx**

5-tab navigation component.

```typescript
'use client';

import { cn } from '@/lib/utils';
import { Building2, Search, Share2, FileText, Target } from 'lucide-react';
import type { StrategyTab, TabStatus } from '@/types/strategy';

const tabs: { id: StrategyTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: '개요·경쟁사', icon: <Building2 size={16} /> },
  { id: 'keywords', label: '키워드 분석', icon: <Search size={16} /> },
  { id: 'channelStrategy', label: '채널·퍼널', icon: <Share2 size={16} /> },
  { id: 'contentStrategy', label: '콘텐츠·주제', icon: <FileText size={16} /> },
  { id: 'kpiAction', label: 'KPI·액션', icon: <Target size={16} /> },
];

interface StrategyTabsProps {
  activeTab: StrategyTab;
  onTabChange: (tab: StrategyTab) => void;
  tabStatuses: Record<StrategyTab, TabStatus>;
}

export function StrategyTabs({ activeTab, onTabChange, tabStatuses }: StrategyTabsProps) {
  return (
    <div className="border-b border-border bg-background sticky top-0 z-10">
      <nav className="flex gap-1 px-6 max-w-5xl mx-auto">
        {tabs.map((tab) => {
          const status = tabStatuses[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
              {status.status === 'generating' && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
              {status.status === 'complete' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
              {status.status === 'error' && (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: Create overview-tab.tsx**

Reference: `sample/통합_마케팅_전략.html` sections `#overview`, `#issues`, `#competitors`.

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OverviewData } from '@/types/strategy';
import { useState } from 'react';

const SEVERITY_STYLES = {
  critical: { icon: '🔴', border: 'border-l-red-500' },
  warning: { icon: '🟡', border: 'border-l-amber-500' },
  opportunity: { icon: '🟢', border: 'border-l-emerald-500' },
};
const COLOR_STYLES = {
  teal: 'border-t-emerald-600 text-emerald-700',
  amber: 'border-t-amber-600 text-amber-700',
  coral: 'border-t-red-600 text-red-700',
  purple: 'border-t-purple-600 text-purple-700',
};

interface OverviewTabProps {
  data: OverviewData | null;
  onRegenerate?: (instruction: string) => void;
}

export function OverviewTab({ data, onRegenerate }: OverviewTabProps) {
  const [instruction, setInstruction] = useState('');

  if (!data) return <div className="text-center text-muted-foreground py-16">데이터 없음 — 전략을 생성해주세요.</div>;

  return (
    <div className="space-y-8">
      {/* Regenerate */}
      {onRegenerate && (
        <div className="flex gap-2">
          <Input placeholder="수정 지시 (예: 경쟁사 추가해줘)" value={instruction} onChange={(e) => setInstruction(e.target.value)} className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => { onRegenerate(instruction); setInstruction(''); }}>
            <RefreshCw size={14} className="mr-1" />재생성
          </Button>
        </div>
      )}

      {/* Summary */}
      <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>

      {/* Differentiators */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-700 mb-3">핵심 차별화</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.differentiators.map((d, i) => (
            <div key={i} className={cn('bg-white border rounded-xl p-4 border-t-[3px]', COLOR_STYLES[d.color])}>
              <div className="text-xs font-bold uppercase tracking-wider mb-1">{d.label}</div>
              <div className="font-bold text-sm mb-1">{d.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{d.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Issues */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-red-700 mb-3">현재 문제점 & 기회</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.issues.map((issue, i) => (
            <div key={i} className={cn('bg-white border rounded-xl p-4 border-l-4', SEVERITY_STYLES[issue.severity].border)}>
              <div className="text-lg mb-1">{SEVERITY_STYLES[issue.severity].icon}</div>
              <div className="font-bold text-sm mb-1">{issue.title}</div>
              <div className="text-xs text-muted-foreground">{issue.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Competitors */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-700 mb-3">경쟁사 분석</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.competitors.map((c, i) => (
            <div key={i} className="bg-white border rounded-xl p-4 border-l-4 border-l-amber-500">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">{c.type}</div>
              <div className="font-bold text-sm mb-2">{c.name}</div>
              <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                <div><strong>강점:</strong> {c.strengths}</div>
                <div><strong>약점:</strong> {c.weaknesses}</div>
                <div><strong>전략:</strong> {c.strategy}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Positioning */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
        <strong>차별화 포지셔닝:</strong> {data.positioning}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create keyword-table.tsx**

Reference: `sample/통합_마케팅_전략.html` section `#kw-db`.
Sortable/filterable table. Columns: keyword, total search (with bar), PC, mobile, mobile%, competition badge, category badge. Filter buttons for categories. Sort by column headers.

```typescript
'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { KeywordItem } from '@/types/strategy';

const COMP_STYLES = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-emerald-100 text-emerald-700' };
const COMP_LABEL = { high: '높음', medium: '중간', low: '낮음' };

interface KeywordTableProps {
  items: KeywordItem[];
  categories: string[];
}

export function KeywordTable({ items, categories }: KeywordTableProps) {
  const [filter, setFilter] = useState('all');
  const [sortKey, setSortKey] = useState<'totalSearch' | 'mobileRatio' | 'competition'>('totalSearch');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let result = items;
    if (filter === 'golden') result = result.filter((k) => k.isGolden);
    else if (filter === 'high') result = result.filter((k) => k.totalSearch >= 2000);
    else if (filter !== 'all') result = result.filter((k) => k.category === filter);

    return [...result].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [items, filter, sortKey, sortAsc]);

  const maxVol = items.length ? Math.max(...items.map((k) => k.totalSearch)) : 1;

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-1.5 mb-3 flex-wrap items-center">
        {[{ id: 'all', label: '전체' }, { id: 'golden', label: '🥇 황금' }, { id: 'high', label: '🔴 2000+' }, ...categories.map((c) => ({ id: c, label: c }))].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={cn('px-3 py-1 rounded-full text-xs font-semibold border transition-colors', filter === f.id ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-muted-foreground border-border hover:border-emerald-500')}>
            {f.label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length}개</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left p-2 text-xs font-bold text-muted-foreground">키워드</th>
              <th className="text-right p-2 text-xs font-bold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort('totalSearch')}>월 검색량 {sortKey === 'totalSearch' ? (sortAsc ? '↑' : '↓') : ''}</th>
              <th className="text-right p-2 text-xs font-bold text-muted-foreground">PC</th>
              <th className="text-right p-2 text-xs font-bold text-muted-foreground">모바일</th>
              <th className="text-right p-2 text-xs font-bold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort('mobileRatio')}>모바일%</th>
              <th className="text-left p-2 text-xs font-bold text-muted-foreground">경쟁</th>
              <th className="text-left p-2 text-xs font-bold text-muted-foreground">분류</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((k, i) => {
              const barW = Math.max(4, Math.round((k.totalSearch / maxVol) * 70));
              return (
                <tr key={i} className="border-b border-border hover:bg-muted/30">
                  <td className="p-2 font-semibold">{k.keyword}{k.isGolden ? ' 🥇' : ''}</td>
                  <td className="p-2 text-right tabular-nums">
                    <span className="inline-block h-1.5 rounded-full bg-emerald-600 align-middle mr-1" style={{ width: `${barW}px` }} />
                    {k.totalSearch.toLocaleString()}
                  </td>
                  <td className="p-2 text-right text-muted-foreground tabular-nums">{k.pcSearch.toLocaleString()}</td>
                  <td className="p-2 text-right text-muted-foreground tabular-nums">{k.mobileSearch.toLocaleString()}</td>
                  <td className="p-2 text-right text-muted-foreground tabular-nums">{k.mobileRatio}%</td>
                  <td className="p-2"><span className={cn('px-2 py-0.5 rounded-lg text-xs font-bold', COMP_STYLES[k.competition])}>{COMP_LABEL[k.competition]}</span></td>
                  <td className="p-2"><span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-muted">{k.category}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create keyword-tab.tsx**

Combines: summary stats grid, golden keyword cards, insight cards, keyword-table. Receives `KeywordData` + raw `naverKeywords`.

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';
import { KeywordTable } from './keyword-table';
import { cn } from '@/lib/utils';
import type { KeywordData, KeywordItem } from '@/types/strategy';
import { useState } from 'react';

const COLOR_STYLES = { teal: 'border-t-emerald-600', amber: 'border-t-amber-600', coral: 'border-t-red-600', purple: 'border-t-purple-600' };

interface KeywordTabProps {
  data: KeywordData | null;
  naverKeywords: KeywordItem[];
  onRegenerate?: (instruction: string) => void;
}

export function KeywordTab({ data, naverKeywords, onRegenerate }: KeywordTabProps) {
  const [instruction, setInstruction] = useState('');

  if (!data && naverKeywords.length === 0) return <div className="text-center text-muted-foreground py-16">데이터 없음</div>;

  const items = data ? data.items : naverKeywords;

  return (
    <div className="space-y-8">
      {onRegenerate && (
        <div className="flex gap-2">
          <Input placeholder="수정 지시" value={instruction} onChange={(e) => setInstruction(e.target.value)} className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => { onRegenerate(instruction); setInstruction(''); }}>
            <RefreshCw size={14} className="mr-1" />재생성
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-xl p-3"><div className="text-2xl font-black">{items.length}</div><div className="text-xs text-muted-foreground">분석 키워드</div></div>
        <div className="bg-white border rounded-xl p-3"><div className="text-2xl font-black text-red-600">{items.filter((k) => k.totalSearch >= 2000).length}</div><div className="text-xs text-muted-foreground">고볼륨 2000+</div></div>
        <div className="bg-white border rounded-xl p-3"><div className="text-2xl font-black text-emerald-600">{data?.goldenKeywords.length || 0}</div><div className="text-xs text-muted-foreground">황금 키워드</div></div>
        <div className="bg-white border rounded-xl p-3"><div className="text-2xl font-black">{items.length ? Math.round(items.reduce((s, k) => s + k.mobileRatio, 0) / items.length) : 0}%</div><div className="text-xs text-muted-foreground">평균 모바일 비중</div></div>
      </div>

      {/* Golden Keywords */}
      {data?.goldenKeywords && data.goldenKeywords.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">🥇 황금 키워드 — 지금 당장 공략 가능</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.goldenKeywords.map((gk, i) => (
              <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="text-xs font-bold text-emerald-700 mb-1">#{gk.priority} · 월 {gk.totalSearch.toLocaleString()} · 경쟁 {gk.competition}</div>
                <div className="font-bold mb-1">{gk.keyword}</div>
                <div className="text-xs text-muted-foreground">{gk.strategy}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {data?.insights && data.insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.insights.map((ins, i) => (
            <div key={i} className={cn('bg-white border rounded-xl p-4 border-t-[3px]', COLOR_STYLES[ins.color])}>
              <div className="font-bold text-sm mb-1">{ins.title}</div>
              <div className="text-xs text-muted-foreground">{ins.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Keyword Table */}
      <KeywordTable items={items} categories={data?.categories || []} />
    </div>
  );
}
```

- [ ] **Step 6: Create channel-tab.tsx**

Reference: `sample/통합_마케팅_전략.html` sections `#funnel`, `#channels`.

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';
import type { ChannelStrategyData } from '@/types/strategy';

interface ChannelTabProps {
  data: ChannelStrategyData | null;
  onRegenerate?: (instruction: string) => void;
}

export function ChannelTab({ data, onRegenerate }: ChannelTabProps) {
  const [instruction, setInstruction] = useState('');

  if (!data) return <div className="text-center text-muted-foreground py-16">데이터 없음</div>;

  return (
    <div className="space-y-8">
      {onRegenerate && (
        <div className="flex gap-2">
          <Input placeholder="수정 지시" value={instruction} onChange={(e) => setInstruction(e.target.value)} className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => { onRegenerate(instruction); setInstruction(''); }}>
            <RefreshCw size={14} className="mr-1" />재생성
          </Button>
        </div>
      )}

      {/* Funnel */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-700 mb-3">유입 퍼널</h3>
        <div className="flex gap-0 flex-wrap">
          {data.funnel.map((step, i) => (
            <div key={i} className="flex-1 min-w-[120px] p-3 text-center bg-white border border-border relative first:rounded-l-xl last:rounded-r-xl">
              <div className="text-xl mb-1">{step.icon}</div>
              <div className="text-xs font-bold">{step.title}</div>
              <div className="text-[11px] text-muted-foreground">{step.description}</div>
              {i < data.funnel.length - 1 && <span className="absolute right-[-10px] top-1/2 -translate-y-1/2 z-10 text-emerald-600 font-black">→</span>}
            </div>
          ))}
        </div>
        {data.funnelActions && <p className="text-xs text-muted-foreground mt-2">{data.funnelActions}</p>}
      </div>

      {/* Homepage Optimization */}
      {data.homepageOptimization && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>홈페이지 최적화:</strong> {data.homepageOptimization}
        </div>
      )}

      {/* Channel Cards */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-700 mb-3">채널별 전략</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.channels.map((ch, i) => (
            <div key={i} className="bg-white border rounded-xl p-4 border-l-4 border-l-emerald-500">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">{ch.icon} {ch.channel} · {ch.frequency}</div>
              <div className="font-bold text-sm mb-2">{ch.bestTime}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{ch.strategy}</div>
              {ch.keywords.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {ch.keywords.map((kw, j) => <span key={j} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[11px] font-semibold">{kw}</span>)}
                </div>
              )}
              {ch.adBudget && <div className="text-xs text-amber-700 mt-2">💰 {ch.adBudget}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Table */}
      {data.schedule.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">주간 발행 스케줄</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/50">
                  <th className="text-left p-2 text-xs font-bold">채널</th>
                  {['월','화','수','목','금','토'].map((d) => <th key={d} className="text-center p-2 text-xs font-bold">{d}</th>)}
                  <th className="text-center p-2 text-xs font-bold">주 횟수</th>
                  <th className="text-center p-2 text-xs font-bold">시간</th>
                </tr>
              </thead>
              <tbody>
                {data.schedule.map((row, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-2 font-bold text-sm">{row.channel}</td>
                    {['월','화','수','목','금','토'].map((d) => (
                      <td key={d} className="p-2 text-center text-xs">
                        {row.days[d] && row.days[d] !== '—'
                          ? <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-semibold">{row.days[d]}</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    ))}
                    <td className="p-2 text-center font-black text-emerald-700">{row.weeklyCount}</td>
                    <td className="p-2 text-center text-xs text-muted-foreground">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles */}
      {data.roles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.roles.map((r, i) => (
            <div key={i} className="bg-white border rounded-xl p-4 text-center border-t-[3px] border-t-amber-500">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700">{r.role}</div>
              <div className="font-bold text-sm my-1">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.tasks}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Create topic-table.tsx**

```typescript
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TopicItem } from '@/types/strategy';

const CAT_STYLES: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-red-100 text-red-700',
  D: 'bg-purple-100 text-purple-700',
  E: 'bg-gray-100 text-gray-700',
};

interface TopicTableProps {
  topics: TopicItem[];
  categories: { code: string; name: string }[];
  onCreateContent?: (topic: TopicItem) => void;
}

export function TopicTable({ topics, categories, onCreateContent }: TopicTableProps) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return topics;
    return topics.filter((t) => t.category === filter);
  }, [topics, filter]);

  return (
    <div>
      <div className="flex gap-1.5 mb-3 flex-wrap items-center">
        <button onClick={() => setFilter('all')} className={cn('px-3 py-1 rounded-full text-xs font-semibold border', filter === 'all' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-muted-foreground border-border')}>
          전체 {topics.length}
        </button>
        {categories.map((c) => (
          <button key={c.code} onClick={() => setFilter(c.code)} className={cn('px-3 py-1 rounded-full text-xs font-semibold border', filter === c.code ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-muted-foreground border-border')}>
            {c.code}. {c.name}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length}개</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left p-2 text-xs font-bold text-muted-foreground w-16">No.</th>
              <th className="text-left p-2 text-xs font-bold text-muted-foreground">카테고리</th>
              <th className="text-left p-2 text-xs font-bold text-muted-foreground">주제</th>
              <th className="text-left p-2 text-xs font-bold text-muted-foreground">각도</th>
              <th className="text-left p-2 text-xs font-bold text-muted-foreground">키워드</th>
              {onCreateContent && <th className="p-2 w-20"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-2 text-xs font-bold text-muted-foreground">{t.id}</td>
                <td className="p-2"><span className={cn('px-2 py-0.5 rounded-lg text-xs font-semibold', CAT_STYLES[t.category] || 'bg-gray-100')}>{t.category}</span></td>
                <td className="p-2 font-medium">{t.title}</td>
                <td className="p-2 text-xs text-muted-foreground">{t.angle}</td>
                <td className="p-2 text-xs text-emerald-700">{t.keywords.join(', ')}</td>
                {onCreateContent && (
                  <td className="p-2">
                    <Button variant="ghost" size="sm" onClick={() => onCreateContent(t)} className="h-7 text-xs">
                      <Plus size={12} className="mr-1" />만들기
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 7b: Create content-tab.tsx**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';
import { TopicTable } from './topic-table';
import type { ContentStrategyData, TopicItem } from '@/types/strategy';

interface ContentTabProps {
  data: ContentStrategyData | null;
  onRegenerate?: (instruction: string) => void;
  onCreateContent?: (topic: TopicItem) => void;
}

export function ContentTab({ data, onRegenerate, onCreateContent }: ContentTabProps) {
  const [instruction, setInstruction] = useState('');

  if (!data) return <div className="text-center text-muted-foreground py-16">데이터 없음</div>;

  return (
    <div className="space-y-8">
      {onRegenerate && (
        <div className="flex gap-2">
          <Input placeholder="수정 지시" value={instruction} onChange={(e) => setInstruction(e.target.value)} className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => { onRegenerate(instruction); setInstruction(''); }}>
            <RefreshCw size={14} className="mr-1" />재생성
          </Button>
        </div>
      )}

      {/* Category Cycle */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-700 mb-3">콘텐츠 카테고리</h3>
        <div className="flex gap-0 flex-wrap mb-3">
          {data.categories.map((cat, i) => (
            <div key={i} className="flex-1 min-w-[120px] p-3 bg-white border border-border first:rounded-l-xl last:rounded-r-xl">
              <div className="text-xl font-black" style={{ color: ['#0F6E56','#BA7517','#993C1D','#534AB7','#444441'][i % 5] }}>{cat.code}</div>
              <div className="text-xs font-bold">{cat.name}</div>
              <div className="text-[11px] text-muted-foreground">{cat.description} · {cat.topicCount}개</div>
            </div>
          ))}
        </div>
        {data.cycleInfo && <p className="text-xs text-muted-foreground">{data.cycleInfo}</p>}
        {data.categoryRatios && <p className="text-xs text-muted-foreground">{data.categoryRatios}</p>}
      </div>

      {/* Topic Table */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-700 mb-3">콘텐츠 주제 목록 ({data.topics.length}개)</h3>
        <TopicTable topics={data.topics} categories={data.categories} onCreateContent={onCreateContent} />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create kpi-tab.tsx**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KpiActionData } from '@/types/strategy';

const PRIORITY_STYLES = {
  now: 'bg-green-100 text-green-800',
  soon: 'bg-amber-100 text-amber-800',
  mid: 'bg-purple-100 text-purple-800',
};
const PRIORITY_LABEL = { now: '즉시', soon: '단기', mid: '중기' };

interface KpiTabProps {
  data: KpiActionData | null;
  onRegenerate?: (instruction: string) => void;
}

export function KpiTab({ data, onRegenerate }: KpiTabProps) {
  const [instruction, setInstruction] = useState('');

  if (!data) return <div className="text-center text-muted-foreground py-16">데이터 없음</div>;

  return (
    <div className="space-y-8">
      {onRegenerate && (
        <div className="flex gap-2">
          <Input placeholder="수정 지시" value={instruction} onChange={(e) => setInstruction(e.target.value)} className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => { onRegenerate(instruction); setInstruction(''); }}>
            <RefreshCw size={14} className="mr-1" />재생성
          </Button>
        </div>
      )}

      {/* Channel KPIs */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-700 mb-3">채널별 KPI</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.channelKpis.map((kpi, i) => (
            <div key={i} className="bg-white border rounded-xl p-4 border-t-[3px] border-t-emerald-600">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">{kpi.icon} {kpi.channel}</div>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {kpi.metrics.map((m, j) => <span key={j} className="px-2 py-0.5 bg-muted rounded-full text-[11px] font-semibold">{m}</span>)}
              </div>
              <div className="text-xs font-bold text-emerald-700">🎯 {kpi.target}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Integrated KPI */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="text-xs font-bold text-amber-700 mb-2">📊 통합 KPI</div>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {data.integratedKpi.metrics.map((m, i) => <span key={i} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-semibold">{m}</span>)}
        </div>
        {data.integratedKpi.warning && <div className="text-xs text-red-700 font-bold">⚠️ {data.integratedKpi.warning}</div>}
      </div>

      {/* Action Plan */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-700 mb-3">우선순위 액션플랜</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-emerald-700 text-white">
                <th className="text-left p-2 text-xs font-bold">순위</th>
                <th className="text-left p-2 text-xs font-bold">액션</th>
                <th className="text-left p-2 text-xs font-bold">타임라인</th>
                <th className="text-left p-2 text-xs font-bold">비용/월</th>
                <th className="text-left p-2 text-xs font-bold">담당</th>
              </tr>
            </thead>
            <tbody>
              {data.actions.map((a, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/30">
                  <td className="p-2"><span className={cn('px-2 py-0.5 rounded-lg text-xs font-bold', PRIORITY_STYLES[a.priority])}>{PRIORITY_LABEL[a.priority]}</span></td>
                  <td className="p-2">
                    <div className="font-bold text-sm">{a.action}</div>
                    {a.description && <div className="text-xs text-muted-foreground">{a.description}</div>}
                  </td>
                  <td className="p-2 text-sm">{a.timeline}</td>
                  <td className="p-2 text-sm">{a.cost}</td>
                  <td className="p-2 text-sm">{a.assignee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget Summary */}
      {data.budgetSummary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          <strong>예산 배분 요약:</strong> {data.budgetSummary}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 10: Create strategy-dashboard.tsx**

Wrapper that combines hero + tabs + active tab content. Manages tab state and regeneration.

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useStrategyGeneration } from '@/hooks/use-strategy-generation';
import { StrategyInputForm } from './strategy-input-form';
import { StrategyHero } from './strategy-hero';
import { StrategyTabs } from './strategy-tabs';
import { OverviewTab } from './overview-tab';
import { KeywordTab } from './keyword-tab';
import { ChannelTab } from './channel-tab';
import { ContentTab } from './content-tab';
import { KpiTab } from './kpi-tab';
import type { StrategyTab, StrategyInput, KeywordItem } from '@/types/strategy';

export function StrategyDashboard() {
  const { selectedProjectId, projects, getStrategy, createOrUpdateStrategy, updateStrategyTab, updateStrategyStatus } = useProjectStore();
  const project = projects.find((p) => p.id === selectedProjectId);
  const strategy = selectedProjectId ? getStrategy(selectedProjectId) : undefined;

  const [activeTab, setActiveTab] = useState<StrategyTab>('overview');
  const [naverKeywords, setNaverKeywords] = useState<KeywordItem[]>([]);

  const { isGenerating, currentTab, generate, regenerateTab, abort } = useStrategyGeneration({
    onTabStart: (tab) => {
      if (strategy) {
        updateStrategyStatus(strategy.id, {
          overall: 'generating',
          tabs: { [tab]: { status: 'generating' } } as Record<StrategyTab, { status: 'generating' }>,
        });
      }
    },
    onTabComplete: (tab, data) => {
      if (strategy) {
        updateStrategyTab(strategy.id, tab, data);
      }
    },
    onTabError: (tab, error) => {
      if (strategy) {
        updateStrategyStatus(strategy.id, {
          tabs: { [tab]: { status: 'error', errorMessage: error } } as Record<StrategyTab, { status: 'error'; errorMessage: string }>,
        });
      }
    },
    onComplete: () => {
      if (strategy) {
        updateStrategyStatus(strategy.id, { overall: 'complete' });
      }
    },
  });

  const handleSubmit = useCallback(async (input: StrategyInput) => {
    if (!selectedProjectId) return;
    createOrUpdateStrategy(selectedProjectId, input);

    // 1. Fetch Naver keywords
    let keywordData: KeywordItem[] = [];
    try {
      const kwRes = await fetch('/api/naver/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: input.seedKeywords }),
      });
      if (kwRes.ok) {
        const kwData = await kwRes.json();
        keywordData = (kwData.keywords || []).map((k: { keyword: string; pcSearchVolume: number; mobileSearchVolume: number; totalSearchVolume: number; competition: string; pcClickCount: number; mobileClickCount: number; pcCtr: number; mobileCtr: number }) => ({
          keyword: k.keyword,
          totalSearch: k.totalSearchVolume,
          pcSearch: k.pcSearchVolume,
          mobileSearch: k.mobileSearchVolume,
          mobileRatio: k.totalSearchVolume ? Math.round((k.mobileSearchVolume / k.totalSearchVolume) * 100) : 0,
          competition: (k.competition === 'HIGH' ? 'high' : k.competition === 'MEDIUM' ? 'medium' : 'low') as 'high' | 'medium' | 'low',
          plAvgDepth: 0,
          pcClickCount: k.pcClickCount,
          mobileClickCount: k.mobileClickCount,
          pcCtr: k.pcCtr,
          mobileCtr: k.mobileCtr,
          category: '',
          isGolden: false,
        }));
        setNaverKeywords(keywordData);
      }
    } catch { /* continue without keyword data */ }

    // 2. Crawl URLs
    let crawlData;
    if (input.targetUrls.length > 0) {
      try {
        const crawlRes = await fetch('/api/ai/strategy/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: input.targetUrls }),
        });
        if (crawlRes.ok) {
          const d = await crawlRes.json();
          crawlData = d.results;
        }
      } catch { /* continue without crawl data */ }
    }

    // 3. Generate strategy
    generate(input, keywordData, crawlData);
  }, [selectedProjectId, createOrUpdateStrategy, generate]);

  if (!project) return null;

  // Show input form if no strategy exists
  if (!strategy || strategy.generationStatus.overall === 'idle') {
    return <StrategyInputForm onSubmit={handleSubmit} isGenerating={isGenerating} />;
  }

  const defaultTabStatus = { status: 'idle' as const };

  return (
    <div className="flex flex-col h-full">
      <StrategyHero
        projectName={project.name}
        stats={strategy.overview?.heroStats || []}
      />
      <StrategyTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabStatuses={strategy.generationStatus.tabs || {
          overview: defaultTabStatus,
          keywords: defaultTabStatus,
          channelStrategy: defaultTabStatus,
          contentStrategy: defaultTabStatus,
          kpiAction: defaultTabStatus,
        }}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          {activeTab === 'overview' && <OverviewTab data={strategy.overview} />}
          {activeTab === 'keywords' && <KeywordTab data={strategy.keywords} naverKeywords={naverKeywords} />}
          {activeTab === 'channelStrategy' && <ChannelTab data={strategy.channelStrategy} />}
          {activeTab === 'contentStrategy' && <ContentTab data={strategy.contentStrategy} />}
          {activeTab === 'kpiAction' && <KpiTab data={strategy.kpiAction} />}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Commit**

```bash
git add src/components/strategy/
git commit -m "feat(strategy): add strategy dashboard with 5-tab UI components"
```

---

## Task 10: Strategy Page Route

**Files:**
- Create: `src/app/dashboard/strategy/page.tsx`

- [ ] **Step 1: Create strategy page**

```typescript
'use client';

import { StrategyDashboard } from '@/components/strategy/strategy-dashboard';

export default function StrategyPage() {
  return <StrategyDashboard />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/strategy/page.tsx
git commit -m "feat(strategy): add strategy page route"
```

---

## Task 11: Dashboard Integration — Strategy Button

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add strategy button to dashboard**

In `DashboardPage`, when a project is selected and content tabs are showing, add a "AI 마케팅 전략" button in the header area. Clicking it navigates to `/dashboard/strategy`.

Read `src/app/dashboard/page.tsx` and add a button with `useRouter` from `next/navigation` that navigates to `/dashboard/strategy`. Place it near the project header or as a prominent action button above the content tabs.

- [ ] **Step 2: Verify navigation works**

```bash
npm run dev
```

Open http://localhost:3000, select a project, click "AI 마케팅 전략" button → should navigate to strategy page showing the input form.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(strategy): add AI marketing strategy button to dashboard"
```

---

## Task 12: Blog Panel Keyword Banner

**Files:**
- Modify: `src/components/content/blog-panel.tsx`

- [ ] **Step 1: Add keyword recommendation banner**

In the blog panel's Outer component (top area), add a banner that shows when a strategy exists for the current project. Display top 3 golden keywords with "키워드 적용" button.

Read the current `blog-panel.tsx` and add after the model selector area:

```typescript
// Inside BlogPanelOuter or equivalent, after the header
const strategy = useProjectStore((s) => s.getStrategy(/* projectId */));

{strategy?.keywords?.goldenKeywords && strategy.keywords.goldenKeywords.length > 0 && (
  <div className="mx-4 mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">🥇 추천 키워드 (마케팅 전략)</div>
    <div className="flex gap-2 flex-wrap">
      {strategy.keywords.goldenKeywords.slice(0, 3).map((gk) => (
        <button
          key={gk.keyword}
          onClick={() => onSetPrimary?.(gk.keyword)}
          className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900 rounded hover:bg-emerald-200 transition-colors"
        >
          {gk.keyword} ({gk.totalSearch.toLocaleString()}/월)
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/content/blog-panel.tsx
git commit -m "feat(strategy): add golden keyword banner to blog panel"
```

---

## Task 13: Build Verification & Cleanup

- [ ] **Step 1: Run build**

```bash
cd /c/projects/ContentFlow-0.1/contentflow && npm run build
```

Fix any TypeScript errors.

- [ ] **Step 2: Run existing tests**

```bash
npm run test
```

Ensure no regressions.

- [ ] **Step 3: Manual smoke test**

1. Open http://localhost:3000
2. Select/create a project
3. Click "AI 마케팅 전략" button
4. Fill in the input form
5. Click "전략 생성하기"
6. Verify 5 tabs generate sequentially
7. Navigate back to content tabs
8. Check blog panel shows keyword banner

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(strategy): complete AI marketing strategy feature with 5-tab dashboard"
```
