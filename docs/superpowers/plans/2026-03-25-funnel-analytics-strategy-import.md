# 퍼널 등록 · GA4 연동 · 전략 임포트 · 주간 보고서 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로젝트별 메인 퍼널(웹사이트) 등록, Google Analytics 4 실시간 현황 대시보드, 외부 마케팅 전략 HTML 임포트 → 키워드/카테고리/주제 자동 연동, 주간 결과 보고서 생성

**Architecture:** Project 엔티티에 퍼널/GA4 설정 필드 추가. 새 프로젝트 설정 탭(퍼널·분석)에서 웹사이트 URL + GA4 인증 정보 입력. 전략 HTML 파싱은 서버 API route에서 cheerio로 처리 후 프로젝트에 저장. 콘텐츠 생성 시 저장된 키워드/카테고리/주제를 자동 추천. 주간 보고서는 GA4 데이터 + 콘텐츠 발행 현황을 결합하여 HTML 생성.

**Tech Stack:** Next.js 16 App Router, `@google-analytics/data` (GA4 Data API), `cheerio` (HTML 파싱, 이미 설치됨), Zustand + IndexedDB, shadcn/ui, Recharts (차트)

---

## File Structure

### 신규 생성 파일

```
src/
├── types/
│   └── analytics.ts                         # GA4 + 퍼널 + 주간보고서 타입
├── app/api/
│   ├── analytics/
│   │   ├── overview/route.ts                # GA4 종합 지표 (세션, 이탈률, 페이지뷰)
│   │   ├── traffic/route.ts                 # GA4 트래픽 소스/채널
│   │   └── top-pages/route.ts               # GA4 인기 페이지
│   └── strategy/
│       └── import-html/route.ts             # 전략 HTML 파싱 → 키워드/카테고리/주제 추출
├── components/
│   ├── project/
│   │   └── funnel-analytics-section.tsx      # 프로젝트 설정 > 퍼널·분석 탭
│   ├── analytics/
│   │   ├── analytics-dashboard.tsx           # GA4 대시보드 메인
│   │   ├── overview-cards.tsx                # 핵심 지표 카드 (세션, 사용자, 이탈률)
│   │   ├── traffic-chart.tsx                 # 트래픽 소스 차트
│   │   ├── pageviews-chart.tsx               # 일별 페이지뷰 라인 차트
│   │   └── top-pages-table.tsx               # 인기 페이지 테이블
│   ├── strategy/
│   │   └── strategy-import-dialog.tsx        # 전략 HTML 임포트 다이얼로그
│   └── report/
│       └── weekly-report-dialog.tsx          # 주간 보고서 생성/미리보기
├── hooks/
│   └── use-analytics.ts                     # GA4 데이터 fetching 훅
└── lib/
    ├── strategy-html-parser.ts              # 전략 HTML에서 키워드/카테고리/주제 추출
    └── weekly-report-builder.ts             # 주간 보고서 HTML 생성
```

### 수정 파일

```
src/
├── types/database.ts                        # Project 인터페이스에 funnel/ga4/imported strategy 필드 추가
├── app/dashboard/page.tsx                   # showAnalytics 라우팅 추가
├── components/project/project-settings.tsx   # 퍼널·분석 탭 추가
├── components/project/create-content-dialog.tsx  # 카테고리/주제 선택 드롭다운 추가
├── components/content/blog-panel.tsx         # 임포트된 키워드 자동 추천 배너 확장
├── components/sidebar/project-tree.tsx       # 사이트분석/전략임포트/주간보고서 사이드바 항목 추가
├── stores/project-store.ts                  # showAnalytics + imported strategy CRUD 추가
└── package.json                             # @google-analytics/data, recharts 추가
```

---

## Task 1: 타입 정의 및 Project 인터페이스 확장

**Files:**
- Create: `src/types/analytics.ts`
- Modify: `src/types/database.ts`

- [ ] **Step 1: analytics.ts 타입 파일 생성**

```typescript
// src/types/analytics.ts

// --- 퍼널 설정 ---
export interface FunnelConfig {
  websiteUrl: string;                    // 메인 퍼널 URL (홈페이지)
  conversionGoal: string;               // 전환 목표 (예: "카카오 상담", "회원가입")
  conversionUrl?: string;               // 전환 추적 URL (예: 카카오 채널 링크)
  funnelSteps?: FunnelStep[];           // 퍼널 단계 (선택)
}

export interface FunnelStep {
  name: string;                         // 단계명 (예: "검색/SNS", "홈페이지", "상담")
  url?: string;                         // 해당 단계 URL
  description?: string;
}

// --- GA4 설정 ---
export interface GA4Config {
  propertyId: string;                   // GA4 속성 ID (숫자)
  clientEmail: string;                  // 서비스 계정 이메일
  privateKey: string;                   // 서비스 계정 비공개 키
}

// --- GA4 응답 데이터 ---
export interface GA4OverviewData {
  period: string;                       // "7d" | "30d"
  totalSessions: number;
  totalUsers: number;
  totalPageviews: number;
  bounceRate: number;                   // 0~1
  avgSessionDuration: number;           // 초
  dailyPageviews: { date: string; views: number }[];
}

export interface GA4TrafficSource {
  channel: string;                      // "Organic Search", "Direct", "Social", etc.
  sessions: number;
  users: number;
  percentage: number;
}

export interface GA4TopPage {
  path: string;
  title: string;
  views: number;
  users: number;
}

// --- 임포트된 전략 데이터 ---
export interface ImportedStrategy {
  importedAt: string;
  sourceFileName: string;
  keywords: ImportedKeyword[];
  categories: ImportedCategory[];
}

export interface ImportedKeyword {
  keyword: string;
  totalSearch: number;
  competition: 'high' | 'medium' | 'low';
  isGolden: boolean;
  category?: string;                    // 키워드 분류 (황금키워드, 핵심, 생활습관 등)
}

export interface ImportedCategory {
  code: string;                         // "A", "B", "C", "D", "E"
  name: string;                         // "성장과학", "부모공감" 등
  description: string;
  topics: ImportedTopic[];
}

export interface ImportedTopic {
  id: string;
  title: string;
  angle?: string;                       // 콘텐츠 앵글
  keywords: string[];                   // 관련 키워드
  channels: string[];                   // 타겟 채널
  status: 'new' | 'done' | 'similar';  // 게시 상태
}

// --- 주간 보고서 ---
export interface WeeklyReportData {
  projectName: string;
  period: { start: string; end: string };
  // GA4 데이터
  analytics?: {
    sessions: number;
    sessionsDelta: number;              // 전주 대비 %
    users: number;
    usersDelta: number;
    pageviews: number;
    pageviewsDelta: number;
    bounceRate: number;
    topPages: GA4TopPage[];
    trafficSources: GA4TrafficSource[];
    dailyPageviews: { date: string; views: number }[];
  };
  // 콘텐츠 발행 현황
  content: {
    totalCreated: number;
    totalPublished: number;
    byChannel: { channel: string; count: number }[];
    recentItems: { title: string; channel: string; status: string; date: string }[];
  };
  // 키워드 현황
  keywords?: {
    tracked: number;
    goldenKeywords: string[];
  };
}
```

- [ ] **Step 2: Project 인터페이스에 필드 추가**

`src/types/database.ts`의 `Project` 인터페이스에 추가:

