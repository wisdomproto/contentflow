'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface Issue {
  severity: string
  message: string
  engine: string
  fix_action?: string
}

const ENGINE_COLORS: Record<string, string> = {
  google: 'bg-blue-900/50 text-blue-400',
  naver: 'bg-green-900/50 text-green-400',
  geo: 'bg-purple-900/50 text-purple-400',
  tech: 'bg-gray-900/50 text-gray-400',
}

export function IssuesList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return <p className="text-sm text-muted-foreground text-center py-4">이슈 없음</p>

  return (
    <div className="space-y-1.5">
      {issues.map((issue, i) => (
        <div key={i} className="bg-card border border-border rounded-md px-3 py-2.5 flex items-center gap-2.5">
          <div className={cn('w-2 h-2 rounded-full shrink-0',
            issue.severity === 'critical' ? 'bg-red-500' : issue.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
          )} />
          <span className="text-sm flex-1">{issue.message}</span>
          <span className={cn('px-2 py-0.5 rounded text-[10px]', ENGINE_COLORS[issue.engine] || 'bg-muted text-muted-foreground')}>
            {issue.engine.toUpperCase()}
          </span>
          {issue.fix_action && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-primary">
              수정 →
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
