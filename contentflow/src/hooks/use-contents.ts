'use client'

import { useEffect, useState, useCallback } from 'react'
import { contentQueries } from '@/lib/supabase/queries'
import type { Content } from '@/types/database'

export function useContents(projectId: string | null) {
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!projectId) { setContents([]); setLoading(false); return }
    const { data } = await contentQueries.listByProject(projectId)
    if (data) setContents(data)
    setLoading(false)
  }, [projectId])

  useEffect(() => { refresh() }, [refresh])

  return { contents, loading, refresh }
}
