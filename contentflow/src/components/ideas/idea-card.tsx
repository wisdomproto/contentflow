'use client'

import { Button } from '@/components/ui/button'

interface IdeaCardProps {
  channel: string
  title: string
  structure: string
  outline: string[]
  onGenerate: () => void
  onSave: () => void
}

const CHANNEL_ICONS: Record<string, string> = {
  blog: '📰', cardnews: '🖼️', youtube: '🎬', threads: '💬', instagram: '📸',
}

export function IdeaCard({ channel, title, structure, outline, onGenerate, onSave }: IdeaCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{CHANNEL_ICONS[channel] || '📝'}</span>
        <span className="text-xs text-muted-foreground capitalize">{channel}:</span>
        <span className="text-sm font-medium flex-1">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{structure}</p>
      {outline.length > 0 && (
        <ul className="text-xs text-muted-foreground mb-3 space-y-0.5 pl-4 list-disc">
          {outline.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={onGenerate}>생성 →</Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSave}>보관</Button>
      </div>
    </div>
  )
}
