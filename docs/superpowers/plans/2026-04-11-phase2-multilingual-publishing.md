# Phase 2: 다국어 + 채널 발행 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채널 에디터에 언어 전환을 통합하고, AI 번역 파이프라인을 구축하며, WordPress/Meta/YouTube 자동/예약 발행과 캘린더 모듈을 구현한다.

**Architecture:** 각 채널 에디터(blog-panel, cardnews-panel 등)의 헤더에 언어 셀렉터 바를 추가. 번역은 `/api/ai/translate` SSE 엔드포인트로 처리. 발행은 플랫폼별 API Route + Supabase Edge Functions 예약 스케줄러. 캘린더는 publish_records 기반 월간/주간 뷰.

**Tech Stack:** Next.js 16, TypeScript, Supabase (PostgreSQL + Edge Functions + pg_cron), WordPress REST API, Meta Graph API, YouTube Data API v3, Recharts (캘린더 차트)

**Spec:** `docs/superpowers/specs/2026-04-11-contentflow-v2-design.md` (Section 4.1, 4.3, 4.4)

---

## File Structure Overview

### New Files
```
src/
├── app/
│   ├── (dashboard)/
│   │   └── calendar/page.tsx            # Calendar module (replace placeholder)
│   ├── api/
│   │   ├── ai/translate/route.ts        # AI translation SSE endpoint
│   │   ├── publish/
│   │   │   ├── wordpress/route.ts       # WordPress REST API publish
│   │   │   ├── meta/route.ts            # Meta Graph API (Instagram/Facebook/Threads)
│   │   │   ├── youtube/route.ts         # YouTube Data API upload
│   │   │   ├── schedule/route.ts        # Schedule publish (CRUD)
│   │   │   └── queue/route.ts           # Get publish queue
│   │   └── calendar/
│   │       └── events/route.ts          # Calendar events aggregation
├── components/
│   ├── content/
│   │   ├── language-selector.tsx         # Language toggle bar (shared)
│   │   └── naver-reformat-dialog.tsx     # Naver blog reformat + copy
│   ├── publish/
│   │   ├── publish-dashboard.tsx         # Channel publish main view
│   │   ├── channel-cards.tsx             # Connected channel overview cards
│   │   ├── publish-queue.tsx             # Publish queue list
│   │   ├── publish-dialog.tsx            # Publish/schedule dialog
│   │   └── naver-copy-section.tsx        # Naver manual copy section
│   └── calendar/
│       ├── calendar-view.tsx             # Main calendar component
│       ├── calendar-header.tsx           # Month/week nav + filters
│       ├── calendar-month.tsx            # Monthly grid view
│       ├── calendar-week.tsx             # Weekly detail view
│       └── calendar-event-card.tsx       # Individual event card
├── hooks/
│   ├── use-translation.ts               # AI translation SSE hook
│   └── use-publish.ts                   # Publish actions hook
├── lib/
│   └── translation-prompt-builder.ts    # Translation-specific prompts
supabase/
└── migrations/
    ├── 004_translations.sql             # Translations table
    ├── 005_publish_records.sql          # Publish records + scheduling
    └── functions/
        └── process-scheduled-publishes.sql  # pg_cron function
```

### Modified Files
```
src/
├── components/content/
│   ├── content-tabs.tsx                 # Add language selector bar below tabs
│   ├── blog-panel.tsx                   # Language-aware content loading
│   ├── cardnews-panel.tsx               # Language-aware content loading
│   ├── threads-panel.tsx                # Language-aware content loading
│   └── youtube-panel.tsx                # Language-aware content loading
├── types/
│   └── database.ts                      # Add Translation, PublishRecord types
├── lib/supabase/
│   └── queries.ts                       # Add translation + publish queries
└── stores/
    └── ui-store.ts                      # Add selectedLanguage state
```

---

## Task 1: Database Schema — Translations & Publishing

**Files:**
- Create: `contentflow/supabase/migrations/004_translations.sql`
- Create: `contentflow/supabase/migrations/005_publish_records.sql`

- [ ] **Step 1: Create translations table**

