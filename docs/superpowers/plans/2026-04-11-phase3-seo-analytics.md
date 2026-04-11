# Phase 3: SEO 분석 + 애널리틱스 확장 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google/Naver/GEO 3종 SEO 분석 모듈을 구축하고, 기존 GA4 대시보드를 콘텐츠 성과/국가별 트래픽/전환 추적으로 확장하며, seomachine FastAPI에 분석 엔진을 연동한다.

**Architecture:** SEO 분석은 클라이언트에서 URL 입력 → Next.js API Route에서 크롤링 + 분석 → 결과 표시. 기존 seo-scorer.ts(네이버)를 확장하고, Google SEO/GEO 점수를 추가. seomachine FastAPI에 readability/keyword 분석 엔드포인트 구현. GA4 대시보드는 기존 3개 API 라우트를 확장하여 콘텐츠별 성과/국가별 트래픽 추가.

**Tech Stack:** Next.js 16, TypeScript, Supabase, cheerio (크롤링), seomachine FastAPI (Python), Recharts, GA4 Data API, GSC API

**Spec:** `docs/superpowers/specs/2026-04-11-contentflow-v2-design.md` (Section 4.6, 4.7)

---

## Task 1: SEO Audit Schema + Types

**Files:**
- Create: `contentflow/supabase/migrations/006_seo_audits.sql`
- Modify: `contentflow/src/types/database.ts` — add SeoAudit, KeywordRanking types
- Modify: `contentflow/src/lib/supabase/queries.ts` — add seoAudit + keywordRanking queries

- [ ] **Step 1: Create seo_audits migration**

```sql
-- supabase/migrations/006_seo_audits.sql

CREATE TABLE seo_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  google_score INT,
  naver_score INT,
  geo_score INT,
  tech_score INT,
  issues JSONB DEFAULT '[]',
  meta_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE keyword_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  search_engine TEXT NOT NULL CHECK (search_engine IN ('google', 'naver')),
  country TEXT DEFAULT 'kr',
  position INT,
  url TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, keyword, search_engine, country, date)
);

CREATE INDEX idx_seo_audits_project ON seo_audits(project_id);
CREATE INDEX idx_keyword_rankings_project ON keyword_rankings(project_id);
CREATE INDEX idx_keyword_rankings_date ON keyword_rankings(date);

ALTER TABLE seo_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view seo audits" ON seo_audits FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors+ can manage seo audits" ON seo_audits FOR ALL USING (EXISTS (
  SELECT 1 FROM project_members WHERE project_id = seo_audits.project_id AND user_id = auth.uid() AND role IN ('admin', 'editor')
));
CREATE POLICY "Members can view keyword rankings" ON keyword_rankings FOR SELECT USING (is_project_member(project_id));
CREATE POLICY "Editors+ can manage keyword rankings" ON keyword_rankings FOR ALL USING (EXISTS (
  SELECT 1 FROM project_members WHERE project_id = keyword_rankings.project_id AND user_id = auth.uid() AND role IN ('admin', 'editor')
));
```

- [ ] **Step 2: Add TypeScript types**

Add to `src/types/database.ts`:
```typescript
export interface SeoAudit {
  id: string; project_id: string; url: string
  google_score: number | null; naver_score: number | null
  geo_score: number | null; tech_score: number | null
  issues: SeoIssue[]; meta_data: Record<string, unknown>
  created_at: string
}

export interface SeoIssue {
  severity: 'critical' | 'warning' | 'info'
  message: string; engine: 'google' | 'naver' | 'geo' | 'tech'
  fix_action?: string
}

export interface KeywordRanking {
  id: string; project_id: string; keyword: string
  search_engine: 'google' | 'naver'; country: string
  position: number | null; url: string | null
  date: string; created_at: string
}
```

- [ ] **Step 3: Add queries and commit**

Add `seoAuditQueries` and `keywordRankingQueries` to queries.ts. Commit all.

---

## Task 2: SEO Analysis API Routes

**Files:**
- Create: `src/app/api/seo/audit/route.ts` — site audit endpoint (crawl URL + analyze)
- Create: `src/app/api/seo/content-check/route.ts` — single content SEO check
- Create: `src/app/api/seo/schema-generate/route.ts` — Schema markup generation

