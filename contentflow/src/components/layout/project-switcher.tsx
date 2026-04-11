'use client'

import { useProjectStore } from '@/stores/project-store'

export function ProjectSwitcher() {
  const { projects, selectedProjectId, selectProject } = useProjectStore()
  const selectedProject = projects.find(p => p.id === selectedProjectId)

  return (
    <div className="p-3 border-b border-border">
      <button
        className="w-full flex items-center gap-2 bg-accent/50 hover:bg-accent px-3 py-2 rounded-lg transition-colors"
        onClick={() => {/* TODO: dropdown */}}
      >
        <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
          {selectedProject?.name?.charAt(0) || '?'}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-semibold truncate">
            {selectedProject?.name || '프로젝트 선택'}
          </div>
        </div>
        <span className="text-muted-foreground text-xs">▼</span>
      </button>
    </div>
  )
}
