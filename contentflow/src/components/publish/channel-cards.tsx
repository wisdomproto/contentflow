'use client'

import { useProjectStore } from '@/stores/project-store'
import { SelfHostedCard } from './self-hosted-card'

const CHANNELS = [
  { id: 'instagram', name: 'Instagram', icon: 'IG', color: 'bg-gradient-to-br from-[#f09433] to-[#dc2743]' },
  { id: 'youtube', name: 'YouTube', icon: 'YT', color: 'bg-[#ff0000]' },
  { id: 'facebook', name: 'Facebook / Threads', icon: 'FB', color: 'bg-[#1877f2]' },
]

export function ChannelCards() {
  const { selectedProjectId, projects } = useProjectStore()
  const project = projects.find(p => p.id === selectedProjectId)
  const metaConnected = !!project?.meta_credentials

  function isConnected(channelId: string) {
    if (channelId === 'instagram' || channelId === 'facebook') return metaConnected
    return false
  }

  return (
    <div className="grid grid-cols-4 gap-3">
      <SelfHostedCard />
      {CHANNELS.map(ch => {
        const connected = isConnected(ch.id)
        return (
          <div key={ch.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 ${ch.color} rounded-md flex items-center justify-center text-white text-xs font-bold`}>
                {ch.icon}
              </div>
              <div>
                <div className="text-sm font-semibold">{ch.name}</div>
                <div className={`text-xs ${connected ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {connected ? '● 연결됨' : '● 미연결'}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {connected ? '발행 준비 완료' : '설정에서 채널 연결'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
