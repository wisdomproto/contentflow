'use client'

import { ChannelCards } from './channel-cards'
import { PublishQueue } from './publish-queue'
import { NaverCopySection } from './naver-copy-section'
import { Button } from '@/components/ui/button'

export function PublishDashboard() {
  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">연결된 채널</h2>
        <Button size="sm">+ 채널 연결</Button>
      </div>
      <ChannelCards />

      <PublishQueue />

      <NaverCopySection />
    </div>
  )
}
