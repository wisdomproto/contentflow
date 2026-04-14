'use client'

import { useEffect, useState } from 'react'
import { getChannelTranslationUrl, type ChannelKind } from '@/lib/channel-translator'

export interface ChannelTranslationState {
  loading: boolean
  html: string | null
  /** True when a translation record exists but the HTML couldn't be fetched. */
  missingFetch: boolean
}

/**
 * Loads the translated HTML for a given (content, channel, language).
 * Returns `{ html: null }` when on Korean or when no translation exists.
 */
export function useChannelTranslation(
  contentId: string | null,
  channel: ChannelKind,
  language: string
): ChannelTranslationState {
  const [state, setState] = useState<ChannelTranslationState>({
    loading: false,
    html: null,
    missingFetch: false,
  })

  useEffect(() => {
    if (!contentId || language === 'ko') {
      setState({ loading: false, html: null, missingFetch: false })
      return
    }

    let cancelled = false
    setState({ loading: true, html: null, missingFetch: false })

    ;(async () => {
      const url = await getChannelTranslationUrl(contentId, language, channel)
      if (cancelled) return
      if (!url) {
        setState({ loading: false, html: null, missingFetch: false })
        return
      }
      try {
        const res = await fetch(`/api/storage/proxy?url=${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error('fetch failed')
        const html = await res.text()
        if (!cancelled) setState({ loading: false, html, missingFetch: false })
      } catch {
        if (!cancelled) setState({ loading: false, html: null, missingFetch: true })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [contentId, channel, language])

  return state
}
