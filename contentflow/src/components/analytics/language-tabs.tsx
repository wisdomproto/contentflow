'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/project-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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

const ALL_LANGUAGES = Object.entries(LANGUAGE_INFO).map(([code, info]) => ({ code, ...info }))

interface AnalyticsLanguageTabsProps {
  selectedLang: string
  onLangChange: (lang: string) => void
}

export function AnalyticsLanguageTabs({ selectedLang, onLangChange }: AnalyticsLanguageTabsProps) {
  const { projects, selectedProjectId, updateProject } = useProjectStore()
  const project = projects.find(p => p.id === selectedProjectId)
  const [showDialog, setShowDialog] = useState(false)

  const rawLanguages: string[] = (project?.target_languages as string[]) ?? []
  const targetLanguages = rawLanguages.includes('ko')
    ? ['ko', ...rawLanguages.filter((l: string) => l !== 'ko')]
    : ['ko', ...rawLanguages]

  function toggleLanguage(code: string) {
    if (code === 'ko') return // ko is always included
    const current: string[] = (project?.target_languages as string[]) ?? []
    const next = current.includes(code)
      ? current.filter(l => l !== code)
      : [...current, code]
    if (selectedProjectId) {
      updateProject(selectedProjectId, { target_languages: next } as any)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1 mb-4">
        <div className="flex bg-muted rounded-md overflow-hidden">
          {targetLanguages.map((lang: string) => {
            const info = LANGUAGE_INFO[lang] || { label: lang.toUpperCase(), flag: '🌐' }
            return (
              <button
                key={lang}
                onClick={() => onLangChange(lang)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
                  selectedLang === lang
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
          onClick={() => setShowDialog(true)}
        >
          <Plus className="w-3.5 h-3.5" /> 언어 추가
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>타겟 언어 관리</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              분석할 언어를 선택하세요. 한국어는 기본 포함됩니다.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_LANGUAGES.map(({ code, label, flag }) => {
                const current: string[] = (project?.target_languages as string[]) ?? []
                const isActive = code === 'ko' || current.includes(code)
                return (
                  <button
                    key={code}
                    onClick={() => toggleLanguage(code)}
                    disabled={code === 'ko'}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 border-primary/40 text-foreground'
                        : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-border/80',
                      code === 'ko' && 'opacity-70 cursor-not-allowed'
                    )}
                  >
                    <span className="text-base">{flag}</span>
                    <span className="flex-1 text-left">{label}</span>
                    {isActive && code !== 'ko' && (
                      <X className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                )
              })}
            </div>
            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={() => setShowDialog(false)}>완료</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
