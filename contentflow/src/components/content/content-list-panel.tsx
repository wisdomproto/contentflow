'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, FileText, MoreHorizontal, Trash2, Pencil, GripVertical, Check, Filter } from 'lucide-react'
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
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Content } from '@/types/database'

const CAT_COLORS: Record<string, string> = {
  'A': 'bg-blue-500/20 text-blue-400',
  'B': 'bg-pink-500/20 text-pink-400',
  'C': 'bg-green-500/20 text-green-400',
  'D': 'bg-orange-500/20 text-orange-400',
  'E': 'bg-purple-500/20 text-purple-400',
}

function getCatLetter(category: string | null): string {
  return category?.charAt(0) || ''
}

// --- Sortable Content Item ---

function SortableContentItem({
  content, isSelected, onSelect,
}: {
  content: Content; isSelected: boolean; onSelect: () => void
}) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(content.title)
  const renameRef = useRef<HTMLInputElement>(null)
  const { updateContent, deleteContent } = useProjectStore()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: content.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  useEffect(() => { if (isRenaming) renameRef.current?.focus() }, [isRenaming])

  const handleRename = () => {
    if (renameValue.trim() && renameValue.trim() !== content.title) {
      updateContent(content.id, { title: renameValue.trim() })
    }
    setIsRenaming(false)
  }

  const catLetter = getCatLetter(content.category)
  const confirmed = (content as any).confirmed

  return (
    <div ref={setNodeRef} style={style} className={cn('group flex items-center overflow-hidden rounded-lg', confirmed && 'ring-1 ring-green-500/30')}>
      {/* Drag handle */}
      <button {...attributes} {...listeners} className="shrink-0 px-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground">
        <GripVertical size={12} />
      </button>

      <button
        onClick={onSelect}
        className={cn(
          'flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1.5 text-sm transition-colors rounded-lg',
          'hover:bg-accent',
          isSelected && 'bg-primary/10 dark:bg-primary/20',
          confirmed && 'bg-green-500/5',
        )}
      >
        {/* Category badge */}
        {catLetter ? (
          <span className={cn('text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center shrink-0', CAT_COLORS[catLetter] || 'bg-muted text-muted-foreground')}>
            {catLetter}
          </span>
        ) : (
          <FileText size={14} className="shrink-0 text-muted-foreground" />
        )}

        {/* Confirmed icon */}
        {confirmed && <Check size={10} className="shrink-0 text-green-500" />}

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
          <span className="flex-1 min-w-0 text-left truncate text-xs" title={content.title}>
            {content.topic ? `${content.topic} ` : ''}{content.title}
          </span>
        )}
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
          <DropdownMenuItem onClick={() => { setRenameValue(content.title); setIsRenaming(true) }}>
            <Pencil size={14} /> 이름 변경
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => deleteContent(content.id)}>
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
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const {
    contents, selectedProjectId, selectedContentId,
    selectContent, reorderContents,
  } = useProjectStore()

  const projectContents = contents
    .filter((c) => c.project_id === selectedProjectId)
    .sort((a, b) => a.sort_order - b.sort_order)

  const filteredContents = catFilter
    ? projectContents.filter(c => c.category?.startsWith(catFilter))
    : projectContents

  // Categories present in this project
  const categories = [...new Set(projectContents.map(c => c.category).filter(Boolean))] as string[]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = filteredContents.findIndex(c => c.id === active.id)
    const newIdx = filteredContents.findIndex(c => c.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(filteredContents, oldIdx, newIdx)
    reorderContents(reordered.map(c => c.id))
  }

  const confirmedCount = projectContents.filter(c => (c as any).confirmed).length

  return (
    <>
      <aside className="w-64 border-r border-border flex flex-col h-full bg-background shrink-0">
        {/* Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">콘텐츠 <span className="text-muted-foreground font-normal">({projectContents.length})</span></span>
            <div className="flex gap-1">
              {confirmedCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-500">{confirmedCount} 컨펌</span>
              )}
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setCreateOpen(true)} title="새 콘텐츠">
                <Plus size={14} />
              </Button>
            </div>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setCatFilter(null)}
                className={cn('text-[10px] px-1.5 py-0.5 rounded transition-colors',
                  !catFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >전체</button>
              {categories.sort().map(cat => (
                <button
                  key={cat}
                  onClick={() => setCatFilter(catFilter === cat.charAt(0) ? null : cat.charAt(0))}
                  className={cn('text-[10px] px-1.5 py-0.5 rounded transition-colors',
                    catFilter === cat.charAt(0) ? 'bg-primary text-primary-foreground' : CAT_COLORS[cat.charAt(0)] || 'bg-muted text-muted-foreground'
                  )}
                >{cat.charAt(0)}</button>
              ))}
            </div>
          )}
        </div>

        {/* Content List with DnD */}
        <div className="flex-1 overflow-y-auto px-1 py-2 space-y-0.5">
          {filteredContents.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              콘텐츠가 없습니다
              <br />
              <button onClick={() => setCreateOpen(true)} className="mt-2 text-primary hover:underline">
                + 새 콘텐츠 만들기
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredContents.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {filteredContents.map((content) => (
                  <SortableContentItem
                    key={content.id}
                    content={content}
                    isSelected={selectedContentId === content.id}
                    onSelect={() => selectContent(content.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </aside>

      <CreateContentDialog open={createOpen} onOpenChange={setCreateOpen} projectId={selectedProjectId ?? ''} />
    </>
  )
}