```sql
-- supabase/migrations/004_translations.sql

CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'translating', 'review', 'completed')),
  title TEXT,
  body TEXT,
  cards_json JSONB,
  seo_title TEXT,
  seo_description TEXT,
  translated_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_id, language, channel_type)
);

CREATE INDEX idx_translations_content ON translations(content_id);
CREATE INDEX idx_translations_status ON translations(status);

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view translations"
  ON translations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contents c
    JOIN project_members pm ON pm.project_id = c.project_id
    WHERE c.id = translations.content_id
    AND pm.user_id = auth.uid()
  ));

CREATE POLICY "Editors+ can manage translations"
  ON translations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM contents c
    JOIN project_members pm ON pm.project_id = c.project_id
    WHERE c.id = translations.content_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('admin', 'editor')
  ));
```

- [ ] **Step 2: Create publish records table**

```sql
-- supabase/migrations/005_publish_records.sql

CREATE TABLE publish_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('wordpress', 'naver_blog', 'instagram', 'facebook', 'threads', 'youtube')),
  language TEXT NOT NULL DEFAULT 'ko',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_id TEXT,
  published_url TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_publish_records_project ON publish_records(project_id);
CREATE INDEX idx_publish_records_status ON publish_records(status);
CREATE INDEX idx_publish_records_scheduled ON publish_records(scheduled_at) WHERE status = 'scheduled';

ALTER TABLE publish_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view publish records"
  ON publish_records FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Editors+ can manage publish records"
  ON publish_records FOR ALL
  USING (EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = publish_records.project_id
    AND user_id = auth.uid()
    AND role IN ('admin', 'editor')
  ));
```

- [ ] **Step 3: Commit**

```bash
cd contentflow && git add supabase/migrations/
git commit -m "feat: add translations and publish_records schema"
```

---

## Task 2: TypeScript Types + Query Layer

**Files:**
- Modify: `src/types/database.ts` — add Translation, PublishRecord types
- Modify: `src/lib/supabase/queries.ts` — add translation + publish queries

- [ ] **Step 1: Add types to database.ts**

```typescript
// Add to src/types/database.ts

type TranslationStatus = 'pending' | 'translating' | 'review' | 'completed'
type PublishStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'

interface Translation {
  id: string
  content_id: string
  language: string
  channel_type: ChannelType
  status: TranslationStatus
  title: string | null
  body: string | null
  cards_json: Record<string, unknown>[] | null
  seo_title: string | null
  seo_description: string | null
  translated_at: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

interface PublishRecord {
  id: string
  content_id: string
  project_id: string
  channel: ChannelType
  language: string
  status: PublishStatus
  scheduled_at: string | null
  published_at: string | null
  platform_post_id: string | null
  published_url: string | null
  error_message: string | null
  retry_count: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Add queries**

Add to `src/lib/supabase/queries.ts`:

```typescript
export const translationQueries = {
  listByContent: (contentId: string) =>
    getClient().from('translations').select('*').eq('content_id', contentId),
  getByContentLanguageChannel: (contentId: string, language: string, channelType: string) =>
    getClient().from('translations').select('*')
      .eq('content_id', contentId).eq('language', language).eq('channel_type', channelType).single(),
  create: (data: Partial<Translation>) => getClient().from('translations').insert(data).select().single(),
  update: (id: string, data: Partial<Translation>) => getClient().from('translations').update(data).eq('id', id),
  delete: (id: string) => getClient().from('translations').delete().eq('id', id),
}

export const publishRecordQueries = {
  listByProject: (projectId: string) =>
    getClient().from('publish_records').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
  listScheduled: (projectId: string) =>
    getClient().from('publish_records').select('*').eq('project_id', projectId).eq('status', 'scheduled').order('scheduled_at'),
  listByDateRange: (projectId: string, start: string, end: string) =>
    getClient().from('publish_records').select('*').eq('project_id', projectId)
      .gte('scheduled_at', start).lte('scheduled_at', end),
  create: (data: Partial<PublishRecord>) => getClient().from('publish_records').insert(data).select().single(),
  update: (id: string, data: Partial<PublishRecord>) => getClient().from('publish_records').update(data).eq('id', id),
  delete: (id: string) => getClient().from('publish_records').delete().eq('id', id),
}
```

- [ ] **Step 3: Commit**

```bash
cd contentflow && git add src/types/ src/lib/supabase/
git commit -m "feat: add Translation and PublishRecord types and queries"
```

---

## Task 3: Language Selector Component

**Files:**
- Create: `src/components/content/language-selector.tsx`
- Modify: `src/stores/ui-store.ts` — add selectedLanguage
- Modify: `src/components/content/content-tabs.tsx` — add language bar below tabs

- [ ] **Step 1: Add selectedLanguage to UI store**

Add to `ui-store.ts`:
```typescript
selectedLanguage: string  // default 'ko'
setSelectedLanguage: (lang: string) => void
```

- [ ] **Step 2: Create LanguageSelector component**

```typescript
// src/components/content/language-selector.tsx
'use client'