- [ ] **Step 1: Create site audit route**

Crawls the given URL with cheerio, extracts meta tags, headings, images, links, then scores Google/Naver/GEO/Tech.

```typescript
// src/app/api/seo/audit/route.ts
import { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return Response.json({ error: 'url required' }, { status: 400 })

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'ContentFlow SEO Bot/1.0' } })
    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract SEO elements
    const title = $('title').text()
    const metaDescription = $('meta[name="description"]').attr('content') || ''
    const h1s = $('h1').map((_, el) => $(el).text()).get()
    const h2s = $('h2').map((_, el) => $(el).text()).get()
    const images = $('img').map((_, el) => ({ src: $(el).attr('src'), alt: $(el).attr('alt') || '' })).get()
    const links = $('a[href]').length
    const hasSchema = $('script[type="application/ld+json"]').length > 0
    const isHttps = url.startsWith('https')
    const hasViewport = $('meta[name="viewport"]').length > 0
    const canonicalUrl = $('link[rel="canonical"]').attr('href')

    // Scoring
    const issues: Array<{ severity: string; message: string; engine: string; fix_action?: string }> = []

    // Google SEO Score (0-100)
    let googleScore = 0
    if (title && title.length >= 30 && title.length <= 60) googleScore += 15; else issues.push({ severity: 'warning', message: `Title length: ${title.length} (optimal: 30-60)`, engine: 'google' })
    if (metaDescription && metaDescription.length >= 120 && metaDescription.length <= 160) googleScore += 15; else issues.push({ severity: 'critical', message: 'Meta description missing or wrong length', engine: 'google', fix_action: 'Add meta description (120-160 chars)' })
    if (h1s.length === 1) googleScore += 10; else issues.push({ severity: 'warning', message: `${h1s.length} H1 tags (should be 1)`, engine: 'google' })
    if (h2s.length >= 2) googleScore += 10
    if (images.every(img => img.alt)) googleScore += 10; else issues.push({ severity: 'warning', message: `${images.filter(i => !i.alt).length} images without alt text`, engine: 'google', fix_action: 'Add alt text to all images' })
    if (isHttps) googleScore += 10
    if (hasViewport) googleScore += 10
    if (canonicalUrl) googleScore += 10
    if (links > 5) googleScore += 10

    // Naver SEO Score
    let naverScore = 0
    if (title) naverScore += 15
    if (images.length >= 3) naverScore += 15; else issues.push({ severity: 'warning', message: 'Naver prefers 3+ images', engine: 'naver' })
    if (h2s.length >= 2) naverScore += 10
    const textLength = $('body').text().length
    if (textLength >= 2000) naverScore += 15
    if (metaDescription) naverScore += 10
    naverScore += Math.min(35, Math.floor(textLength / 200))

    // GEO Score
    let geoScore = 0
    if (hasSchema) geoScore += 25; else issues.push({ severity: 'critical', message: 'No Schema markup found', engine: 'geo', fix_action: 'Add JSON-LD Schema markup' })
    const hasFaq = $('[itemtype*="FAQPage"]').length > 0 || html.includes('"@type":"FAQPage"')
    if (hasFaq) geoScore += 20; else issues.push({ severity: 'warning', message: 'No FAQ Schema — improves AI citation', engine: 'geo', fix_action: 'Add FAQ structured data' })
    if ($('blockquote, [class*="stat"], [class*="quote"]').length > 0) geoScore += 15
    if (h2s.some(h => h.includes('?'))) geoScore += 15
    geoScore += Math.min(25, Math.floor(textLength / 400))

    // Tech Score
    let techScore = 0
    if (isHttps) techScore += 20
    if (hasViewport) techScore += 20
    if (canonicalUrl) techScore += 15
    if ($('meta[name="robots"]').length > 0) techScore += 10
    if ($('link[rel="sitemap"], a[href*="sitemap"]').length > 0) techScore += 10
    techScore += 25 // base for being reachable

    return Response.json({
      url, title, metaDescription,
      scores: { google: googleScore, naver: naverScore, geo: geoScore, tech: techScore },
      issues,
      meta: { h1Count: h1s.length, h2Count: h2s.length, imageCount: images.length, linkCount: links, textLength, hasSchema, isHttps }
    })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create content SEO check route**

Uses existing `seo-scorer.ts` for Naver, adds Google/GEO scoring for individual content.

- [ ] **Step 3: Create Schema markup generation route**

Uses Gemini to generate JSON-LD Schema markup (MedicalEntity, FAQ, HowTo) from content.

```typescript
// src/app/api/seo/schema-generate/route.ts
import { GoogleGenAI } from '@google/genai'

