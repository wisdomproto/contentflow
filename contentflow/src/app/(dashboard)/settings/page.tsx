'use client'

import { useProjectStore } from '@/stores/project-store'
import { ProjectSettings } from '@/components/project/project-settings'

export default function SettingsPage() {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)
  const projects = useProjectStore((s) => s.projects)

  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        프로젝트를 선택하세요
      </div>
    )
  }

  const project = projects.find((p) => p.id === selectedProjectId)
  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        프로젝트를 선택하세요
      </div>
    )
  }

  return <ProjectSettings project={project} />
}
