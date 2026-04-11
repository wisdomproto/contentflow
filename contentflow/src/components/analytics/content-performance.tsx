'use client'

interface ContentRow {
  path: string
  sessions: number
  avgDuration: number
  bounceRate: number
}

export function ContentPerformance({ data }: { data: ContentRow[] }) {
  if (!data.length) return null

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3">콘텐츠별 유입 기여</h3>
      <div className="space-y-2">
        {data.slice(0, 10).map((row, i) => (
          <div key={row.path} className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground w-5 text-right">{i + 1}</span>
            <span className="flex-1 truncate">{row.path}</span>
            <span className="text-green-400 text-xs">{row.sessions.toLocaleString()} 세션</span>
          </div>
        ))}
      </div>
    </div>
  )
}