export async function POST(req: Request) {
  const { content, schemaType, businessInfo } = await req.json()
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

  const prompt = `Generate a valid JSON-LD Schema.org markup of type "${schemaType || 'Article'}" for the following content.
${businessInfo ? `Business: ${businessInfo}` : ''}
Rules:
- Output ONLY valid JSON-LD (no explanation)
- Include all relevant properties
- For medical content, use MedicalEntity schema
- For Q&A content, use FAQPage schema

Content:
${content}`

  const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt })
  const text = response.text || ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)

  return Response.json({ schema: jsonMatch ? jsonMatch[0] : text })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/seo/ && git commit -m "feat: add SEO audit, content check, and schema generation APIs"
```

---

## Task 3: SEO Dashboard UI

**Files:**
- Create: `src/components/seo/seo-dashboard.tsx`
- Create: `src/components/seo/score-gauge.tsx`
- Create: `src/components/seo/issues-list.tsx`
- Create: `src/components/seo/audit-form.tsx`
- Modify: `src/app/(dashboard)/seo/page.tsx` — replace placeholder

- [ ] **Step 1: Create ScoreGauge component**

Circular SVG gauge showing a 0-100 score with color coding (red < 50, yellow < 75, green >= 75).

- [ ] **Step 2: Create AuditForm component**

URL input + "검사" button. On submit, calls `/api/seo/audit` and displays results.

- [ ] **Step 3: Create IssuesList component**

Lists SEO issues with severity indicators (red dot = critical, yellow = warning), engine badges (Google/Naver/GEO/Tech), and fix action buttons.

- [ ] **Step 4: Create SeoDashboard**

Tabs: 사이트 감사 | 콘텐츠 SEO | 키워드 트래킹 | Schema 마크업

- 사이트 감사: AuditForm + 4 ScoreGauges + IssuesList
- 콘텐츠 SEO: existing seo-scorer integration (per-content)
- 키워드 트래킹: placeholder for now
- Schema 마크업: form to generate JSON-LD

- [ ] **Step 5: Update SEO page and commit**

---

## Task 4: GA4 Dashboard Extension

**Files:**
- Create: `src/app/api/analytics/content-performance/route.ts`
- Create: `src/app/api/analytics/country-traffic/route.ts`
- Create: `src/components/analytics/content-performance.tsx`
- Create: `src/components/analytics/country-traffic.tsx`
- Modify: `src/components/analytics/analytics-dashboard.tsx` — add new sections

- [ ] **Step 1: Create content performance API**

GA4 query for page paths with session counts — maps content URLs to ContentFlow content items.

```typescript
// src/app/api/analytics/content-performance/route.ts
import { BetaAnalyticsDataClient } from '@google-analytics/data'

export async function POST(req: Request) {
  const { propertyId, clientEmail, privateKey, days } = await req.json()

  const client = new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  })

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: `${days || 30}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }, { name: 'sessionSource' }],
    metrics: [{ name: 'sessions' }, { name: 'conversions' }, { name: 'averageSessionDuration' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 20,
  })

  const rows = response.rows?.map(row => ({
    path: row.dimensionValues?.[0]?.value,
    source: row.dimensionValues?.[1]?.value,
    sessions: parseInt(row.metricValues?.[0]?.value || '0'),
    conversions: parseInt(row.metricValues?.[1]?.value || '0'),
    avgDuration: parseFloat(row.metricValues?.[2]?.value || '0'),
  })) || []

  return Response.json(rows)
}
```

- [ ] **Step 2: Create country traffic API**

GA4 query grouped by country.

