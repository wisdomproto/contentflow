'use client'

import { useState } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { useProjectStore } from '@/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Send, Clock, Link2Off } from 'lucide-react'
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
  wordpress: 'WordPress',
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
  const { projects, selectedProjectId } = useProjectStore()
  const project = projects.find(p => p.id === selectedProjectId)

  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [showConnectDialog, setShowConnectDialog] = useState(false)

  const rawLanguages = project?.target_languages ?? []
  const targetLanguages = rawLanguages.includes('ko')
    ? ['ko', ...rawLanguages.filter((l) => l !== 'ko')]
    : ['ko', ...rawLanguages]

  if (targetLanguages.length <= 1) return null

  // TODO: check actual channel connections from DB
  const isConnected = false
  const channelLabel = channel ? (CHANNEL_LABELS[channel] || channel) : ''

  function handlePublishClick() {
    if (!isConnected) {
      setShowConnectDialog(true)
      return
    }
    // TODO: actual publish logic
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
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onTranslate?.(selectedLanguage)}>
              AI 번역
            </Button>
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
                    <Button size="sm" className="h-7 text-xs" onClick={() => setShowSchedule(false)}
                      disabled={!scheduleDate}>확인</Button>
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
                    >
                      <Clock className="w-3 h-3" /> 예약
                    </Button>
                    <Button
                      size="sm"
                      className={cn('h-7 text-xs gap-1', !isConnected && 'opacity-60')}
                      onClick={handlePublishClick}
                    >
                      <Send className="w-3 h-3" /> 발행
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
