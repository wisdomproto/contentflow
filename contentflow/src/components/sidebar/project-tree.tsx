'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  FolderOpen, FolderClosed, FileText, Plus, ChevronRight, ChevronDown,
  MoreHorizontal, Search, Filter, ArrowUpDown, Pencil, Settings, Copy,
  Trash2, PanelLeftClose, PanelLeft, Target, BarChart3, Upload, FileBarChart,
} from 'lucide-react';
import { StrategyImportDialog } from '@/components/strategy/strategy-import-dialog';
import { WeeklyReportDialog } from '@/components/report/weekly-report-dialog';
import { useProjectStore } from '@/stores/project-store';
import { cn } from '@/lib/utils';
import type { Content } from '@/types/database';
import { CreateProjectDialog } from '@/components/project/create-project-dialog';
import { CreateContentDialog } from '@/components/project/create-content-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { Project } from '@/types/database';

// --- Content Item ---

function ContentItem({
  content,
  isSelected,
  onSelect,
}: {
  content: Content;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(content.title);
  const renameRef = useRef<HTMLInputElement>(null);
  const { updateContent, deleteContent } = useProjectStore();

  useEffect(() => {
    if (isRenaming) renameRef.current?.focus();
  }, [isRenaming]);

  const handleRename = () => {
    if (renameValue.trim() && renameValue.trim() !== content.title) {
      updateContent(content.id, { title: renameValue.trim() });
    }
    setIsRenaming(false);
  };

  const statusLabel = content.status === 'draft' ? '초안' : content.status === 'in_progress' ? '작성중' : '게시완료';

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
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            className="flex-1 min-w-0 text-sm bg-transparent outline-none border-b border-primary"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 min-w-0 text-left truncate" title={content.title}>{content.title}</span>
        )}
        <span className={cn(
          'text-[10px] px-1 py-0.5 rounded-full shrink-0',
          content.status === 'draft' && 'bg-muted text-muted-foreground',
          content.status === 'in_progress' && 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
          content.status === 'published' && 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
        )}>
          {statusLabel}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              className="shrink-0 p-1 rounded hover:bg-accent transition-colors"
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          <MoreHorizontal size={12} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          <DropdownMenuItem onClick={() => { setRenameValue(content.title); setIsRenaming(true); }}>
            <Pencil size={14} /> 이름 변경
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => deleteContent(content.id)}>
            <Trash2 size={14} /> 삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// --- Project Item ---

function ProjectItem({
  project,
  contents,
  isSelected,
  selectedContentId,
  onSelectContent,
  onCreateContent,
}: {
  project: Project;
  contents: Content[];
  isSelected: boolean;
  selectedContentId: string | null;
  onSelectContent: (id: string) => void;
  onCreateContent: (projectId: string) => void;
}) {
  const [expanded, setExpanded] = useState(isSelected);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.name);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);
  const { selectProject, updateProject, deleteProject, duplicateProject, openProjectSettings, openStrategy, showStrategy, openAnalytics, showAnalytics } = useProjectStore();

  useEffect(() => {
    if (isRenaming) renameRef.current?.focus();
  }, [isRenaming]);

  useEffect(() => {
    if (isSelected && !expanded) setExpanded(true);
  }, [isSelected]);

  const handleToggle = () => {
    if (expanded) {
      setExpanded(false);
    } else {
      setExpanded(true);
      selectProject(project.id);
    }
  };

  const handleRename = () => {
    if (renameValue.trim() && renameValue.trim() !== project.name) {
      updateProject(project.id, { name: renameValue.trim() });
    }
    setIsRenaming(false);
  };

  return (
    <div>
      <div className="group flex items-center">
        <button
          onClick={handleToggle}
          className={cn(
            'flex-1 flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
            'hover:bg-accent',
            isSelected && 'bg-primary/10 dark:bg-primary/20'
          )}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {expanded ? <FolderOpen size={16} className="text-primary" /> : <FolderClosed size={16} className="text-muted-foreground" />}
          {isRenaming ? (
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsRenaming(false);
              }}
              className="flex-1 text-sm bg-transparent outline-none border-b border-primary font-medium"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 text-left truncate font-medium">{project.name}</span>
          )}
          <span className="text-xs text-muted-foreground">{contents.length}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
                onClick={(e) => e.stopPropagation()}
              />
            }
          >
            <MoreHorizontal size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem onClick={() => { setRenameValue(project.name); setIsRenaming(true); }}>
              <Pencil size={14} /> 이름 변경
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openProjectSettings(project.id)}>
              <Settings size={14} /> 설정
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicateProject(project.id)}>
              <Copy size={14} /> 복제
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => deleteProject(project.id)}>
              <Trash2 size={14} /> 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showImportDialog && (
        <StrategyImportDialog
          projectId={project.id}
          onClose={() => setShowImportDialog(false)}
        />
      )}

      {showReportDialog && (
        <WeeklyReportDialog
          projectId={project.id}
          onClose={() => setShowReportDialog(false)}
        />
      )}

      {expanded && (
        <div className="ml-4 pl-2 border-l border-border">
          {/* 마케팅 전략 + 임포트 */}
          <div className="flex items-center">
            <button
              onClick={() => openStrategy(project.id)}
              className={cn(
                'flex-1 flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
                'hover:bg-accent',
                isSelected && showStrategy && 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              )}
            >
              <Target size={14} className="shrink-0 text-emerald-600" />
              <span className="flex-1 text-left truncate font-medium">마케팅 전략</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowImportDialog(true); }}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
              title="전략 HTML 임포트"
            >
              <Upload size={12} />
            </button>
          </div>
          {/* 사이트 분석 고정 항목 */}
          <button
            onClick={() => openAnalytics(project.id)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
              'hover:bg-accent',
              isSelected && showAnalytics && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            )}
          >
            <BarChart3 size={14} className="shrink-0 text-blue-600" />
            <span className="flex-1 text-left truncate font-medium">사이트 분석</span>
          </button>
          {/* 주간 보고서 */}
          <button
            onClick={() => setShowReportDialog(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors hover:bg-accent"
          >
            <FileBarChart size={14} className="shrink-0 text-amber-600" />
            <span className="flex-1 text-left truncate font-medium">주간 보고서</span>
          </button>
          {contents.map((content) => (
            <ContentItem
              key={content.id}
              content={content}
              isSelected={selectedContentId === content.id}
              onSelect={() => onSelectContent(content.id)}
            />
          ))}
          <button
            onClick={() => onCreateContent(project.id)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Plus size={14} />
            <span>새 컨텐츠</span>
          </button>
        </div>
      )}
    </div>
  );
}

