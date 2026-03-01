'use client';

import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Settings, Plus } from 'lucide-react';
import { useFolderStore } from '@/stores/useFolderStore';
import { useContentStore } from '@/stores/useContentStore';
import { useUIStore } from '@/stores/useUIStore';
import { ContentItem } from './ContentItem';
import type { Folder } from '@/types/folder';

interface FolderItemProps {
  folder: Folder;
}

export function FolderItem({ folder }: FolderItemProps) {
  const activeFolderId = useFolderStore((s) => s.activeFolderId);
  const setActiveFolder = useFolderStore((s) => s.setActiveFolder);
  const toggleFolderExpand = useFolderStore((s) => s.toggleFolderExpand);
  const addContentToFolder = useFolderStore((s) => s.addContentToFolder);
  const openFolderDrawer = useUIStore((s) => s.openFolderDrawer);
  const contents = useContentStore((s) => s.contents);
  const createContent = useContentStore((s) => s.createContent);
  const setActiveContent = useContentStore((s) => s.setActiveContent);

  const isActive = activeFolderId === folder.id;
  const folderContents = folder.contentIds
    .map((id) => contents[id])
    .filter(Boolean);

  const handleFolderClick = () => {
    setActiveFolder(folder.id);
    toggleFolderExpand(folder.id);
  };

  const handleAddContent = (e: React.MouseEvent) => {
    e.stopPropagation();
    const contentId = createContent(folder.id);
    addContentToFolder(folder.id, contentId);
    setActiveContent(contentId);
  };

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    openFolderDrawer(folder.id);
  };

  return (
    <div className="mb-1">
      <div
        onClick={handleFolderClick}
        className={cn(
          'group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors',
          isActive ? 'bg-accent' : 'hover:bg-muted',
        )}
      >
        {folder.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span style={{ color: folder.settings.color }}>{folder.settings.icon}</span>
        <span className="flex-1 truncate font-medium">{folder.settings.name}</span>
        <span className="text-xs text-muted-foreground">({folderContents.length})</span>

        <button
          onClick={handleAddContent}
          className="rounded p-0.5 opacity-0 hover:bg-muted-foreground/10 group-hover:opacity-100"
          title="새 컨텐츠"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={handleSettings}
          className="rounded p-0.5 opacity-0 hover:bg-muted-foreground/10 group-hover:opacity-100"
          title="폴더 설정"
        >
          <Settings size={14} />
        </button>
      </div>

      {folder.isExpanded && (
        <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
          {folderContents.map((content) => (
            <ContentItem key={content.id} content={content} />
          ))}
        </div>
      )}
    </div>
  );
}