import { useUIStore } from '@/stores/ui-store'
import { useProjectStore } from '@/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const LANGUAGE_INFO: Record<string, { label: string; flag: string }> = {
  ko: { label: 'KO', flag: '🇰🇷' },
  en: { label: 'EN', flag: '🇺🇸' },
  th: { label: 'TH', flag: '🇹🇭' },
  vi: { label: 'VI', flag: '🇻🇳' },
  ja: { label: 'JA', flag: '🇯🇵' },
  zh: { label: 'ZH', flag: '🇨🇳' },
}

interface LanguageSelectorProps {
  onTranslate?: (targetLang: string) => void
  translationStatuses?: Record<string, string>  // { en: 'completed', th: 'translating' }
}

export function LanguageSelector({ onTranslate, translationStatuses = {} }: LanguageSelectorProps) {
  const { selectedLanguage, setSelectedLanguage } = useUIStore()
  const { projects, selectedProjectId } = useProjectStore()
  const project = projects.find(p => p.id === selectedProjectId)

  const targetLanguages = project?.target_languages || ['ko']

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
      <span className="text-xs text-muted-foreground mr-1">언어:</span>
      <div className="flex bg-muted rounded-md overflow-hidden">
        {targetLanguages.map((lang) => {
          const info = LANGUAGE_INFO[lang] || { label: lang.toUpperCase(), flag: '🌐' }
          const status = lang === 'ko' ? 'original' : (translationStatuses[lang] || 'none')
          const isActive = selectedLanguage === lang

          return (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-xs transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                status === 'completed' && !isActive && 'text-green-500',
                status === 'translating' && !isActive && 'text-yellow-500',
              )}
            >
              <span>{info.flag}</span>
              <span>{info.label}</span>
              {status === 'completed' && <span className="text-[10px]">✓</span>}
              {status === 'translating' && <span className="text-[10px]">⏳</span>}
              {status === 'none' && lang !== 'ko' && <span className="text-[10px]">—</span>}
            </button>
          )
        })}
      </div>

      {selectedLanguage !== 'ko' && (
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs">
            원본 비교 보기
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => onTranslate?.(selectedLanguage)}>
            AI 번역
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add LanguageSelector to content-tabs.tsx**

Read `content-tabs.tsx` and add `<LanguageSelector />` below the tab navigation bar, above the panel content. This way all channel panels get the language context.

- [ ] **Step 4: Commit**

```bash
cd contentflow && git add src/components/content/language-selector.tsx src/stores/ui-store.ts src/components/content/content-tabs.tsx
git commit -m "feat: add language selector to channel editors"
```

---

## Task 4: AI Translation API

**Files:**
- Create: `src/app/api/ai/translate/route.ts`
- Create: `src/lib/translation-prompt-builder.ts`
- Create: `src/hooks/use-translation.ts`

- [ ] **Step 1: Create translation prompt builder**

```typescript
// src/lib/translation-prompt-builder.ts
import type { Project } from '@/types/database'

interface TranslationContext {
  sourceLanguage: string
  targetLanguage: string
  channelType: string
  project?: Project
  isNaver?: boolean  // Naver blog reformat mode
}

export function buildTranslationPrompt(context: TranslationContext): string {
  const { sourceLanguage, targetLanguage, channelType, project, isNaver } = context

  const langNames: Record<string, string> = {
    ko: 'Korean', en: 'English', th: 'Thai', vi: 'Vietnamese', ja: 'Japanese', zh: 'Chinese'
  }

  const sourceName = langNames[sourceLanguage] || sourceLanguage
  const targetName = langNames[targetLanguage] || targetLanguage

  let prompt = `You are a professional translator specializing in ${channelType} content.
Translate the following ${sourceName} content to ${targetName}.

Rules:
- Maintain the original tone and style
- Preserve all formatting (headings, lists, bold, etc.)
- Keep technical terms accurate
- Adapt cultural references for the target audience
- Do NOT translate brand names, product names, or proper nouns
- Return ONLY the translated content, no explanations`

  if (project?.brand_name) {
    prompt += `\n- Brand name: "${project.brand_name}" (keep as-is)`
  }

  if (project?.industry) {
    prompt += `\n- Industry: ${project.industry} (use appropriate terminology)`
  }

  if (isNaver) {
    prompt += `\n
Special Naver Blog formatting:
- Use shorter paragraphs (2-3 sentences max)
- Add more line breaks for readability
- Include relevant emojis sparingly
- Format for mobile reading
- Adjust keyword density for Naver SEO`
  }

  if (channelType === 'youtube') {
    prompt += `\n- Translate narration scripts naturally for spoken delivery
- Adapt timing markers if present`
  }

  if (channelType === 'instagram' || channelType === 'threads') {
    prompt += `\n- Keep text concise for social media
- Translate hashtags to target language equivalents`
  }

  return prompt
}
```

- [ ] **Step 2: Create translation API route (SSE)**

```typescript
// src/app/api/ai/translate/route.ts
import { GoogleGenAI } from '@google/genai'
import { buildTranslationPrompt } from '@/lib/translation-prompt-builder'

export async function POST(req: Request) {
  const { text, sourceLanguage, targetLanguage, channelType, model, project, isNaver } = await req.json()

  if (!text || !targetLanguage) {
    return Response.json({ error: 'text and targetLanguage required' }, { status: 400 })
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  const systemPrompt = buildTranslationPrompt({
    sourceLanguage: sourceLanguage || 'ko',
    targetLanguage,
    channelType: channelType || 'blog',
    project,
    isNaver,
  })

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await ai.models.generateContentStream({
          model: model || 'gemini-2.0-flash',
          contents: [{ role: 'user', parts: [{ text }] }],
          config: { systemInstruction: systemPrompt },
        })

        for await (const chunk of response) {
          const text = chunk.text()
          if (text) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
```

- [ ] **Step 3: Create useTranslation hook**

```typescript
// src/hooks/use-translation.ts
'use client'

import { useState, useCallback } from 'react'

interface TranslateOptions {
  text: string
  sourceLanguage?: string
  targetLanguage: string
  channelType?: string
  model?: string
  isNaver?: boolean
}

export function useTranslation() {
  const [translating, setTranslating] = useState(false)
  const [translatedText, setTranslatedText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const translate = useCallback(async (options: TranslateOptions) => {
    setTranslating(true)
    setTranslatedText('')
    setError(null)

    try {
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      })

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let result = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              result += parsed.text
              setTranslatedText(result)
            }
            if (parsed.error) throw new Error(parsed.error)
          } catch {}
        }
      }

      setTranslating(false)
      return result
    } catch (err) {
      setError(String(err))
      setTranslating(false)
      return null
    }
  }, [])

  return { translate, translating, translatedText, error }
}
```

- [ ] **Step 4: Commit**

```bash
cd contentflow && git add src/app/api/ai/translate/ src/lib/translation-prompt-builder.ts src/hooks/use-translation.ts
git commit -m "feat: add AI translation API with SSE streaming"
```

---

## Task 5: WordPress Publishing API

**Files:**
- Create: `src/app/api/publish/wordpress/route.ts`

- [ ] **Step 1: Create WordPress publish route**

```typescript
// src/app/api/publish/wordpress/route.ts

export async function POST(req: Request) {
  const { title, content, status, categories, tags, siteUrl, username, applicationPassword, scheduledAt } = await req.json()

  if (!siteUrl || !username || !applicationPassword) {
    return Response.json({ error: 'WordPress credentials required' }, { status: 400 })
  }

  const wpApiUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`

  const postData: Record<string, unknown> = {
    title,
    content,
    status: scheduledAt ? 'future' : (status || 'publish'),
    categories,
    tags,
  }

  if (scheduledAt) {
    postData.date = scheduledAt
  }

  try {
    const response = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${username}:${applicationPassword}`).toString('base64')}`,
      },
      body: JSON.stringify(postData),
    })

    if (!response.ok) {
      const error = await response.text()
      return Response.json({ error: `WordPress API error: ${error}` }, { status: response.status })
    }

    const post = await response.json()
    return Response.json({
      success: true,
      postId: post.id,
      url: post.link,
      status: post.status,
    })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd contentflow && git add src/app/api/publish/wordpress/