// --- Main Sidebar ---

export function ProjectTree() {
  const {
    projects, selectedProjectId, selectedContentId, contents,
    selectContent, sidebarCollapsed, toggleSidebar,
    searchQuery, setSearchQuery, filterStatus, setFilterStatus,
    sortBy, setSortBy, sortOrder, setSortOrder,
  } = useProjectStore();

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createContentOpen, setCreateContentOpen] = useState(false);
  const [createContentProjectId, setCreateContentProjectId] = useState('');

  const handleCreateContent = (projectId: string) => {
    setCreateContentProjectId(projectId);
    setCreateContentOpen(true);
  };

  // Filter and sort projects/contents
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();

    return projects
      .map((project) => {
        let projectContents = contents.filter((c) => c.project_id === project.id);

        // Apply status filter
        if (filterStatus !== 'all') {
          projectContents = projectContents.filter((c) => c.status === filterStatus);
        }

        // Apply search
        if (q) {
          projectContents = projectContents.filter((c) => c.title.toLowerCase().includes(q));
        }

        const projectMatches = !q || project.name.toLowerCase().includes(q);

        return { project, contents: projectContents, visible: projectMatches || projectContents.length > 0 };
      })
      .filter((item) => item.visible)
      .sort((a, b) => {
        if (sortBy === 'name') {
          const cmp = a.project.name.localeCompare(b.project.name, 'ko');
          return sortOrder === 'asc' ? cmp : -cmp;
        }
        const dateA = new Date(a.project.updated_at).getTime();
        const dateB = new Date(b.project.updated_at).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
  }, [projects, contents, searchQuery, filterStatus, sortBy, sortOrder]);

  if (sidebarCollapsed) {
    return (
      <aside className="h-full border-r border-border flex flex-col items-center py-3 px-1 bg-background">
        <Tooltip>
          <TooltipTrigger render={<button className="p-2 rounded-lg hover:bg-accent" onClick={toggleSidebar} />}>
            <PanelLeft size={18} />
          </TooltipTrigger>
          <TooltipContent side="right">사이드바 열기</TooltipContent>
        </Tooltip>
      </aside>
    );
  }

  return (
    <>
      <aside className={cn('w-72 h-full border-r border-border flex flex-col bg-background')}>
        {/* Header: New Project + Collapse */}
        <div className="p-3 flex items-center gap-2">
          <button
            onClick={() => setCreateProjectOpen(true)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
            )}
          >
            <Plus size={16} />
            새 프로젝트
          </button>
          <Tooltip>
            <TooltipTrigger render={<button className="p-2 rounded-lg hover:bg-accent shrink-0" onClick={toggleSidebar} />}>
              <PanelLeftClose size={16} />
            </TooltipTrigger>
            <TooltipContent side="right">사이드바 닫기</TooltipContent>
          </Tooltip>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchQuery || filterStatus !== 'all' ? '검색 결과 없음' : '프로젝트가 없습니다'}
            </div>
          ) : (
            filteredData.map(({ project, contents: projectContents }) => (
              <ProjectItem
                key={project.id}
                project={project}
                contents={projectContents}
                isSelected={selectedProjectId === project.id}
                selectedContentId={selectedContentId}
                onSelectContent={selectContent}
                onCreateContent={handleCreateContent}
              />
            ))
          )}
        </div>

        {/* Search / Filter / Sort */}
        <div className="p-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm bg-muted">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none flex-1 text-sm"
              />
            </div>
            {/* Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className={cn(
                    'p-1.5 rounded-md hover:bg-accent relative',
                    filterStatus !== 'all' && 'text-primary'
                  )} />
                }
              >
                <Filter size={14} />
                {filterStatus !== 'all' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                  전체 {filterStatus === 'all' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('draft')}>
                  초안 {filterStatus === 'draft' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('in_progress')}>
                  작성중 {filterStatus === 'in_progress' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('published')}>
                  게시완료 {filterStatus === 'published' && '✓'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger render={<button className="p-1.5 rounded-md hover:bg-accent" />}>
                <ArrowUpDown size={14} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('asc'); }}>
                  이름순 (ㄱ→ㅎ) {sortBy === 'name' && sortOrder === 'asc' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('desc'); }}>
                  이름순 (ㅎ→ㄱ) {sortBy === 'name' && sortOrder === 'desc' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setSortBy('date'); setSortOrder('desc'); }}>
                  최신순 {sortBy === 'date' && sortOrder === 'desc' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('date'); setSortOrder('asc'); }}>
                  오래된순 {sortBy === 'date' && sortOrder === 'asc' && '✓'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Dialogs */}
      <CreateProjectDialog open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
      <CreateContentDialog
        open={createContentOpen}
        onOpenChange={setCreateContentOpen}
        projectId={createContentProjectId}
      />
    </>
  );
}
