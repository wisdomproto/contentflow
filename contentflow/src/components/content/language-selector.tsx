'use client'

import { useUIStore } from '@/stores/ui-store'
import { useProjectStore } from '@/stores/project-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const LANGUAGE_INFO: Record<string, { label: string; flag: string }> = {
  ko: { label: 'KO', flag: '🇰🇷' },
  en: { label: 'EN', flag: '🇺🇸' },
  th: { label: 'TH', flag: '🇹🇭' },
  vi: { label: 'VI', flag: '🇻🇳' },
  ja: { label: 'JA', flag: '🇯🇵' },
  zh: { label: 'ZH', flag: '🇨🇳' },
  ms: { label: 'MS', flag: '🇲🇾' },
  id: { label: 'ID', flag: '🇮🇩' },
}

interface LanguageSelectorProps {
  onTranslate?: (targetLang: string) => void
  translationStatuses?: Record<string, string>
}

export function LanguageSelector({ onTranslate, translationStatuses = {} }: LanguageSelectorProps) {
  const { selectedLanguage, setSelectedLanguage } = useUIStore()
  const { projects, selectedProjectId } = useProjectStore()
  const project = projects.find(p => p.id === selectedProjectId)

  const rawLanguages = project?.target_languages ?? []
  // ko is always first; if not present, prepend it
  const targetLanguages = rawLanguages.includes('ko')
    ? ['ko', ...rawLanguages.filter((l) => l !== 'ko')]
    : ['ko', ...rawLanguages]

  // Don't render if only one language
  if (targetLanguages.length <= 1) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
      <span className="text-xs text-muted-foreground mr-1">언어:</span>
      <div className="flex bg-muted rounded-md overflow-hidden">
        {targetLanguages.map((lang) => {
          const info = LANGUAGE_INFO[lang] || { label: lang.toUpperCase(), flag: '🌐' }
          const status = lang === 'ko' ? 'original' : (translationStatuses[lang] || 'none')
          const isActive = selectedLanguage === lang

          return (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-xs transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                status === 'completed' && !isActive && 'text-green-500',
                status === 'translating' && !isActive && 'text-yellow-500',
              )}
            >
              <span>{info.flag}</span>
              <span>{info.label}</span>
              {status === 'completed' && <span className="text-[10px]">✓</span>}
              {status === 'translating' && <span className="text-[10px]">⏳</span>}
              {status === 'none' && lang !== 'ko' && <span className="text-[10px]">—</span>}
            </button>
          )
        })}
      </div>

      {selectedLanguage !== 'ko' && (
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs">
            원본 비교 보기
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => onTranslate?.(selectedLanguage)}>
            AI 번역
          </Button>
        </div>
      )}
    </div>
  )
}
