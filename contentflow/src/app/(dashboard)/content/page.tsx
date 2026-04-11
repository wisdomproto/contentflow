'use client'

import { useProjectStore } from '@/stores/project-store'
import { ContentTabs } from '@/components/content/content-tabs'
import { ContentListPanel } from '@/components/content/content-list-panel'

export default function ContentPage() {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)
  const selectedContentId = useProjectStore((s) => s.selectedContentId)

  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        프로젝트를 선택하세요
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <ContentListPanel />
      <div className="flex-1 overflow-auto">
        {selectedContentId ? (
          <ContentTabs />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground h-full">
            <div className="text-center">
              <p className="text-4xl mb-4">📝</p>
              <p className="text-sm">콘텐츠를 선택하거나 새로 만들어주세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
