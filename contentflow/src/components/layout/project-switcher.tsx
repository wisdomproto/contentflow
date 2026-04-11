'use client'

import { useState } from 'react'
import { Plus, ChevronDown, Check, Trash2 } from 'lucide-react'
import { useProjectStore } from '@/stores/project-store'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { CreateProjectDialog } from '@/components/project/create-project-dialog'

export function ProjectSwitcher() {
  const { projects, selectedProjectId, selectProject, deleteProject } = useProjectStore()
  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <>
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
                className="flex-1 flex items-center gap-2 bg-accent/50 hover:bg-accent px-3 py-2 rounded-lg transition-colors"
              >
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                {selectedProject?.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-semibold truncate">
                  {selectedProject?.name || '프로젝트 선택'}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className="w-64">
            {projects.length === 0 && (
              <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                프로젝트가 없습니다
              </div>
            )}
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => selectProject(project.id)}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                  {project.name.charAt(0)}
                </div>
                <span className="flex-1 truncate">{project.name}</span>
                {project.id === selectedProjectId && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?`)) {
                      deleteProject(project.id)
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>새 프로젝트</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
