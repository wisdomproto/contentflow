'use client'

const COUNTRY_FLAGS: Record<string, string> = {
  'South Korea': '🇰🇷', 'Korea': '🇰🇷', 'Thailand': '🇹🇭',
  'United States': '🇺🇸', 'Vietnam': '🇻🇳', 'Japan': '🇯🇵',
  'China': '🇨🇳', 'Taiwan': '🇹🇼', 'India': '🇮🇳',
}

interface CountryRow {
  country: string
  sessions: number
  users: number
}

export function CountryTraffic({ data }: { data: CountryRow[] }) {
  if (!data.length) return null

  const total = data.reduce((sum, r) => sum + r.sessions, 0)

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3">국가별 트래픽</h3>
      <div className="space-y-2">
        {data.slice(0, 8).map(row => {
          const pct = total > 0 ? Math.round((row.sessions / total) * 100) : 0
          return (
            <div key={row.country} className="flex items-center gap-3 text-sm">
              <span className="text-base">{COUNTRY_FLAGS[row.country] || '🌐'}</span>
              <span className="flex-1">{row.country}</span>
              <span>{row.sessions.toLocaleString()} ({pct}%)</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
