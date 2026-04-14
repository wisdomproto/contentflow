'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { useAuth } from '@/hooks/use-auth'
import { useProjectStore } from '@/stores/project-store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const loadFromSupabase = useProjectStore((s) => s.loadFromSupabase)
  const [dataLoading, setDataLoading] = useState(false)
  const projects = useProjectStore((s) => s.projects)

  useEffect(() => {
    if (user && loadFromSupabase) {
      setDataLoading(true)
      loadFromSupabase().finally(() => setDataLoading(false))
    }
  }, [user, loadFromSupabase])

  if (loading || (dataLoading && projects.length === 0)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-muted-foreground text-sm">데이터 로딩중...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
