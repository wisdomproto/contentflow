'use client'

import { useState } from 'react'
import { useProjectStore } from '@/stores/project-store'
import { useUIStore } from '@/stores/ui-store'
import { ContentTabs } from '@/components/content/content-tabs'
import { ContentListPanel } from '@/components/content/content-list-panel'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TargetLanguagesSection } from '@/components/project/target-languages-section'

const LANGUAGE_INFO: Record<string, { label: string; flag: string }> = {
  ko: { label: '한국어', flag: '🇰🇷' },
  en: { label: 'English', flag: '🇺🇸' },
  th: { label: 'ไทย', flag: '🇹🇭' },
  vi: { label: 'Tiếng Việt', flag: '🇻🇳' },
  ja: { label: '日本語', flag: '🇯🇵' },
  zh: { label: '中文', flag: '🇨🇳' },
  ms: { label: 'Bahasa Melayu', flag: '🇲🇾' },
  id: { label: 'Bahasa Indonesia', flag: '🇮🇩' },
}

export default function ContentPage() {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)
  const selectedContentId = useProjectStore((s) => s.selectedContentId)
  const projects = useProjectStore((s) => s.projects)
  const { selectedLanguage, setSelectedLanguage } = useUIStore()
  const [showLangDialog, setShowLangDialog] = useState(false)

  const project = projects.find(p => p.id === selectedProjectId)

  if (!selectedProjectId || !project) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        프로젝트를 선택하세요
      </div>
    )
  }

  const rawLanguages = project.target_languages ?? []
  const targetLanguages = rawLanguages.includes('ko')
    ? ['ko', ...rawLanguages.filter((l: string) => l !== 'ko')]
    : ['ko', ...rawLanguages]

  return (
    <div className="flex flex-col h-full">
      {/* Country/Language Tabs — top bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background shrink-0">
        <div className="flex bg-muted rounded-md overflow-hidden">
          {targetLanguages.map((lang: string) => {
            const info = LANGUAGE_INFO[lang] || { label: lang.toUpperCase(), flag: '🌐' }
            const isActive = selectedLanguage === lang

            return (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{info.flag}</span>
                <span>{info.label}</span>
              </button>
            )
          })}
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs gap-1 text-muted-foreground"
          onClick={() => setShowLangDialog(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          언어 추가
        </Button>
      </div>

      {/* Content area: list + editor */}
      <div className="flex flex-1 min-h-0">
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

      {/* Language Add Dialog */}
      <Dialog open={showLangDialog} onOpenChange={setShowLangDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>타겟 언어 관리</DialogTitle>
          </DialogHeader>
          <TargetLanguagesSection project={project} onUpdate={(updates) => {
            useProjectStore.getState().updateProject(project.id, updates)
          }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
