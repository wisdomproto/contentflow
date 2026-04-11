'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, FileText, MoreHorizontal, Trash2, Pencil } from 'lucide-react'
import { useProjectStore } from '@/stores/project-store'
import { CreateContentDialog } from '@/components/project/create-content-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { Content } from '@/types/database'

// --- Content Item ---

function ContentListItem({
  content,
  isSelected,
  onSelect,
}: {
  content: Content
  isSelected: boolean
  onSelect: () => void
}) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(content.title)
  const renameRef = useRef<HTMLInputElement>(null)
  const { updateContent, deleteContent } = useProjectStore()

  useEffect(() => {
    if (isRenaming) renameRef.current?.focus()
  }, [isRenaming])

  const handleRename = () => {
    if (renameValue.trim() && renameValue.trim() !== content.title) {
      updateContent(content.id, { title: renameValue.trim() })
    }
    setIsRenaming(false)
  }

  const statusLabel =
    content.status === 'draft'
      ? '초안'
      : content.status === 'in_progress'
        ? '작성중'
        : '게시완료'

  return (
    <div className="group flex items-center overflow-hidden">
      <button
        onClick={onSelect}
        className={cn(
          'flex-1 min-w-0 flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
          'hover:bg-accent',
          isSelected && 'bg-primary/10 dark:bg-primary/20'
        )}
      >
        <FileText size={14} className="shrink-0 text-muted-foreground" />
        {isRenaming ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') setIsRenaming(false)
            }}
            className="flex-1 min-w-0 text-sm bg-transparent outline-none border-b border-primary"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 min-w-0 text-left truncate" title={content.title}>
            {content.title}
          </span>
        )}
        <span
          className={cn(
            'text-[10px] px-1 py-0.5 rounded-full shrink-0',
            content.status === 'draft' && 'bg-muted text-muted-foreground',
            content.status === 'in_progress' &&
              'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
            content.status === 'published' &&
              'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
          )}
        >
          {statusLabel}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          <MoreHorizontal size={12} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          <DropdownMenuItem
            onClick={() => {
              setRenameValue(content.title)
              setIsRenaming(true)
            }}
          >
            <Pencil size={14} /> 이름 변경
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => deleteContent(content.id)}
          >
            <Trash2 size={14} /> 삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// --- Content List Panel ---

export function ContentListPanel() {
  const [createOpen, setCreateOpen] = useState(false)
  const {
    contents,
    selectedProjectId,
    selectedContentId,
    selectContent,
  } = useProjectStore()

  const projectContents = contents.filter((c) => c.project_id === selectedProjectId)

  return (
    <>
      <aside className="w-60 border-r border-border flex flex-col h-full bg-background shrink-0">
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">콘텐츠</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setCreateOpen(true)}
            title="새 콘텐츠"
          >
            <Plus size={14} />
          </Button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {projectContents.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              콘텐츠가 없습니다
              <br />
              <button
                onClick={() => setCreateOpen(true)}
                className="mt-2 text-primary hover:underline"
              >
                + 새 콘텐츠 만들기
              </button>
            </div>
          ) : (
            projectContents.map((content) => (
              <ContentListItem
                key={content.id}
                content={content}
                isSelected={selectedContentId === content.id}
                onSelect={() => selectContent(content.id)}
              />
            ))
          )}
        </div>

        {/* Footer: New Content Button */}
        {projectContents.length > 0 && (
          <div className="p-2 border-t border-border">
            <button
              onClick={() => setCreateOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Plus size={14} />
              <span>새 콘텐츠</span>
            </button>
          </div>
        )}
      </aside>

      <CreateContentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={selectedProjectId ?? ''}
      />
    </>
  )
}
