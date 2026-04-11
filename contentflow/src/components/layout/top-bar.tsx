'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/content': '콘텐츠 생성',
  '/ideas': '아이디어',
  '/calendar': '캘린더',
  '/publish': '채널 발행',
  '/monitoring': '모니터링',
  '/seo': 'SEO 분석',
  '/analytics': 'Google 애널리틱스',
  '/meta-analytics': '메타 채널 분석',
  '/competitors': '경쟁사 분석',
  '/strategy': '마케팅 전략',
  '/settings': '설정',
}

export function TopBar() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || ''

  return (
    <div className="h-12 border-b border-border flex items-center px-5 shrink-0">
      <h1 className="text-sm font-semibold">{title}</h1>
    </div>
  )
}
