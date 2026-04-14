'use client'

import { Globe, Loader2 } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useChannelTranslation } from '@/hooks/use-channel-translation'
import type { ChannelKind } from '@/lib/channel-translator'

interface ChannelTranslationViewProps {
  contentId: string
  channel: ChannelKind
}

/**
 * Shown above each channel panel when a non-Korean language is selected.
 * Displays the translated HTML stored in R2, or a "not translated" hint.
 */
export function ChannelTranslationView({ contentId, channel }: ChannelTranslationViewProps) {
  const { selectedLanguage } = useUIStore()
  const { loading, html, missingFetch } = useChannelTranslation(contentId, channel, selectedLanguage)

  if (selectedLanguage === 'ko') return null

  return (
    <div className="rounded-lg border border-border bg-background mb-4">
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border text-xs">
        <Globe size={12} className="text-primary" />
        <span className="font-medium">{selectedLanguage.toUpperCase()} 번역본</span>
        {loading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        {!html && !loading && !missingFetch && (
          <span className="text-muted-foreground">
            번역되지 않음 — 상단 &quot;AI 번역&quot; 버튼을 눌러주세요
          </span>
        )}
        {missingFetch && (
          <span className="text-destructive">번역본을 불러오지 못했습니다</span>
        )}
      </div>
      {html ? (
        <div
          className="prose prose-sm dark:prose-invert max-w-none px-4 py-3"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : !loading ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          아직 번역본이 없습니다
        </div>
      ) : null}
    </div>
  )
}
