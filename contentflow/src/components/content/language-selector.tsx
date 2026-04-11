'use client'

import { useState, useEffect } from 'react'
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
  const { projects, selectedProjectId, selectedContentId, contents, getBaseArticle } = useProjectStore()
  const project = projects.find(p => p.id === selectedProjectId)

  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // WordPress 연결 상태를 localStorage에서 확인
  const [isWpConnected, setIsWpConnected] = useState(false)

  useEffect(() => {
    if (channel === 'wordpress' && selectedProjectId) {
      const saved = localStorage.getItem(`wp_credentials_${selectedProjectId}`)
      setIsWpConnected(!!saved)
    } else {
      setIsWpConnected(false)
    }
  }, [channel, selectedProjectId])

  const isConnected = channel === 'wordpress' ? isWpConnected : false
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

    if (channel === 'wordpress') {
      if (!selectedProjectId || !selectedContentId) {
        alert('발행할 콘텐츠를 선택해주세요')
        return
      }

      const credsRaw = localStorage.getItem(`wp_credentials_${selectedProjectId}`)
      if (!credsRaw) {
        setShowConnectDialog(true)
        return
      }

      let creds: { siteUrl: string; username: string; appPassword: string }
      try {
        creds = JSON.parse(credsRaw)
      } catch {
        alert('저장된 자격증명이 올바르지 않습니다')
        return
      }

      // 콘텐츠 제목과 본문 가져오기
      const contentMeta = contents.find(c => c.id === selectedContentId)
      const title = contentMeta?.title || 'Untitled'
      const baseArticle = getBaseArticle(selectedContentId)
      const body = baseArticle?.body || ''

      if (!body.trim()) {
        alert('발행할 본문이 없습니다. 기본글 탭에서 내용을 작성해주세요.')
        return
      }

      setPublishing(true)
      try {
        const res = await fetch('/api/publish/wordpress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            title,
            content: body,
            status: 'publish',
            siteUrl: creds.siteUrl,
            username: creds.username,
            applicationPassword: creds.appPassword,
          }),
        })
        const result = await res.json()
        if (result.success) {
          alert(`발행 성공!\n${result.url}`)
        } else {
          alert(`발행 실패: ${result.error}`)
        }
      } catch (err) {
        alert(`발행 오류: ${err}`)
      } finally {
        setPublishing(false)
      }
    }
  }

  async function handleScheduleConfirm() {
    if (!scheduleDate) return

    if (channel === 'wordpress') {
      if (!selectedProjectId || !selectedContentId) {
        alert('발행할 콘텐츠를 선택해주세요')
        return
      }

      const credsRaw = localStorage.getItem(`wp_credentials_${selectedProjectId}`)
      if (!credsRaw) {
        setShowConnectDialog(true)
        return
      }

      let creds: { siteUrl: string; username: string; appPassword: string }
      try {
        creds = JSON.parse(credsRaw)
      } catch {
        alert('저장된 자격증명이 올바르지 않습니다')
        return
      }

      const contentMeta = contents.find(c => c.id === selectedContentId)
      const title = contentMeta?.title || 'Untitled'
      const baseArticle = getBaseArticle(selectedContentId)
      const body = baseArticle?.body || ''

      const scheduledAt = `${scheduleDate}T${scheduleTime}:00`

      setPublishing(true)
      try {
        const res = await fetch('/api/publish/wordpress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            title,
            content: body,
            status: 'future',
            scheduledAt,
            siteUrl: creds.siteUrl,
            username: creds.username,
            applicationPassword: creds.appPassword,
          }),
        })
        const result = await res.json()
        if (result.success) {
          alert(`예약 발행 성공!\n예약 시간: ${scheduledAt}\n${result.url}`)
        } else {
          alert(`예약 실패: ${result.error}`)
        }
      } catch (err) {
        alert(`예약 오류: ${err}`)
      } finally {
        setPublishing(false)
        setShowSchedule(false)
      }
    } else {
      setShowSchedule(false)
    }
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
