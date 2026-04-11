'use client'

const CHANNELS = [
  { id: 'wordpress', name: 'WordPress', icon: 'W', color: 'bg-[#21759b]' },
  { id: 'instagram', name: 'Instagram', icon: 'IG', color: 'bg-gradient-to-br from-[#f09433] to-[#dc2743]' },
  { id: 'youtube', name: 'YouTube', icon: 'YT', color: 'bg-[#ff0000]' },
  { id: 'facebook', name: 'Facebook / Threads', icon: 'FB', color: 'bg-[#1877f2]' },
]

export function ChannelCards() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {CHANNELS.map(ch => (
        <div key={ch.id} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 ${ch.color} rounded-md flex items-center justify-center text-white text-xs font-bold`}>
              {ch.icon}
            </div>
            <div>
              <div className="text-sm font-semibold">{ch.name}</div>
              <div className="text-xs text-muted-foreground">● 미연결</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Phase 2에서 연결 예정</div>
        </div>
      ))}
    </div>
  )
}