git commit -m "feat: add WordPress publishing API route"
```

---

## Task 6: Meta (Instagram/Facebook/Threads) Publishing API

**Files:**
- Create: `src/app/api/publish/meta/route.ts`

- [ ] **Step 1: Create Meta publish route**

Uses Meta Graph API for Instagram content publishing and Facebook/Threads posting.

```typescript
// src/app/api/publish/meta/route.ts

export async function POST(req: Request) {
  const { platform, accessToken, pageId, caption, imageUrl, mediaType, scheduledAt } = await req.json()

  if (!accessToken || !pageId) {
    return Response.json({ error: 'Meta access token and page ID required' }, { status: 400 })
  }

  const graphUrl = 'https://graph.facebook.com/v21.0'

  try {
    if (platform === 'instagram') {
      // Step 1: Create media container
      const containerResponse = await fetch(`${graphUrl}/${pageId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: accessToken,
        }),
      })
      const container = await containerResponse.json()
      if (container.error) return Response.json({ error: container.error.message }, { status: 400 })

      // Step 2: Publish
      const publishResponse = await fetch(`${graphUrl}/${pageId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: accessToken,
        }),
      })
      const result = await publishResponse.json()
      return Response.json({ success: true, postId: result.id })
    }

    if (platform === 'facebook') {
      const response = await fetch(`${graphUrl}/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: caption,
          access_token: accessToken,
          ...(scheduledAt && { scheduled_publish_time: Math.floor(new Date(scheduledAt).getTime() / 1000), published: false }),
        }),
      })
      const result = await response.json()
      if (result.error) return Response.json({ error: result.error.message }, { status: 400 })
      return Response.json({ success: true, postId: result.id })
    }

    if (platform === 'threads') {
      // Threads API (via Meta)
      const containerResponse = await fetch(`${graphUrl}/${pageId}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: imageUrl ? 'IMAGE' : 'TEXT',
          text: caption,
          ...(imageUrl && { image_url: imageUrl }),
          access_token: accessToken,
        }),
      })
      const container = await containerResponse.json()
      if (container.error) return Response.json({ error: container.error.message }, { status: 400 })

      const publishResponse = await fetch(`${graphUrl}/${pageId}/threads_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: accessToken,
        }),
      })
      const result = await publishResponse.json()
      return Response.json({ success: true, postId: result.id })
    }

    return Response.json({ error: 'Invalid platform' }, { status: 400 })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd contentflow && git add src/app/api/publish/meta/
git commit -m "feat: add Meta Graph API publishing (Instagram/Facebook/Threads)"
```

---

## Task 7: YouTube Publishing API

**Files:**
- Create: `src/app/api/publish/youtube/route.ts`

- [ ] **Step 1: Create YouTube upload route**

YouTube requires OAuth2 and video file upload. This is a placeholder that handles the API call structure — actual OAuth flow will use the channel_connections tokens.

```typescript
// src/app/api/publish/youtube/route.ts

export async function POST(req: Request) {
  const { title, description, tags, categoryId, privacyStatus, accessToken, videoUrl, scheduledAt } = await req.json()

  if (!accessToken || !videoUrl) {
    return Response.json({ error: 'Access token and video URL required' }, { status: 400 })
  }

  try {
    // Step 1: Download video from URL (e.g., R2 storage)
    const videoResponse = await fetch(videoUrl)
    const videoBlob = await videoResponse.blob()

    // Step 2: Upload to YouTube via resumable upload
    const metadataResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: { title, description, tags, categoryId: categoryId || '22' },
          status: {
            privacyStatus: scheduledAt ? 'private' : (privacyStatus || 'public'),
            ...(scheduledAt && { publishAt: scheduledAt }),
          },
        }),
      }
    )

    const uploadUrl = metadataResponse.headers.get('location')
    if (!uploadUrl) {
      return Response.json({ error: 'Failed to get upload URL' }, { status: 500 })
    }

    // Step 3: Upload video bytes
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': videoBlob.type,
      },
      body: videoBlob,
    })

    const result = await uploadResponse.json()
    return Response.json({
      success: true,
      videoId: result.id,
      url: `https://www.youtube.com/watch?v=${result.id}`,
    })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd contentflow && git add src/app/api/publish/youtube/
