'use client'

import { ChannelCards } from './channel-cards'
import { PublishQueue } from './publish-queue'
import { NaverCopySection } from './naver-copy-section'
import { Button } from '@/components/ui/button'

export function PublishDashboard() {
  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">발행 관리</h2>
          <p className="text-xs text-muted-foreground mt-0.5">연결된 채널과 발행 기록을 관리합니다</p>
        </div>
        <Button size="sm">+ 채널 연결</Button>
      </div>
      <ChannelCards />

      <PublishQueue />

      <NaverCopySection />
    </div>
  )
}