```typescript
// src/app/api/analytics/country-traffic/route.ts
import { BetaAnalyticsDataClient } from '@google-analytics/data'

export async function POST(req: Request) {
  const { propertyId, clientEmail, privateKey, days } = await req.json()

  const client = new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  })

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: `${days || 30}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'country' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10,
  })

  const rows = response.rows?.map(row => ({
    country: row.dimensionValues?.[0]?.value,
    sessions: parseInt(row.metricValues?.[0]?.value || '0'),
    users: parseInt(row.metricValues?.[1]?.value || '0'),
  })) || []

  return Response.json(rows)
}
```

- [ ] **Step 3: Create UI components and integrate**

Create `content-performance.tsx` (table with path, source, sessions, conversions) and `country-traffic.tsx` (country flags + bar chart). Add both to `analytics-dashboard.tsx` below existing sections.

- [ ] **Step 4: Commit**

---

## Task 5: seomachine FastAPI — Readability + Keyword Analysis

**Files:**
- Modify: `seo-service/main.py` — implement readability and keyword density endpoints
- Modify: `seo-service/requirements.txt` — ensure dependencies
- Create: `src/app/api/seo/readability/route.ts` — Next.js proxy to FastAPI

- [ ] **Step 1: Implement FastAPI endpoints**

```python
# seo-service/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import textstat
import re
from collections import Counter

app = FastAPI(title="ContentFlow SEO Service")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])

class TextInput(BaseModel):
    text: str
    language: str = "ko"

class KeywordInput(BaseModel):
    text: str
    keywords: list[str]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze/readability")
def analyze_readability(input: TextInput):
    text = input.text
    sentences = [s.strip() for s in re.split(r'[.!?。！？]', text) if s.strip()]
    words = text.split()
    avg_sentence_length = len(words) / max(len(sentences), 1)
    
    if input.language == "ko":
        char_count = len(text.replace(" ", ""))
        paragraph_count = len([p for p in text.split("\n\n") if p.strip()])
        score = min(100, max(0, 100 - abs(avg_sentence_length - 15) * 3))
        return {
            "score": round(score),
            "char_count": char_count,
            "sentence_count": len(sentences),
            "paragraph_count": paragraph_count,
            "avg_sentence_length": round(avg_sentence_length, 1),
            "grade": "good" if score >= 70 else "fair" if score >= 50 else "poor"
        }
    else:
        flesch = textstat.flesch_reading_ease(text)
        grade = textstat.flesch_kincaid_grade(text)
        return {
            "score": round(max(0, min(100, flesch))),
            "flesch_reading_ease": round(flesch, 1),
            "flesch_kincaid_grade": round(grade, 1),
            "sentence_count": len(sentences),
            "word_count": len(words),
            "avg_sentence_length": round(avg_sentence_length, 1),
            "grade": "good" if flesch >= 60 else "fair" if flesch >= 30 else "poor"
        }

@app.post("/analyze/keywords")
def analyze_keywords(input: KeywordInput):
    text_lower = input.text.lower()
    word_count = len(input.text.split())
    results = []
    for kw in input.keywords:
        count = text_lower.count(kw.lower())
        density = (count / max(word_count, 1)) * 100
        results.append({
            "keyword": kw,
            "count": count,
            "density": round(density, 2),
            "status": "optimal" if 1 <= density <= 2.5 else "low" if density < 1 else "high"
        })
    return {"keywords": results, "word_count": word_count}
```

- [ ] **Step 2: Create Next.js proxy route**

```typescript
// src/app/api/seo/readability/route.ts
export async function POST(req: Request) {
  const body = await req.json()
  const seoServiceUrl = process.env.SEO_SERVICE_URL || 'http://localhost:8000'
  
  const response = await fetch(`${seoServiceUrl}/analyze/readability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  
  const data = await response.json()
  return Response.json(data)
}
```

- [ ] **Step 3: Commit**

---

## Task 6: Build + Integration Test

- [ ] **Step 1: Run tests** — `npx vitest run`
- [ ] **Step 2: Run build** — `rm -rf .next && npx next build`
- [ ] **Step 3: Verify new routes appear in build output**
- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "feat: complete Phase 3 — SEO analysis and analytics extension"
```
