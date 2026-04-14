import { createClient } from '@/lib/supabase/client'
import { fetchSSEText } from '@/lib/sse-stream-parser'
import { uploadToR2 } from '@/hooks/use-r2-upload'
import type {
  BlogCard,
  InstagramCard,
  ThreadsCard,
  YoutubeCard,
  Project,
} from '@/types/database'

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  vi: 'Vietnamese',
  th: 'Thai',
  ja: 'Japanese',
  zh: 'Chinese',
  ms: 'Malay',
  id: 'Indonesian',
}

export type ChannelKind =
  | 'base'
  | 'naver_blog'
  | 'wordpress'
  | 'instagram'
  | 'threads'
  | 'youtube'

export interface ChannelTranslationInput {
  projectId: string
  contentId: string
  project: Project
  targetLang: string
  channel: ChannelKind
  /** HTML/text source to translate. Must be ready-to-translate. */
  sourceHtml: string
  /** `true` for Naver blog to apply Naver-specific formatting. */
  isNaver?: boolean
}

/**
 * Runs the AI translation stream and returns the full translated text.
 * Uses the shared `/api/ai/translate` route.
 */
function streamTranslate(input: {
  text: string
  targetLang: string
  channelType: string
  project?: Project
  isNaver?: boolean
}): Promise<string> {
  return fetchSSEText('/api/ai/translate', {
    text: input.text,
    sourceLanguage: 'ko',
    targetLanguage: input.targetLang,
    channelType: input.channelType,
    project: input.project,
    isNaver: input.isNaver,
  })
}

async function uploadHtmlToR2(params: {
  projectId: string
  contentId: string
  channel: ChannelKind
  targetLang: string
  html: string
}): Promise<string> {
  const { projectId, contentId, channel, targetLang, html } = params
  const blob = new Blob([html], { type: 'text/html' })
  const { publicUrl } = await uploadToR2(blob, {
    projectId,
    category: 'content',
    fileName: `${contentId}_${channel}_${targetLang}.html`,
    contentType: 'text/html',
    contentId,
  })
  return publicUrl
}

/**
 * Translates the given channel source HTML and persists the result to R2
 * plus a row in the `translations` table.  Returns the public R2 URL.
 */
export async function translateAndSaveChannel(
  input: ChannelTranslationInput
): Promise<string> {
  const translated = await streamTranslate({
    text: input.sourceHtml.slice(0, 16000),
    targetLang: input.targetLang,
    channelType: input.channel,
    project: input.project,
    isNaver: input.isNaver,
  })

  const publicUrl = await uploadHtmlToR2({
    projectId: input.projectId,
    contentId: input.contentId,
    channel: input.channel,
    targetLang: input.targetLang,
    html: translated,
  })

  const supabase = createClient()
  // Upsert translation row — body holds the R2 URL reference.
  const { data: existing } = await supabase
    .from('translations')
    .select('id')
    .eq('content_id', input.contentId)
    .eq('language', input.targetLang)
    .eq('channel_type', input.channel)
    .maybeSingle()

  if (existing?.id) {
    await supabase
      .from('translations')
      .update({
        status: 'completed',
        body: publicUrl,
        translated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('translations').insert({
      content_id: input.contentId,
      language: input.targetLang,
      channel_type: input.channel,
      status: 'completed',
      body: publicUrl,
      translated_at: new Date().toISOString(),
    })
  }

  return publicUrl
}

/* ─── Channel-specific HTML builders ─────────────────────────── */

export function buildBlogCardsHtml(cards: BlogCard[]): string {
  const parts: string[] = []
  for (const card of cards) {
    const c = card.content as Record<string, unknown>
    const text = (c?.text as string) || ''
    const imgUrl = (c?.url as string) || ''
    const alt = (c?.alt as string) || ''
    const caption = (c?.caption as string) || ''
    if (text) parts.push(text)
    if (imgUrl) {
      parts.push(
        `<figure><img src="${imgUrl}" alt="${alt}" />${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`
      )
    }
  }
  return parts.join('\n\n')
}

export function buildCardnewsHtml(cards: InstagramCard[], caption?: string | null): string {
  const parts: string[] = []
  if (caption) parts.push(`<p data-role="caption">${caption}</p>`)
  cards
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .forEach((card, i) => {
      const style = (card.text_style as Record<string, unknown>) || {}
      const header = (style.header as string) || ''
      const title = (style.title as string) || ''
      const body = (style.body as string) || card.text_content || ''
      const footer = (style.footer as string) || ''
      parts.push(
        `<section data-slide="${i + 1}">` +
          (header ? `<p data-role="header">${header}</p>` : '') +
          (title ? `<h3 data-role="title">${title}</h3>` : '') +
          (body ? `<p data-role="body">${body}</p>` : '') +
          (footer ? `<p data-role="footer">${footer}</p>` : '') +
          `</section>`
      )
    })
  return parts.join('\n\n')
}

export function buildThreadsHtml(cards: ThreadsCard[]): string {
  return cards
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c, i) => `<section data-post="${i + 1}"><p>${c.text_content || ''}</p></section>`)
    .join('\n\n')
}

export function buildYoutubeHtml(cards: YoutubeCard[]): string {
  return cards
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c, i) => {
      const narration = c.narration_text || ''
      const subtitle = c.subtitle_text || ''
      const direction = c.screen_direction || ''
      return (
        `<section data-scene="${i + 1}">` +
        (subtitle ? `<h4 data-role="subtitle">${subtitle}</h4>` : '') +
        (narration ? `<p data-role="narration">${narration}</p>` : '') +
        (direction ? `<p data-role="direction"><em>${direction}</em></p>` : '') +
        `</section>`
      )
    })
    .join('\n\n')
}

/** Resolve the saved R2 URL for a (content, channel, language). */
export async function getChannelTranslationUrl(
  contentId: string,
  language: string,
  channel: ChannelKind
): Promise<string | null> {
  if (language === 'ko') return null
  const supabase = createClient()
  const { data } = await supabase
    .from('translations')
    .select('body')
    .eq('content_id', contentId)
    .eq('language', language)
    .eq('channel_type', channel)
    .eq('status', 'completed')
    .maybeSingle()
  return (data?.body as string) || null
}

export function languageLabel(lang: string): string {
  return LANG_NAMES[lang] || lang.toUpperCase()
}
