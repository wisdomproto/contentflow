'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { SaveStatusIndicator } from '@/components/save-status-indicator'

const pageTitles: Record<string, string> = {
  '/content': '콘텐츠 생성',
  '/ideas': '키워드 / 아이디어',
  '/publish': '발행 관리',
  '/monitoring': '모니터링',
  '/site-analysis': '사이트 분석',
  '/seo': 'SEO 분석',
  '/analytics': 'Google 애널리틱스',
  '/meta-analytics': '채널 분석',
  '/competitors': '경쟁사',
  '/strategy': '마케팅 전략',
  '/settings': '설정',
  '/ads': '광고 관리',
}

export function TopBar() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || ''
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="h-12 border-b border-border flex items-center justify-between px-5 shrink-0">
      <h1 className="text-sm font-semibold">{title}</h1>
      <div className="flex items-center gap-4">
        <SaveStatusIndicator />
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
        >
          {mounted ? (theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />) : <Moon size={16} />}
        </button>
      </div>
    </div>
  )
}
