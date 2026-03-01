'use client';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { FolderTree } from '@/components/sidebar/FolderTree';
import { SearchBar } from '@/components/sidebar/SearchBar';
import { FolderCreateButton } from '@/components/sidebar/FolderCreateButton';

export function Sidebar() {
  const isOpen = useUIStore((s) => s.isSidebarOpen);

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-background transition-all duration-200',
        isOpen ? 'w-sidebar' : 'w-0 overflow-hidden',
      )}
    >
      <div className="flex flex-col gap-2 p-3">
        <SearchBar />
        <FolderCreateButton />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <FolderTree />
      </div>
    </aside>
  );
}
