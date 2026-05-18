'use client'

import { useState, useEffect } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { useProjectStore } from '@/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Send, Clock, Link2Off, Loader2 } from 'lucide-react'
import { GenerationButton } from './generation-button'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ChannelConnectionsSection } from '@/components/project/channel-connections-section'

const LANGUAGE_INFO: Record<string, { label: string; flag: string }> = {
  ko: { label: 'KO', flag: '🇰🇷' },
  en: { label: 'EN', flag: '🇺🇸' },
  th: { label: 'TH', flag: '🇹🇭' },
  vi: { label: 'VI', flag: '🇻🇳' },
  ja: { label: 'JA', flag: '🇯🇵' },
  zh: { label: 'ZH', flag: '🇨🇳' },
  ms: { label: 'MS', flag: '🇲🇾' },
  id: { label: 'ID', flag: '🇮🇩' },
}

const CHANNEL_LABELS: Record<string, string> = {
  naver_blog: 'N 블로그',
  instagram: 'Instagram',
  threads: 'Threads',
  youtube: 'YouTube',
}

interface LanguageSelectorProps {
  onTranslate?: (targetLang: string) => void
  translationStatuses?: Record<string, string>
  channel?: string  // current channel for publish buttons
}

export function LanguageSelector({ onTranslate, translationStatuses = {}, channel }: LanguageSelectorProps) {
  const { selectedLanguage, setSelectedLanguage } = useUIStore()
  const { projects, selectedProjectId, selectedContentId, contents } = useProjectStore()
  const project = projects.find(p => p.id === selectedProjectId)

  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // 연결 상태를 project DB 필드에서 확인
  const isMetaConnected = !!project?.meta_credentials

  const isConnected = (channel === 'instagram' || channel === 'facebook' || channel === 'threads') ? isMetaConnected
    : false
  const channelLabel = channel ? (CHANNEL_LABELS[channel] || channel) : ''

  const rawLanguages = project?.target_languages ?? []
  const targetLanguages = rawLanguages.includes('ko')
    ? ['ko', ...rawLanguages.filter((l) => l !== 'ko')]
    : ['ko', ...rawLanguages]

  if (targetLanguages.length <= 1) return null

  async function handlePublishClick() {
    if (!isConnected) {
      setShowConnectDialog(true)
      return
    }

    if (channel === 'instagram' || channel === 'facebook' || channel === 'threads') {
      if (!selectedProjectId || !selectedContentId) {
        alert('발행할 콘텐츠를 선택해주세요')
        return
      }

      const metaCreds = project?.meta_credentials
      if (!metaCreds) {
        setShowConnectDialog(true)
        return
      }

      const page = metaCreds.pages?.[0]
      if (!page) {
        alert('연결된 Facebook 페이지가 없습니다.')
        return
      }

      const contentMeta = contents.find(c => c.id === selectedContentId)

      setPublishing(true)
      try {
        const pageId = channel === 'instagram' ? page.instagram?.id
          : channel === 'threads' ? metaCreds.userId
          : page.id

        const res = await fetch('/api/publish/meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: channel,
            accessToken: page.pageAccessToken,
            pageId,
            caption: contentMeta?.title || '',
          }),
        })
        const result = await res.json()
        if (result.success) {
          const supabase = createClient()
          await supabase.from('publish_records').insert({
            content_id: selectedContentId,
            project_id: selectedProjectId,
            channel,
            language: selectedLanguage,
            status: 'published',
            published_at: new Date().toISOString(),
            platform_post_id: String(result.postId || ''),
            metadata: { title: contentMeta?.title },
          })
          alert(`${channel} 발행 성공!`)
        } else {
          alert(`발행 실패: ${result.error}`)
        }
      } catch (err) {
        alert(`발행 오류: ${err}`)
      } finally {
        setPublishing(false)
      }
      return
    }

  }

  async function handleScheduleConfirm() {
    if (!scheduleDate) return
    setShowSchedule(false)
  }

  function handleScheduleClick() {
    if (!isConnected) {
      setShowConnectDialog(true)
      return
    }
    setShowSchedule(true)
  }

  return (
    <>
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

        {/* Translation buttons (when non-ko selected) */}
        {selectedLanguage !== 'ko' && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs">
              원본 비교
            </Button>
            <GenerationButton
              variant="translate"
              size="sm"
              className="h-7 text-xs"
              isGenerating={translationStatuses[selectedLanguage] === 'translating'}
              onClick={() => onTranslate?.(selectedLanguage)}
            />
          </div>
        )}

        {/* Publish buttons (right side, always visible when channel exists) */}
        {channel && (
          <div className="ml-auto flex items-center gap-2">
            {channel === 'naver_blog' ? (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                📋 복사
              </Button>
            ) : (
              <>
                {showSchedule ? (
                  <div className="flex items-center gap-1.5">
                    <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                      className="h-7 w-32 text-xs" />
                    <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                      className="h-7 w-20 text-xs" />
                    <Button size="sm" className="h-7 text-xs" onClick={handleScheduleConfirm}
                      disabled={!scheduleDate || publishing}>
                      {publishing ? '처리 중...' : '확인'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowSchedule(false)}>
                      취소
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      size="sm" variant="outline"
                      className={cn('h-7 text-xs gap-1', !isConnected && 'opacity-60')}
                      onClick={handleScheduleClick}
                      disabled={publishing}
                    >
                      <Clock className="w-3 h-3" /> 예약
                    </Button>
                    <Button
                      size="sm"
                      className={cn('h-7 text-xs gap-1', !isConnected && 'opacity-60')}
                      onClick={handlePublishClick}
                      disabled={publishing}
                    >
                      <Send className="w-3 h-3" />
                      {publishing ? '발행 중...' : '발행'}
                    </Button>
                    {!isConnected && (
                      <Link2Off className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Channel Connection Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>채널 연결 필요</DialogTitle>
            <DialogDescription>
              {channelLabel}에 발행하려면 먼저 채널을 연결해야 합니다.
            </DialogDescription>
          </DialogHeader>
          <ChannelConnectionsSection />
        </DialogContent>
      </Dialog>
    </>
  )
}
