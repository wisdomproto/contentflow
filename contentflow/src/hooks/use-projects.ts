'use client'

import { useEffect, useState, useCallback } from 'react'
import { projectQueries } from '@/lib/supabase/queries'
import type { Project } from '@/types/database'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data } = await projectQueries.list()
    if (data) setProjects(data)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { projects, loading, refresh }
}

export function useProject(id: string | null) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setProject(null); setLoading(false); return }
    projectQueries.get(id).then(({ data }) => {
      setProject(data)
      setLoading(false)
    })
  }, [id])

  return { project, loading }
}
