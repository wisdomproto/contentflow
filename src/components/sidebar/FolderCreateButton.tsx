'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useFolderStore } from '@/stores/useFolderStore';
import { useContentStore } from '@/stores/useContentStore';

export function FolderCreateButton() {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const createFolder = useFolderStore((s) => s.createFolder);
  const createContent = useContentStore((s) => s.createContent);
  const addContentToFolder = useFolderStore((s) => s.addContentToFolder);
  const setActiveContent = useContentStore((s) => s.setActiveContent);

  const handleCreate = () => {
    if (name.trim()) {
      const folderId = createFolder(name.trim());
      const contentId = createContent(folderId);
      addContentToFolder(folderId, contentId);
      setActiveContent(contentId);
      setName('');
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') {
      setIsCreating(false);
      setName('');
    }
  };

  if (isCreating) {
    return (
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!name.trim()) setIsCreating(false);
        }}
        placeholder="폴더명 입력..."
        className="h-8 w-full rounded-md border border-primary bg-background px-3 text-sm focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => setIsCreating(true)}
      className="flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <Plus size={16} />
      <span>새 폴더</span>
    </button>
  );
}