git commit -m "feat: add YouTube Data API publishing route"
```

---

## Task 8: Publish Queue & Schedule API

**Files:**
- Create: `src/app/api/publish/queue/route.ts`
- Create: `src/app/api/publish/schedule/route.ts`

- [ ] **Step 1: Create queue endpoint**

```typescript
// src/app/api/publish/queue/route.ts
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')

  if (!projectId) return Response.json({ error: 'projectId required' }, { status: 400 })

  const supabase = await createClient()
  let query = supabase.from('publish_records').select('*').eq('project_id', projectId)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data)
}
```

- [ ] **Step 2: Create schedule endpoint**

```typescript
// src/app/api/publish/schedule/route.ts
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = await createClient()

  const { data, error } = await supabase.from('publish_records')
    .insert({ ...body, status: body.scheduled_at ? 'scheduled' : 'draft' })
    .select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from('publish_records').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
```

- [ ] **Step 3: Commit**

```bash
cd contentflow && git add src/app/api/publish/
git commit -m "feat: add publish queue and schedule API routes"
```

---

## Task 9: Publish Dashboard UI

**Files:**
- Create: `src/components/publish/publish-dashboard.tsx`
- Create: `src/components/publish/channel-cards.tsx`
- Create: `src/components/publish/publish-queue.tsx`
- Create: `src/components/publish/naver-copy-section.tsx`
- Modify: `src/app/(dashboard)/publish/page.tsx` — replace placeholder

- [ ] **Step 1: Create channel cards**

Shows connected channels as cards (WordPress, Instagram, YouTube, Facebook, Threads) with publish/scheduled counts. Uses `channel_connections` data.

- [ ] **Step 2: Create publish queue**

List of publish records with status badges, channel icons, language flags, scheduled times. Filter tabs: 전체/예약/발행됨/실패. Actions: 수정, 지금 발행, 취소.

- [ ] **Step 3: Create Naver copy section**

Green-bordered section showing Naver-reformatted content with "네이버 포맷 복사" button. Uses the translation API with `isNaver: true`.

- [ ] **Step 4: Create publish dashboard**

Composes channel-cards + publish-queue + naver-copy-section.

- [ ] **Step 5: Update publish page**

Replace the placeholder in `src/app/(dashboard)/publish/page.tsx` with the publish dashboard.

- [ ] **Step 6: Commit**

```bash
cd contentflow && git add src/components/publish/ src/app/\(dashboard\)/publish/
git commit -m "feat: add publish dashboard with channel cards, queue, and Naver copy"
```

---

## Task 10: Calendar Module

**Files:**
- Create: `src/components/calendar/calendar-view.tsx`
- Create: `src/components/calendar/calendar-header.tsx`
- Create: `src/components/calendar/calendar-month.tsx`
- Create: `src/components/calendar/calendar-event-card.tsx`
- Create: `src/app/api/calendar/events/route.ts`
- Modify: `src/app/(dashboard)/calendar/page.tsx` — replace placeholder

- [ ] **Step 1: Create calendar events API**

Aggregates publish_records for a date range into calendar events.

```typescript
// src/app/api/calendar/events/route.ts
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (!projectId || !start || !end) {
    return Response.json({ error: 'projectId, start, end required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get scheduled and published records in date range
  const { data, error } = await supabase.from('publish_records')
    .select('*, contents(title)')
    .eq('project_id', projectId)
    .or(`scheduled_at.gte.${start},published_at.gte.${start}`)
    .or(`scheduled_at.lte.${end},published_at.lte.${end}`)
    .order('scheduled_at')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
```

- [ ] **Step 2: Create calendar components**

**calendar-header.tsx**: Month/week navigation, channel/language filters
**calendar-month.tsx**: 7-column grid, days with event cards
**calendar-event-card.tsx**: Small card with channel icon + flag + content title
**calendar-view.tsx**: Composes header + month/week views

Follow the mockup from the brainstorming session: national flags + channel colors for visual distinction, AI publish time suggestion banner at bottom.

- [ ] **Step 3: Update calendar page**

Replace placeholder with CalendarView.

- [ ] **Step 4: Commit**

```bash
cd contentflow && git add src/components/calendar/ src/app/api/calendar/ src/app/\(dashboard\)/calendar/
git commit -m "feat: add calendar module with monthly view and event cards"
```

---

## Task 11: Final Build & Integration Test

- [ ] **Step 1: Run full test suite**

```bash
cd contentflow && npx vitest run
```

- [ ] **Step 2: Run production build**

```bash
cd contentflow && rm -rf .next && npx next build
```

- [ ] **Step 3: Apply Supabase migrations**

```bash
npx supabase db push
```

- [ ] **Step 4: Manual E2E walkthrough**

1. Create content → switch language to EN → click "AI 번역" → verify SSE streaming works
2. Open publish page → verify channel cards show
3. Schedule a WordPress publish → verify it appears in queue
4. Open calendar → verify scheduled items appear in grid
5. Navigate between modules → verify sidebar works

- [ ] **Step 5: Commit**

```bash
cd contentflow && git add -A
git commit -m "feat: complete Phase 2 — multilingual translation and channel publishing"
```
