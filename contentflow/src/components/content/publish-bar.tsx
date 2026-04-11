'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Send, Clock, Link2, LinkOff } from 'lucide-react'

interface PublishBarProps {
  channel: string           // 'wordpress' | 'naver_blog' | 'instagram' | 'threads' | 'youtube'
  language: string          // 'ko' | 'en' | 'th' | 'vi' etc.
  isConnected: boolean      // whether channel is connected
  publishStatus?: 'draft' | 'scheduled' | 'published' | 'failed' | null
  publishedUrl?: string | null
  scheduledAt?: string | null
  onPublish?: () => void
  onSchedule?: (scheduledAt: string) => void
}

const CHANNEL_LABELS: Record<string, string> = {
  wordpress: 'WordPress',
  naver_blog: 'N 블로그',
  instagram: 'Instagram',
  facebook: 'Facebook',
  threads: 'Threads',
  youtube: 'YouTube',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: '임시저장', color: 'text-muted-foreground' },
  scheduled: { label: '예약됨', color: 'text-yellow-500' },
  published: { label: '발행됨', color: 'text-green-500' },
  failed: { label: '발행 실패', color: 'text-red-500' },
}

export function PublishBar({
  channel,
  language,
  isConnected,
  publishStatus,
  publishedUrl,
  scheduledAt,
  onPublish,
  onSchedule,
}: PublishBarProps) {
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')

  const channelLabel = CHANNEL_LABELS[channel] || channel
  const status = publishStatus ? STATUS_CONFIG[publishStatus] : null

  function handleSchedule() {
    if (scheduleDate && scheduleTime && onSchedule) {
      onSchedule(`${scheduleDate}T${scheduleTime}:00`)
      setShowSchedule(false)
    }
  }

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur px-4 py-2.5 flex items-center gap-3">
      {/* Channel + Language info */}
      <div className="flex items-center gap-2 min-w-0">
        {isConnected ? (
          <Link2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
        ) : (
          <LinkOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs text-muted-foreground truncate">
          {channelLabel} · {language.toUpperCase()}
        </span>
        {status && (
          <Badge variant="outline" className={cn('text-[10px] h-5', status.color)}>
            {status.label}
          </Badge>
        )}
        {publishedUrl && publishStatus === 'published' && (
          <a href={publishedUrl} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline truncate max-w-[150px]">
            {publishedUrl}
          </a>
        )}
        {scheduledAt && publishStatus === 'scheduled' && (
          <span className="text-[10px] text-yellow-500">
            {new Date(scheduledAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Schedule input (conditional) */}
      {showSchedule && (
        <div className="flex items-center gap-2">
          <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
            className="h-7 w-36 text-xs" />
          <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
            className="h-7 w-24 text-xs" />
          <Button size="sm" className="h-7 text-xs" onClick={handleSchedule}
            disabled={!scheduleDate}>
            예약 확인
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowSchedule(false)}>
            취소
          </Button>
        </div>
      )}

      {/* Action buttons */}
      {!showSchedule && (
        <div className="flex items-center gap-2">
          {channel === 'naver_blog' ? (
            // Naver: copy only (no auto publish)
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
              📋 네이버 포맷 복사
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={() => setShowSchedule(true)}
                disabled={!isConnected}
                title={!isConnected ? '채널 연결이 필요합니다' : ''}
              >
                <Clock className="w-3 h-3" />
                예약
              </Button>
              <Button
                size="sm"
                className={cn(
                  'h-7 text-xs gap-1.5',
                  !isConnected && 'opacity-50'
                )}
                onClick={onPublish}
                disabled={!isConnected}
                title={!isConnected ? '채널 연결이 필요합니다' : ''}
              >
                <Send className="w-3 h-3" />
                발행
              </Button>
            </>
          )}
          {!isConnected && channel !== 'naver_blog' && (
            <span className="text-[10px] text-muted-foreground">채널 연결 필요</span>
          )}
        </div>
      )}
    </div>
  )
}
