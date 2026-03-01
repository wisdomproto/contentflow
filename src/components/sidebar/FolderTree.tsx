'use client';

import { useFolderStore } from '@/stores/useFolderStore';
import { useContentStore } from '@/stores/useContentStore';
import { FolderItem } from './FolderItem';
import { ContentItem } from './ContentItem';
import { FolderPlus } from 'lucide-react';

export function FolderTree() {
  const folders = useFolderStore((s) => s.folders);
  const contents = useContentStore((s) => s.contents);

  const allFolderContentIds = new Set(folders.flatMap((f) => f.contentIds));
  const uncategorizedContents = Object.values(contents).filter(
    (c) => !c.folderId || !allFolderContentIds.has(c.id),
  );

  if (folders.length === 0 && uncategorizedContents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderPlus size={32} className="mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          폴더를 만들어
          <br />
          컨텐츠를 관리해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {folders.map((folder) => (
        <FolderItem key={folder.id} folder={folder} />
      ))}

      {uncategorizedContents.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
            📂 미분류
          </div>
          <div className="flex flex-col gap-0.5">
            {uncategorizedContents.map((content) => (
              <ContentItem key={content.id} content={content} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
