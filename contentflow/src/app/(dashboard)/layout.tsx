'use client'

import { useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { useAuth } from '@/hooks/use-auth'
import { useProjectStore } from '@/stores/project-store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const loadFromSupabase = useProjectStore((s) => s.loadFromSupabase)

  // Load data from Supabase when user is authenticated
  useEffect(() => {
    if (user && loadFromSupabase) {
      loadFromSupabase()
    }
  }, [user, loadFromSupabase])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">로딩중...</div>
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
