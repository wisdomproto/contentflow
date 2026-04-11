'use client'

import { useProjectStore } from '@/stores/project-store'
import { ContentTabs } from '@/components/content/content-tabs'
import { ProjectSettings } from '@/components/project/project-settings'

export default function ContentPage() {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)
  const selectedContentId = useProjectStore((s) => s.selectedContentId)
  const showProjectSettings = useProjectStore((s) => s.showProjectSettings)
  const projects = useProjectStore((s) => s.projects)

  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        좌측에서 프로젝트를 선택하세요
      </div>
    )
  }

  if (showProjectSettings || !selectedContentId) {
    const project = projects.find((p) => p.id === selectedProjectId)
    if (!project) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          좌측에서 프로젝트를 선택하세요
        </div>
      )
    }
    return <ProjectSettings project={project} />
  }

  return <ContentTabs />
}
