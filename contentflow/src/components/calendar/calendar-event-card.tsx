'use client'

const CHANNEL_COLORS: Record<string, string> = {
  wordpress: 'bg-[#21759b]',
  instagram: 'bg-[#c13584]',
  facebook: 'bg-[#1877f2]',
  threads: 'bg-foreground',
  youtube: 'bg-[#ff0000]',
  naver_blog: 'bg-[#03c75a]',
}

const LANG_FLAGS: Record<string, string> = {
  ko: '🇰🇷', en: '🇺🇸', th: '🇹🇭', vi: '🇻🇳', ja: '🇯🇵', zh: '🇨🇳',
}

interface CalendarEventCardProps {
  channel: string
  language: string
  title: string
  status: string
}

export function CalendarEventCard({ channel, language, title, status }: CalendarEventCardProps) {
  const flag = LANG_FLAGS[language] || '🌐'
  const color = CHANNEL_COLORS[channel] || 'bg-muted'

  return (
    <div className={`${color} rounded px-1.5 py-1 mb-0.5 cursor-pointer hover:opacity-80 transition-opacity`}>
      <div className="text-[9px] text-white/70">{flag} {channel}</div>
      <div className="text-[10px] text-white truncate">{title}</div>
    </div>
  )
}