```typescript
  // 퍼널 & 분석 설정
  funnel_config: FunnelConfig | null;
  ga4_config: GA4Config | null;
  // 임포트된 마케팅 전략
  imported_strategy: ImportedStrategy | null;
```

`import` 문에 추가:
```typescript
import type { FunnelConfig, GA4Config, ImportedStrategy } from './analytics';
```

- [ ] **Step 3: 빌드 확인**

Run: `cd C:/projects/ContentFlow/contentflow && npx tsc --noEmit 2>&1 | head -20`
Expected: 타입 에러 없음 (새 필드는 null 허용이므로 기존 코드 호환)

- [ ] **Step 4: Commit**

```bash
git add src/types/analytics.ts src/types/database.ts
git commit -m "feat: add analytics, funnel, imported strategy types to Project"
```

---

## Task 2: 프로젝트 설정 — 퍼널·분석 탭

**Files:**
- Create: `src/components/project/funnel-analytics-section.tsx`
- Modify: `src/components/project/project-settings.tsx`

- [ ] **Step 1: funnel-analytics-section.tsx 생성**

```typescript
// src/components/project/funnel-analytics-section.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Globe, BarChart3, Plus, Trash2, Check, Eye, EyeOff } from 'lucide-react';
import type { Project } from '@/types/database';
import type { FunnelConfig, FunnelStep, GA4Config } from '@/types/analytics';

interface FunnelAnalyticsSectionProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

export function FunnelAnalyticsSection({ project, onUpdate }: FunnelAnalyticsSectionProps) {
  // --- 퍼널 설정 ---
  const funnel = (project.funnel_config as FunnelConfig | null) ?? {
    websiteUrl: '',
    conversionGoal: '',
    conversionUrl: '',
    funnelSteps: [],
  };
  const [websiteUrl, setWebsiteUrl] = useState(funnel.websiteUrl);
  const [conversionGoal, setConversionGoal] = useState(funnel.conversionGoal);
  const [conversionUrl, setConversionUrl] = useState(funnel.conversionUrl ?? '');
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>(funnel.funnelSteps ?? []);

  // --- GA4 설정 ---
  const ga4 = (project.ga4_config as GA4Config | null) ?? {
    propertyId: '',
    clientEmail: '',
    privateKey: '',
  };
  const [propertyId, setPropertyId] = useState(ga4.propertyId);
  const [clientEmail, setClientEmail] = useState(ga4.clientEmail);
  const [privateKey, setPrivateKey] = useState(ga4.privateKey);
  const [showKey, setShowKey] = useState(false);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const f = (project.funnel_config as FunnelConfig | null);
    setWebsiteUrl(f?.websiteUrl ?? '');
    setConversionGoal(f?.conversionGoal ?? '');
    setConversionUrl(f?.conversionUrl ?? '');
    setFunnelSteps(f?.funnelSteps ?? []);

    const g = (project.ga4_config as GA4Config | null);
    setPropertyId(g?.propertyId ?? '');
    setClientEmail(g?.clientEmail ?? '');
    setPrivateKey(g?.privateKey ?? '');
  }, [project.id]);

  const addFunnelStep = () => {
    setFunnelSteps([...funnelSteps, { name: '', url: '', description: '' }]);
  };

  const updateFunnelStep = (index: number, updates: Partial<FunnelStep>) => {
    setFunnelSteps(funnelSteps.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const removeFunnelStep = (index: number) => {
    setFunnelSteps(funnelSteps.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onUpdate({
      funnel_config: {
        websiteUrl: websiteUrl || '',
        conversionGoal: conversionGoal || '',
        conversionUrl: conversionUrl || undefined,
        funnelSteps: funnelSteps.filter(s => s.name.trim()),
      } as unknown as Record<string, unknown>,
      ga4_config: (propertyId ? {
        propertyId,
        clientEmail,
        privateKey,
      } : null) as unknown as Record<string, unknown>,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasGA4 = !!(propertyId && clientEmail && privateKey);

  return (
    <div className="space-y-6">
      {/* 메인 퍼널 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe size={18} /> 메인 퍼널 설정
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            모든 마케팅 채널의 최종 착지점 (홈페이지 등)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>웹사이트 URL</Label>
            <Input
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>전환 목표</Label>
              <Input
                placeholder="예: 카카오 상담, 회원가입, 구매"
                value={conversionGoal}
                onChange={(e) => setConversionGoal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>전환 URL (선택)</Label>
              <Input
                placeholder="예: https://pf.kakao.com/..."
                value={conversionUrl}
                onChange={(e) => setConversionUrl(e.target.value)}
              />
            </div>
          </div>

          {/* 퍼널 단계 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>퍼널 단계</Label>
              <Button variant="ghost" size="sm" onClick={addFunnelStep}>
                <Plus size={14} className="mr-1" /> 단계 추가
              </Button>
            </div>
            {funnelSteps.length === 0 && (
              <p className="text-xs text-muted-foreground">
                퍼널 단계를 추가하면 전환 경로를 시각화할 수 있습니다
              </p>
            )}
            {funnelSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-6">{i + 1}</span>
                <Input
                  placeholder="단계명 (예: 검색/SNS)"
                  value={step.name}
                  onChange={(e) => updateFunnelStep(i, { name: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="URL (선택)"
                  value={step.url ?? ''}
                  onChange={(e) => updateFunnelStep(i, { url: e.target.value })}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" onClick={() => removeFunnelStep(i)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* GA4 연동 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 size={18} /> Google Analytics 4 연동
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            GA4 서비스 계정을 연결하면 실시간 트래픽 현황을 확인할 수 있습니다
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>GA4 속성 ID (Property ID)</Label>
            <Input
              placeholder="123456789 (숫자만)"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value.replace(/\D/g, ''))}
            />
            <p className="text-xs text-muted-foreground">
              GA4 관리 &gt; 속성 설정에서 확인 (G-XXXXXXX가 아닌 숫자 ID)
            </p>
          </div>
          <div className="space-y-2">
            <Label>서비스 계정 이메일</Label>
            <Input
              placeholder="name@project.iam.gserviceaccount.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>비공개 키 (Private Key)</Label>
            <div className="flex gap-2">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="-----BEGIN PRIVATE KEY-----..."
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="flex-1 font-mono text-xs"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Google Cloud Console &gt; 서비스 계정 &gt; 키 관리에서 JSON 키 다운로드 후 private_key 값 붙여넣기
            </p>
          </div>
          {hasGA4 && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <Check size={14} /> GA4 연결 정보가 설정되었습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 저장 */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>
          {saved ? <><Check size={14} className="mr-1.5" /> 저장됨</> : '저장'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: project-settings.tsx에 탭 추가**

`project-settings.tsx`에서:

1. import 추가:
```typescript
import { FunnelAnalyticsSection } from './funnel-analytics-section';
import { Globe } from 'lucide-react';
```

2. TabsTrigger 추가 (기존 탭 목록에):
```typescript
<TabsTrigger value="funnel-analytics">
  <Globe size={14} className="mr-1.5" /> 퍼널·분석
</TabsTrigger>
```

3. TabsContent 추가:
```typescript
<TabsContent value="funnel-analytics">
  <FunnelAnalyticsSection project={project} onUpdate={handleUpdate} />
</TabsContent>
```

- [ ] **Step 3: 빌드 확인**

Run: `cd C:/projects/ContentFlow/contentflow && npx tsc --noEmit 2>&1 | head -20`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/project/funnel-analytics-section.tsx src/components/project/project-settings.tsx
git commit -m "feat: add funnel config and GA4 settings to project settings"
```

---

## Task 3: GA4 API Routes

**Files:**
- Create: `src/app/api/analytics/overview/route.ts`
- Create: `src/app/api/analytics/traffic/route.ts`
- Create: `src/app/api/analytics/top-pages/route.ts`

**Prerequisites:** `npm install @google-analytics/data recharts`

- [ ] **Step 1: 패키지 설치**

Run: `cd C:/projects/ContentFlow/contentflow && npm install @google-analytics/data recharts`

- [ ] **Step 2: overview API route 생성**

```typescript
// src/app/api/analytics/overview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export async function POST(request: NextRequest) {
  try {
    const { propertyId, clientEmail, privateKey, period = '7d' } = await request.json();

    if (!propertyId || !clientEmail || !privateKey) {
      return NextResponse.json({ error: 'GA4 설정이 필요합니다' }, { status: 400 });
    }

    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
    });

    const property = `properties/${propertyId}`;
    const startDate = period === '30d' ? '30daysAgo' : '7daysAgo';

    // 종합 지표
    const [summaryResponse] = await client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
    });

    // 일별 페이지뷰
    const [dailyResponse] = await client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      metrics: [{ name: 'screenPageViews' }],
      dimensions: [{ name: 'date' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    const row = summaryResponse.rows?.[0];
    const dailyPageviews = (dailyResponse.rows ?? []).map(r => ({
      date: r.dimensionValues?.[0]?.value ?? '',
      views: parseInt(r.metricValues?.[0]?.value ?? '0', 10),
    }));

    return NextResponse.json({
      period,
      totalSessions: parseInt(row?.metricValues?.[0]?.value ?? '0', 10),
      totalUsers: parseInt(row?.metricValues?.[1]?.value ?? '0', 10),
      totalPageviews: parseInt(row?.metricValues?.[2]?.value ?? '0', 10),
      bounceRate: parseFloat(row?.metricValues?.[3]?.value ?? '0'),
      avgSessionDuration: parseFloat(row?.metricValues?.[4]?.value ?? '0'),
      dailyPageviews,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GA4 API 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: traffic API route 생성**

```typescript
// src/app/api/analytics/traffic/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export async function POST(request: NextRequest) {
  try {
    const { propertyId, clientEmail, privateKey, period = '30d' } = await request.json();

    if (!propertyId || !clientEmail || !privateKey) {
      return NextResponse.json({ error: 'GA4 설정이 필요합니다' }, { status: 400 });
    }

    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
    });

    const startDate = period === '7d' ? '7daysAgo' : '30daysAgo';

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate: 'today' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
      ],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    });

    const totalSessions = (response.rows ?? []).reduce(
      (sum, r) => sum + parseInt(r.metricValues?.[0]?.value ?? '0', 10), 0
    );

    const sources = (response.rows ?? []).map(r => {
      const sessions = parseInt(r.metricValues?.[0]?.value ?? '0', 10);
      return {
        channel: r.dimensionValues?.[0]?.value ?? 'Unknown',
        sessions,
        users: parseInt(r.metricValues?.[1]?.value ?? '0', 10),
        percentage: totalSessions > 0 ? Math.round((sessions / totalSessions) * 100) : 0,
      };
    });

    return NextResponse.json({ sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GA4 API 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: top-pages API route 생성**

```typescript
// src/app/api/analytics/top-pages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export async function POST(request: NextRequest) {
  try {
    const { propertyId, clientEmail, privateKey, period = '30d' } = await request.json();

    if (!propertyId || !clientEmail || !privateKey) {
      return NextResponse.json({ error: 'GA4 설정이 필요합니다' }, { status: 400 });
    }

    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
    });

    const startDate = period === '7d' ? '7daysAgo' : '30daysAgo';

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate: 'today' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
      ],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 15,
    });

    const pages = (response.rows ?? []).map(r => ({
      path: r.dimensionValues?.[0]?.value ?? '',
      title: r.dimensionValues?.[1]?.value ?? '',
      views: parseInt(r.metricValues?.[0]?.value ?? '0', 10),
      users: parseInt(r.metricValues?.[1]?.value ?? '0', 10),
    }));

    return NextResponse.json({ pages });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GA4 API 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/app/api/analytics/
git commit -m "feat: add GA4 API routes for overview, traffic, and top pages"
```

---

## Task 4: GA4 대시보드 UI

**Files:**
- Create: `src/hooks/use-analytics.ts`
- Create: `src/components/analytics/analytics-dashboard.tsx`
- Create: `src/components/analytics/overview-cards.tsx`
- Create: `src/components/analytics/traffic-chart.tsx`
- Create: `src/components/analytics/pageviews-chart.tsx`
- Create: `src/components/analytics/top-pages-table.tsx`

- [ ] **Step 1: use-analytics.ts 훅 생성**

```typescript
// src/hooks/use-analytics.ts
'use client';

import { useState, useCallback } from 'react';
import type { GA4Config } from '@/types/analytics';
import type { GA4OverviewData, GA4TrafficSource, GA4TopPage } from '@/types/analytics';

interface AnalyticsState {
  overview: GA4OverviewData | null;
  traffic: GA4TrafficSource[];
  topPages: GA4TopPage[];
  loading: boolean;
  error: string | null;
}

export function useAnalytics(ga4Config: GA4Config | null) {
  const [state, setState] = useState<AnalyticsState>({
    overview: null,
    traffic: [],
    topPages: [],
    loading: false,
    error: null,
  });

  const fetchAll = useCallback(async (period: '7d' | '30d' = '7d') => {
    if (!ga4Config?.propertyId || !ga4Config?.clientEmail || !ga4Config?.privateKey) {
      setState(s => ({ ...s, error: 'GA4 설정이 필요합니다. 프로젝트 설정 > 퍼널·분석에서 설정하세요.' }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    const body = { ...ga4Config, period };

    try {
      const [overviewRes, trafficRes, pagesRes] = await Promise.all([
        fetch('/api/analytics/overview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        fetch('/api/analytics/traffic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        fetch('/api/analytics/top-pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      ]);

      const [overview, traffic, pages] = await Promise.all([
        overviewRes.json(),
        trafficRes.json(),
        pagesRes.json(),
      ]);

      if (overview.error) throw new Error(overview.error);

      setState({
        overview,
        traffic: traffic.sources ?? [],
        topPages: pages.pages ?? [],
        loading: false,
        error: null,
      });
    } catch (err) {
      setState(s => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'GA4 데이터 로드 실패',
      }));
    }
  }, [ga4Config]);

  return { ...state, fetchAll };
}
```

- [ ] **Step 2: overview-cards.tsx 생성**

```typescript
// src/components/analytics/overview-cards.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Users, Eye, MousePointerClick, Timer } from 'lucide-react';
import type { GA4OverviewData } from '@/types/analytics';

interface OverviewCardsProps {
  data: GA4OverviewData;
}

export function OverviewCards({ data }: OverviewCardsProps) {
  const cards = [
    { label: '세션', value: data.totalSessions.toLocaleString(), icon: MousePointerClick, color: 'text-blue-600' },
    { label: '사용자', value: data.totalUsers.toLocaleString(), icon: Users, color: 'text-emerald-600' },
    { label: '페이지뷰', value: data.totalPageviews.toLocaleString(), icon: Eye, color: 'text-purple-600' },
    { label: '이탈률', value: `${(data.bounceRate * 100).toFixed(1)}%`, icon: Timer, color: 'text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <c.icon size={14} className={c.color} /> {c.label}
            </div>
            <div className="text-2xl font-black tracking-tight">{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: pageviews-chart.tsx, traffic-chart.tsx, top-pages-table.tsx 생성**

```typescript
// src/components/analytics/pageviews-chart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface PageviewsChartProps {
  data: { date: string; views: number }[];
}

export function PageviewsChart({ data }: PageviewsChartProps) {
  const formatted = data.map(d => ({
    ...d,
    label: `${d.date.slice(4, 6)}/${d.date.slice(6, 8)}`,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold">일별 페이지뷰</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatted}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#0F6E56" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

```typescript
// src/components/analytics/traffic-chart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import type { GA4TrafficSource } from '@/types/analytics';

interface TrafficChartProps {
  data: GA4TrafficSource[];
}

export function TrafficChart({ data }: TrafficChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold">트래픽 소스</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="channel" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="sessions" fill="#0F6E56" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

```typescript
// src/components/analytics/top-pages-table.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GA4TopPage } from '@/types/analytics';

interface TopPagesTableProps {
  data: GA4TopPage[];
  websiteUrl?: string;
}

export function TopPagesTable({ data, websiteUrl }: TopPagesTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold">인기 페이지 TOP 10</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2 font-semibold">페이지</th>
                <th className="text-right py-2 font-semibold">뷰</th>
                <th className="text-right py-2 font-semibold">사용자</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 10).map((page, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2">
                    <div className="font-medium text-xs truncate max-w-[300px]">
                      {page.title || page.path}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                      {websiteUrl ? `${websiteUrl}${page.path}` : page.path}
                    </div>
                  </td>
                  <td className="text-right font-bold tabular-nums">{page.views.toLocaleString()}</td>
                  <td className="text-right tabular-nums text-muted-foreground">{page.users.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: analytics-dashboard.tsx 메인 대시보드 생성**

```typescript
// src/components/analytics/analytics-dashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings } from 'lucide-react';
import { useProjectStore } from '@/stores/project-store';
import { useAnalytics } from '@/hooks/use-analytics';
import { OverviewCards } from './overview-cards';
import { PageviewsChart } from './pageviews-chart';
import { TrafficChart } from './traffic-chart';
import { TopPagesTable } from './top-pages-table';
import type { GA4Config, FunnelConfig } from '@/types/analytics';

export function AnalyticsDashboard() {
  const project = useProjectStore((s) => {
    const id = s.selectedProjectId;
    return id ? s.projects.find(p => p.id === id) : undefined;
  });

  const ga4Config = project?.ga4_config as GA4Config | null;
  const funnelConfig = project?.funnel_config as FunnelConfig | null;
  const { overview, traffic, topPages, loading, error, fetchAll } = useAnalytics(ga4Config);
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');

  useEffect(() => {
    if (ga4Config?.propertyId) {
      fetchAll(period);
    }
  }, [ga4Config?.propertyId, period]);

  // GA4 미설정
  if (!ga4Config?.propertyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center">
        <Settings size={48} className="text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-bold mb-2">GA4 연동이 필요합니다</h3>
        <p className="text-sm text-muted-foreground mb-4">
          프로젝트 설정 &gt; 퍼널·분석에서 Google Analytics 4를 연결하세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight">사이트 분석</h2>
          {funnelConfig?.websiteUrl && (
            <p className="text-xs text-muted-foreground">{funnelConfig.websiteUrl}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              className={`px-3 py-1.5 text-xs font-semibold ${period === '7d' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setPeriod('7d')}
            >
              7일
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-semibold ${period === '30d' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setPeriod('30d')}
            >
              30일
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchAll(period)} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {overview && (
        <>
          <OverviewCards data={overview} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PageviewsChart data={overview.dailyPageviews} />
            <TrafficChart data={traffic} />
          </div>
          <TopPagesTable data={topPages} websiteUrl={funnelConfig?.websiteUrl} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Store에 showAnalytics 상태 추가**

`src/stores/project-store.ts` 수정:

1. `ProjectState` 인터페이스에 추가 (기존 `showStrategy` 근처):
```typescript
  showAnalytics: boolean;
```

2. 초기값 추가 (기존 `showStrategy: false` 근처):
```typescript
  showAnalytics: false,
```

3. `selectProject` 액션에서 `showAnalytics: false` 추가 (기존 `showStrategy: false` 옆에):
```typescript
set({ selectedProjectId: projectId, selectedContentId: null, showProjectSettings: false, showStrategy: false, showAnalytics: false }),
```

4. `selectContent` 액션에서도 동일하게 `showAnalytics: false` 추가.

5. UI state 영역에 액션 추가 (기존 `openStrategy`/`setShowStrategy` 아래):
```typescript
  openAnalytics: (projectId) => {
    set({ selectedProjectId: projectId, selectedContentId: null, showProjectSettings: false, showStrategy: false, showAnalytics: true });
  },
  setShowAnalytics: (show) => set({ showAnalytics: show, showProjectSettings: false, showStrategy: false }),
```

6. 기존 `openProjectSettings`, `setShowProjectSettings`, `openStrategy`, `setShowStrategy`에도 `showAnalytics: false` 추가하여 상호 배타적으로 만들기:
```typescript
  openProjectSettings: (projectId) => {
    set({ selectedProjectId: projectId, selectedContentId: null, showProjectSettings: true, showStrategy: false, showAnalytics: false });
  },
  setShowProjectSettings: (show) => set({ showProjectSettings: show, showStrategy: false, showAnalytics: false }),
  openStrategy: (projectId) => {
    set({ selectedProjectId: projectId, selectedContentId: null, showProjectSettings: false, showStrategy: true, showAnalytics: false });
  },
  setShowStrategy: (show) => set({ showStrategy: show, showProjectSettings: false, showAnalytics: false }),
```

7. `ProjectState` 인터페이스에 액션 시그니처 추가:
```typescript
  openAnalytics: (projectId: string) => void;
  setShowAnalytics: (show: boolean) => void;
```

- [ ] **Step 6: 사이드바에 사이트 분석 항목 추가**

`src/components/sidebar/project-tree.tsx` 수정:

1. import에 추가:
```typescript
import { BarChart3 } from 'lucide-react';
```

2. `ProjectItem` 컴포넌트에서 store 액션 추가:
```typescript
const { selectProject, updateProject, deleteProject, duplicateProject, openProjectSettings, openStrategy, openAnalytics, showStrategy, showAnalytics } = useProjectStore();
```

3. 기존 "마케팅 전략" 버튼 아래에 "사이트 분석" 버튼 추가:
```typescript
          {/* 사이트 분석 고정 항목 */}
          <button
            onClick={() => openAnalytics(project.id)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
              'hover:bg-accent',
              isSelected && showAnalytics && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            )}
          >
            <BarChart3 size={14} className="shrink-0 text-blue-600" />
            <span className="flex-1 text-left truncate font-medium">사이트 분석</span>
          </button>
```

- [ ] **Step 7: dashboard/page.tsx에 분석 라우팅 추가**

`src/app/dashboard/page.tsx` 수정:

1. import 추가:
```typescript
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
```

2. `showAnalytics` 상태 구독 추가:
```typescript
const showAnalytics = useProjectStore((s) => s.showAnalytics);
```

3. 기존 `if (showStrategy)` 블록 바로 아래에 추가:
```typescript
  // Show analytics dashboard
  if (showAnalytics) {
    return <AnalyticsDashboard />;
  }
```

- [ ] **Step 8: 빌드 확인 및 Commit**

Run: `cd C:/projects/ContentFlow/contentflow && npx tsc --noEmit 2>&1 | head -20`

```bash
git add src/hooks/use-analytics.ts src/components/analytics/ src/stores/project-store.ts src/components/sidebar/project-tree.tsx src/app/dashboard/page.tsx
git commit -m "feat: add GA4 analytics dashboard with sidebar integration and routing"
```

---

## Task 5: 전략 HTML 임포트 — 파서 + API

**Files:**
- Create: `src/lib/strategy-html-parser.ts`
- Create: `src/app/api/strategy/import-html/route.ts`

- [ ] **Step 1: strategy-html-parser.ts 생성**

이 파서는 마케팅 전략 HTML (cheerio로 파싱)에서 키워드 DB, 카테고리, 주제 목록을 추출합니다.

```typescript
// src/lib/strategy-html-parser.ts
import * as cheerio from 'cheerio';
import type { ImportedKeyword, ImportedCategory, ImportedTopic } from '@/types/analytics';
import { generateId } from './utils';

interface ParseResult {
  keywords: ImportedKeyword[];
  categories: ImportedCategory[];
}

export function parseStrategyHtml(html: string): ParseResult {
  const $ = cheerio.load(html);

  // 지원하는 HTML 형식인지 검증
  if ($('table.kw-table').length === 0 && $('table.topic-table').length === 0 && $('.cycle-item').length === 0) {
    throw new Error('지원하지 않는 HTML 형식입니다. 마케팅 전략 HTML 파일(키워드 테이블 또는 주제 테이블 포함)이 필요합니다.');
  }

  const keywords: ImportedKeyword[] = [];
  const categories: ImportedCategory[] = [];

  // --- 키워드 테이블 파싱 ---
  // 키워드 DB 섹션의 <table class="kw-table"> 에서 추출
  $('table.kw-table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 4) return;

    const keyword = $(cells[0]).text().trim();
    if (!keyword) return;

    // 검색량 파싱 (콤마 제거)
    const searchText = $(cells[1]).text().replace(/,/g, '').trim();
    const totalSearch = parseInt(searchText, 10) || 0;

    // 경쟁도 파싱
    const compEl = $(cells[3]).find('.comp-badge');
    let competition: 'high' | 'medium' | 'low' = 'medium';
    if (compEl.hasClass('comp-high')) competition = 'high';
    else if (compEl.hasClass('comp-low')) competition = 'low';

    // 황금키워드 여부
    const isGolden = $(row).find('.s-gold').length > 0 ||
      $(row).attr('data-cat') === 'gold';

    // 카테고리 배지
    const categoryBadge = $(row).find('.sbadge').first().text().trim();

    keywords.push({
      keyword,
      totalSearch,
      competition,
      isGolden,
      category: categoryBadge || undefined,
    });
  });

  // --- 주제 테이블 파싱 ---
  // 콘텐츠 주제 섹션의 <table class="topic-table"> 에서 추출
  const topicsByCategory: Record<string, ImportedTopic[]> = {};

  $('table.topic-table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const catPill = $(cells[1]).find('.cat-pill').first();
    const catCode = catPill.text().trim().charAt(0); // "A", "B", etc.
    const title = $(cells[2]).text().trim();
    if (!title) return;

    // 키워드 태그
    const kwTags: string[] = [];
    $(cells[3]).find('.kw-tag').each((_, el) => {
      kwTags.push($(el).text().trim());
    });

    // 채널 태그
    const channels: string[] = [];
    if (cells.length > 4) {
      $(cells[4]).find('span, .sch-cell').each((_, el) => {
        channels.push($(el).text().trim());
      });
    }

    // 상태
    let status: 'new' | 'done' | 'similar' = 'new';
    if ($(row).find('.s-done').length > 0) status = 'done';
    else if ($(row).find('.s-similar').length > 0) status = 'similar';

    if (!topicsByCategory[catCode]) {
      topicsByCategory[catCode] = [];
    }

    topicsByCategory[catCode].push({
      id: generateId('topic'),
      title,
      keywords: kwTags,
      channels,
      status,
    });
  });

  // --- 카테고리 순환 파싱 ---
  // .cycle-row > .cycle-item 에서 카테고리 코드/이름/설명 추출
  $('.cycle-item').each((_, el) => {
    const code = $(el).find('.cycle-letter').text().trim();
    const name = $(el).find('.cycle-name').text().trim();
    const description = $(el).find('.cycle-desc').text().trim();
    if (!code || !name) return;

    categories.push({
      code,
      name,
      description,
      topics: topicsByCategory[code] ?? [],
    });
  });

  // 카테고리 없이 주제만 있는 경우 fallback
  if (categories.length === 0 && Object.keys(topicsByCategory).length > 0) {
    for (const [code, topics] of Object.entries(topicsByCategory)) {
      categories.push({
        code,
        name: code,
        description: '',
        topics,
      });
    }
  }

  return { keywords, categories };
}
```

- [ ] **Step 2: import-html API route 생성**

```typescript
// src/app/api/strategy/import-html/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseStrategyHtml } from '@/lib/strategy-html-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'HTML 파일이 필요합니다' }, { status: 400 });
    }

    const html = await file.text();
    const result = parseStrategyHtml(html);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      keywordCount: result.keywords.length,
      categoryCount: result.categories.length,
      topicCount: result.categories.reduce((sum, c) => sum + c.topics.length, 0),
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '파싱 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/strategy-html-parser.ts src/app/api/strategy/import-html/
git commit -m "feat: add strategy HTML parser and import API route"
```

---

## Task 6: 전략 임포트 UI + Store 연동

**Files:**
- Create: `src/components/strategy/strategy-import-dialog.tsx`
- Modify: `src/stores/project-store.ts`
- Modify: `src/components/sidebar/project-tree.tsx`

- [ ] **Step 1: Store에 imported_strategy CRUD 추가**

`src/stores/project-store.ts`의 `ProjectState` 인터페이스에 추가:

```typescript
  // Imported Strategy
  importStrategy: (projectId: string, data: ImportedStrategy) => void;
  clearImportedStrategy: (projectId: string) => void;
  getImportedStrategy: (projectId: string) => ImportedStrategy | null;
```

구현부 추가:

```typescript
  importStrategy: (projectId, data) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, imported_strategy: data as unknown as Record<string, unknown>, updated_at: new Date().toISOString() } : p
      ),
    }));
  },

  clearImportedStrategy: (projectId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, imported_strategy: null, updated_at: new Date().toISOString() } : p
      ),
    }));
  },

  getImportedStrategy: (projectId) => {
    const project = get().projects.find(p => p.id === projectId);
    return (project?.imported_strategy as unknown as ImportedStrategy) ?? null;
  },
```

import 추가:
```typescript
import type { ImportedStrategy } from '@/types/analytics';
```

- [ ] **Step 2: strategy-import-dialog.tsx 생성**

```typescript
// src/components/strategy/strategy-import-dialog.tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Check, X, Tag, FolderOpen } from 'lucide-react';
import { useProjectStore } from '@/stores/project-store';
import type { ImportedStrategy, ImportedKeyword, ImportedCategory } from '@/types/analytics';

interface StrategyImportDialogProps {
  projectId: string;
  onClose: () => void;
}

export function StrategyImportDialog({ projectId, onClose }: StrategyImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    keywords: ImportedKeyword[];
    categories: ImportedCategory[];
    keywordCount: number;
    categoryCount: number;
    topicCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importStrategy = useProjectStore(s => s.importStrategy);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.name.endsWith('.html')) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/strategy/import-html', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '파싱 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!result || !file) return;

    const imported: ImportedStrategy = {
      importedAt: new Date().toISOString(),
      sourceFileName: file.name,
      keywords: result.keywords,
      categories: result.categories,
    };

    importStrategy(projectId, imported);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl border shadow-xl w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold">마케팅 전략 HTML 임포트</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X size={16} /></Button>
        </div>

        <div className="p-4 space-y-4">
          {/* 파일 선택 */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".html" onChange={handleFileSelect} className="hidden" />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText size={20} className="text-primary" />
                <span className="font-semibold">{file.name}</span>
                <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">마케팅 전략 HTML 파일을 선택하세요</p>
              </>
            )}
          </div>

          {file && !result && (
            <Button onClick={handleParse} disabled={loading} className="w-full">
              {loading ? '분석 중...' : '파일 분석'}
            </Button>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* 파싱 결과 미리보기 */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-emerald-700">{result.keywordCount}</div>
                  <div className="text-xs text-emerald-600">키워드</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-purple-700">{result.categoryCount}</div>
                  <div className="text-xs text-purple-600">카테고리</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-amber-700">{result.topicCount}</div>
                  <div className="text-xs text-amber-600">주제</div>
                </div>
              </div>

              {/* 황금키워드 미리보기 */}
              {result.keywords.filter(k => k.isGolden).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1">
                    <Tag size={12} /> 황금 키워드
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {result.keywords.filter(k => k.isGolden).map(k => (
                      <span key={k.keyword} className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-semibold">
                        {k.keyword} ({k.totalSearch.toLocaleString()})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 카테고리 미리보기 */}
              {result.categories.map(cat => (
                <div key={cat.code} className="border rounded-lg p-3">
                  <div className="text-xs font-bold mb-1 flex items-center gap-1">
                    <FolderOpen size={12} />
                    <span className="text-primary">{cat.code}</span> {cat.name}
                    <span className="text-muted-foreground ml-1">({cat.topics.length}개 주제)</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{cat.description}</div>
                </div>
              ))}

              <Button onClick={handleImport} className="w-full">
                <Check size={14} className="mr-1.5" /> 프로젝트에 적용
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 사이드바 마케팅 전략 항목에 임포트 버튼 추가**

`src/components/sidebar/project-tree.tsx` 수정:

1. import 추가:
```typescript
import { Upload } from 'lucide-react';
import { StrategyImportDialog } from '@/components/strategy/strategy-import-dialog';
```

2. `ProjectItem` 컴포넌트 내부에 state 추가:
```typescript
const [showImportDialog, setShowImportDialog] = useState(false);
```

3. 기존 "마케팅 전략" 버튼 옆에 임포트 아이콘 버튼 추가 (한 줄로):
```typescript
          {/* 마케팅 전략 + 임포트 */}
          <div className="flex items-center">
            <button
              onClick={() => openStrategy(project.id)}
              className={cn(
                'flex-1 flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
                'hover:bg-accent',
                isSelected && showStrategy && 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              )}
            >
              <Target size={14} className="shrink-0 text-emerald-600" />
              <span className="flex-1 text-left truncate font-medium">마케팅 전략</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowImportDialog(true); }}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
              title="전략 HTML 임포트"
            >
              <Upload size={12} />
            </button>
          </div>
```

4. 컴포넌트 return 맨 아래에 다이얼로그 렌더링:
```typescript
      {showImportDialog && (
        <StrategyImportDialog
          projectId={project.id}
          onClose={() => setShowImportDialog(false)}
        />
      )}
```

- [ ] **Step 4: 빌드 확인 및 Commit**

```bash
git add src/components/strategy/strategy-import-dialog.tsx src/stores/project-store.ts src/components/sidebar/project-tree.tsx
git commit -m "feat: add strategy HTML import dialog with keyword/category/topic extraction"
```

---

## Task 7: 콘텐츠 생성 시 카테고리/주제/키워드 자동 연동

**Files:**
- Modify: `src/components/project/create-content-dialog.tsx`
- Modify: `src/components/content/blog-panel.tsx`

- [ ] **Step 1: create-content-dialog.tsx에 카테고리/주제 드롭다운 추가**

기존 category 텍스트 입력을 → 임포트된 카테고리가 있으면 드롭다운 선택으로 변경.
카테고리 선택 시 → 해당 카테고리의 주제 목록을 드롭다운으로 표시.
주제 선택 시 → `title`에 주제명 자동 입력, `tags`에 관련 키워드 자동 입력.

핵심 로직:

```typescript
const importedStrategy = useProjectStore((s) => {
  const projectId = s.selectedProjectId;
  if (!projectId) return null;
  const project = s.projects.find(p => p.id === projectId);
  return project?.imported_strategy as ImportedStrategy | null;
});

const categories = importedStrategy?.categories ?? [];
const [selectedCategory, setSelectedCategory] = useState('');
const [selectedTopicId, setSelectedTopicId] = useState('');

const currentTopics = categories.find(c => c.code === selectedCategory)?.topics ?? [];

// 주제 선택 시
const handleTopicSelect = (topicId: string) => {
  const topic = currentTopics.find(t => t.id === topicId);
  if (topic) {
    setSelectedTopicId(topicId);
    setTitle(topic.title);
    setTags(topic.keywords.join(', '));
    setCategory(selectedCategory);
  }
};
```

UI 변경: 임포트된 전략이 있으면 기존 텍스트 입력 위에 카테고리 Select + 주제 Select 표시.
없으면 기존과 동일하게 텍스트 입력만.

- [ ] **Step 2: blog-panel.tsx 키워드 추천 배너 확장**

기존 마케팅 전략의 goldenKeywords 배너를 확장하여, 임포트된 전략의 키워드도 표시:

```typescript
const importedStrategy = useProjectStore((s) => {
  const projectId = s.selectedProjectId;
  if (!projectId) return null;
  const project = s.projects.find(p => p.id === projectId);
  return project?.imported_strategy as ImportedStrategy | null;
});

// 임포트된 황금 키워드
const importedGolden = importedStrategy?.keywords.filter(k => k.isGolden) ?? [];

// 기존 strategy 황금키워드와 병합 (중복 제거)
const allGoldenKeywords = [
  ...(strategy?.keywords?.goldenKeywords ?? []),
  ...importedGolden.map(k => ({
    keyword: k.keyword,
    totalSearch: k.totalSearch,
    competition: k.competition,
    strategy: '',
    priority: 0,
  })),
].filter((k, i, arr) => arr.findIndex(x => x.keyword === k.keyword) === i);
```

배너에서 `allGoldenKeywords` 사용.

- [ ] **Step 3: 빌드 확인 및 Commit**

```bash
git add src/components/project/create-content-dialog.tsx src/components/content/blog-panel.tsx
git commit -m "feat: auto-populate category/topic/keywords from imported strategy on content creation"
```

---

## Task 8: 주간 보고서 생성

**Files:**
- Create: `src/lib/weekly-report-builder.ts`
- Create: `src/components/report/weekly-report-dialog.tsx`

- [ ] **Step 1: weekly-report-builder.ts 생성**

```typescript
// src/lib/weekly-report-builder.ts
import type { WeeklyReportData } from '@/types/analytics';

export function buildWeeklyReportHtml(data: WeeklyReportData): string {
  const { projectName, period, analytics, content, keywords } = data;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${projectName} 주간 보고서 (${period.start} ~ ${period.end})</title>
<style>
  body { font-family: 'Noto Sans KR', sans-serif; max-width: 800px; margin: 0 auto; padding: 32px; color: #1a1a18; font-size: 14px; line-height: 1.6; }
  h1 { font-size: 24px; font-weight: 900; margin-bottom: 4px; }
  .period { color: #6b6960; font-size: 13px; margin-bottom: 24px; }
  .section { margin-bottom: 32px; }
  .section-title { font-size: 16px; font-weight: 900; border-bottom: 2px solid #0F6E56; padding-bottom: 4px; margin-bottom: 12px; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  .stat-card { background: #f5f5f3; border-radius: 10px; padding: 14px; text-align: center; }
  .stat-num { font-size: 24px; font-weight: 900; }
  .stat-lbl { font-size: 11px; color: #6b6960; }
  .delta-up { color: #0F6E56; } .delta-down { color: #993C1D; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #0F6E56; color: white; padding: 8px; text-align: left; font-size: 11px; }
  td { padding: 8px; border-bottom: 1px solid #e8e6e0; }
  tr:hover td { background: #f9f9f7; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; }
  .badge-published { background: #E8F5F0; color: #0F6E56; }
  .badge-draft { background: #F5F5F3; color: #6b6960; }
  footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9b9890; border-top: 1px solid #e8e6e0; padding-top: 16px; }
</style>
</head>
<body>
<h1>${projectName} 주간 보고서</h1>
<div class="period">${period.start} ~ ${period.end}</div>

${analytics ? `
<div class="section">
  <div class="section-title">📊 사이트 트래픽</div>
  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-num">${analytics.sessions.toLocaleString()}</div>
      <div class="stat-lbl">세션</div>
      ${analytics.sessionsDelta !== 0 ? `<div class="${analytics.sessionsDelta > 0 ? 'delta-up' : 'delta-down'}">${analytics.sessionsDelta > 0 ? '+' : ''}${analytics.sessionsDelta.toFixed(1)}%</div>` : ''}
    </div>
    <div class="stat-card">
      <div class="stat-num">${analytics.users.toLocaleString()}</div>
      <div class="stat-lbl">사용자</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${analytics.pageviews.toLocaleString()}</div>
      <div class="stat-lbl">페이지뷰</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${(analytics.bounceRate * 100).toFixed(1)}%</div>
      <div class="stat-lbl">이탈률</div>
    </div>
  </div>
  ${analytics.trafficSources.length > 0 ? `
  <table>
    <thead><tr><th>트래픽 소스</th><th>세션</th><th>비중</th></tr></thead>
    <tbody>${analytics.trafficSources.map(s =>
      `<tr><td>${s.channel}</td><td>${s.sessions.toLocaleString()}</td><td>${s.percentage}%</td></tr>`
    ).join('')}</tbody>
  </table>` : ''}
</div>` : '<div class="section"><p style="color:#6b6960">GA4 미연동 — 프로젝트 설정에서 연결하세요</p></div>'}

<div class="section">
  <div class="section-title">📝 콘텐츠 현황</div>
  <div class="stat-grid" style="grid-template-columns: repeat(3, 1fr);">
    <div class="stat-card">
      <div class="stat-num">${content.totalCreated}</div>
      <div class="stat-lbl">이번 주 작성</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${content.totalPublished}</div>
      <div class="stat-lbl">발행 완료</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${content.byChannel.map(c => c.count).reduce((a, b) => a + b, 0)}</div>
      <div class="stat-lbl">채널 콘텐츠</div>
    </div>
  </div>
  ${content.byChannel.length > 0 ? `
  <table>
    <thead><tr><th>채널</th><th>콘텐츠 수</th></tr></thead>
    <tbody>${content.byChannel.map(c =>
      `<tr><td>${c.channel}</td><td>${c.count}</td></tr>`
    ).join('')}</tbody>
  </table>` : ''}
  ${content.recentItems.length > 0 ? `
  <div style="margin-top:12px;">
    <table>
      <thead><tr><th>제목</th><th>채널</th><th>상태</th></tr></thead>
      <tbody>${content.recentItems.map(item =>
        `<tr><td>${item.title}</td><td>${item.channel}</td><td><span class="badge ${item.status === 'published' ? 'badge-published' : 'badge-draft'}">${item.status}</span></td></tr>`
      ).join('')}</tbody>
    </table>
  </div>` : ''}
</div>

${keywords ? `
<div class="section">
  <div class="section-title">🔑 키워드 현황</div>
  <p>추적 키워드: <strong>${keywords.tracked}개</strong></p>
  ${keywords.goldenKeywords.length > 0 ? `<p>황금 키워드: ${keywords.goldenKeywords.map(k => `<span style="background:#FFF8E8;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:700;color:#BA7517;margin-right:4px;">${k}</span>`).join('')}</p>` : ''}
</div>` : ''}

<footer>
  Generated by <strong>ContentFlow</strong> · ${new Date().toISOString().slice(0, 10)}
</footer>
</body>
</html>`;
}
```

- [ ] **Step 2: weekly-report-dialog.tsx 생성**

주간 보고서 다이얼로그:
- 프로젝트의 GA4 데이터(지난 7일) 조회
- 프로젝트의 콘텐츠 발행 현황 집계 (store에서)
- 임포트된 키워드 현황
- HTML 생성 후 미리보기 + 다운로드

```typescript
// src/components/report/weekly-report-dialog.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import { useProjectStore } from '@/stores/project-store';
import { buildWeeklyReportHtml } from '@/lib/weekly-report-builder';
import type { WeeklyReportData, GA4Config, FunnelConfig, ImportedStrategy } from '@/types/analytics';

interface WeeklyReportDialogProps {
  projectId: string;
  onClose: () => void;
}

export function WeeklyReportDialog({ projectId, onClose }: WeeklyReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);

  const project = useProjectStore(s => s.projects.find(p => p.id === projectId));
  const contents = useProjectStore(s => s.contents.filter(c => c.project_id === projectId));
  const blogContents = useProjectStore(s => s.blogContents);
  const instagramContents = useProjectStore(s => s.instagramContents);
  const threadsContents = useProjectStore(s => s.threadsContents);
  const youtubeContents = useProjectStore(s => s.youtubeContents);

  if (!project) return null;

  const ga4Config = project.ga4_config as GA4Config | null;
  const importedStrategy = project.imported_strategy as unknown as ImportedStrategy | null;

  const generateReport = async () => {
    setLoading(true);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const periodStart = weekAgo.toISOString().slice(0, 10);
    const periodEnd = now.toISOString().slice(0, 10);

    // GA4 데이터 가져오기
    let analyticsData: WeeklyReportData['analytics'] = undefined;
    if (ga4Config?.propertyId) {
      try {
        const body = { ...ga4Config, period: '7d' };
        const [overviewRes, trafficRes] = await Promise.all([
          fetch('/api/analytics/overview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
          fetch('/api/analytics/traffic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        ]);
        const [overview, traffic] = await Promise.all([overviewRes.json(), trafficRes.json()]);

        if (!overview.error) {
          analyticsData = {
            sessions: overview.totalSessions,
            sessionsDelta: 0, // 전주 비교는 추후 구현
            users: overview.totalUsers,
            usersDelta: 0,
            pageviews: overview.totalPageviews,
            pageviewsDelta: 0,
            bounceRate: overview.bounceRate,
            topPages: [],
            trafficSources: traffic.sources ?? [],
            dailyPageviews: overview.dailyPageviews ?? [],
          };
        }
      } catch {
        // GA4 실패 시 무시
      }
    }

    // 콘텐츠 현황
    const projectContents = contents;
    const recentWeek = projectContents.filter(c => {
      const created = new Date(c.created_at);
      return created >= weekAgo;
    });

    const channelCounts: Record<string, number> = {};
    const contentIds = projectContents.map(c => c.id);

    const blogCount = blogContents.filter(b => contentIds.includes(b.content_id)).length;
    const instaCount = instagramContents.filter(b => contentIds.includes(b.content_id)).length;
    const threadsCount = threadsContents.filter(b => contentIds.includes(b.content_id)).length;
    const ytCount = youtubeContents.filter(b => contentIds.includes(b.content_id)).length;

    if (blogCount > 0) channelCounts['블로그'] = blogCount;
    if (instaCount > 0) channelCounts['카드뉴스'] = instaCount;
    if (threadsCount > 0) channelCounts['스레드'] = threadsCount;
    if (ytCount > 0) channelCounts['유튜브'] = ytCount;

    const reportData: WeeklyReportData = {
      projectName: project.name,
      period: { start: periodStart, end: periodEnd },
      analytics: analyticsData,
      content: {
        totalCreated: recentWeek.length,
        totalPublished: recentWeek.filter(c => c.status === 'published').length,
        byChannel: Object.entries(channelCounts).map(([channel, count]) => ({ channel, count })),
        recentItems: recentWeek.slice(0, 10).map(c => ({
          title: c.title,
          channel: c.category ?? '-',
          status: c.status,
          date: c.created_at.slice(0, 10),
        })),
      },
      keywords: importedStrategy ? {
        tracked: importedStrategy.keywords.length,
        goldenKeywords: importedStrategy.keywords.filter(k => k.isGolden).map(k => k.keyword),
      } : undefined,
    };

    const html = buildWeeklyReportHtml(reportData);
    setReportHtml(html);
    setLoading(false);
  };

  const handleDownload = () => {
    if (!reportHtml) return;
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_주간보고서_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl border shadow-xl w-[700px] max-h-[85vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <FileText size={16} /> 주간 보고서
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X size={16} /></Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!reportHtml ? (
            <div className="flex flex-col items-center justify-center h-[300px]">
              <p className="text-sm text-muted-foreground mb-4">
                GA4 트래픽 + 콘텐츠 현황을 분석하여 주간 보고서를 생성합니다
              </p>
              <Button onClick={generateReport} disabled={loading}>
                {loading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <FileText size={14} className="mr-1.5" />}
                {loading ? '생성 중...' : '보고서 생성'}
              </Button>
            </div>
          ) : (
            <iframe
              srcDoc={reportHtml}
              className="w-full h-[500px] border rounded-lg"
              title="주간 보고서 미리보기"
            />
          )}
        </div>

        {reportHtml && (
          <div className="p-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReportHtml(null)}>다시 생성</Button>
            <Button onClick={handleDownload}>
              <Download size={14} className="mr-1.5" /> HTML 다운로드
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 사이드바에 주간 보고서 버튼 추가**

`src/components/sidebar/project-tree.tsx` 수정:

1. import 추가:
```typescript
import { FileBarChart } from 'lucide-react';
import { WeeklyReportDialog } from '@/components/report/weekly-report-dialog';
```

2. `ProjectItem` 컴포넌트 내부에 state 추가:
```typescript
const [showReportDialog, setShowReportDialog] = useState(false);
```

3. "사이트 분석" 버튼 아래에 "주간 보고서" 버튼 추가:
```typescript
          {/* 주간 보고서 */}
          <button
            onClick={() => setShowReportDialog(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-accent"
          >
            <FileBarChart size={14} className="shrink-0 text-amber-600" />
            <span className="flex-1 text-left truncate font-medium">주간 보고서</span>
          </button>
```

4. 컴포넌트 return 맨 아래에 다이얼로그 렌더링 (import dialog 옆):
```typescript
      {showReportDialog && (
        <WeeklyReportDialog
          projectId={project.id}
          onClose={() => setShowReportDialog(false)}
        />
      )}
```

- [ ] **Step 4: 빌드 확인 및 Commit**

```bash
git add src/lib/weekly-report-builder.ts src/components/report/ src/components/sidebar/project-tree.tsx
git commit -m "feat: add weekly report generation with GA4 analytics and content summary"
```

---

## Task 9: 통합 테스트 및 최종 정리

**Files:**
- Modify: `src/components/sidebar/project-tree.tsx` (최종 확인)
- 빌드 전체 확인

- [ ] **Step 1: 전체 빌드 확인**

Run: `cd C:/projects/ContentFlow/contentflow && npm run build 2>&1 | tail -20`
Expected: Build 성공

- [ ] **Step 2: 기능 동선 점검**

수동 테스트 체크리스트:
1. 프로젝트 설정 > 퍼널·분석 탭 → 웹사이트 URL + GA4 설정 저장
2. 사이드바 > 사이트 분석 → GA4 대시보드 표시 (설정 없으면 안내 메시지)
3. 사이드바 > 전략 임포트 → HTML 파일 업로드 → 키워드/카테고리/주제 추출 확인
4. 새 콘텐츠 생성 → 임포트된 카테고리/주제 드롭다운 표시
5. 주제 선택 → 제목/태그 자동 입력 확인
6. 블로그 패널 → 황금키워드 배너에 임포트된 키워드 표시
7. 주간 보고서 생성 → HTML 미리보기 + 다운로드

- [ ] **Step 3: CLAUDE.md 업데이트**

새 기능들을 CLAUDE.md에 반영:
- 퍼널·분석 설정 탭
- GA4 연동 API routes
- 전략 HTML 임포트
- 주간 보고서

- [ ] **Step 4: Final Commit**

```bash
git add -A
git commit -m "feat: complete funnel config, GA4 analytics, strategy import, weekly report"
```

---

## 구현 요약

| Task | 설명 | 예상 시간 |
|------|------|-----------|
| 1 | 타입 정의 + Project 확장 | 5분 |
| 2 | 퍼널·분석 설정 탭 UI | 15분 |
| 3 | GA4 API Routes (3개) | 15분 |
| 4 | GA4 대시보드 UI (5개 컴포넌트) | 20분 |
| 5 | 전략 HTML 파서 + API | 15분 |
| 6 | 전략 임포트 UI + Store | 15분 |
| 7 | 콘텐츠 카테고리/주제 자동 연동 | 10분 |
| 8 | 주간 보고서 생성 | 15분 |
| 9 | 통합 테스트 + 정리 | 10분 |
