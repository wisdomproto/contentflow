'use client'

import { ProjectSwitcher } from './project-switcher'
import { SidebarNavItem } from './sidebar-nav-item'

const navGroups = [
  {
    label: '콘텐츠',
    items: [
      { href: '/ideas', icon: '💡', label: '키워드 / 아이디어' },
      { href: '/content', icon: '📝', label: '콘텐츠 생성' },
      { href: '/publish', icon: '🚀', label: '발행' },
    ],
  },
  {
    label: '성장',
    items: [
      { href: '/monitoring', icon: '💬', label: '모니터링 / 댓글' },
    ],
  },
  {
    label: '분석',
    items: [
      { href: '/site-analysis', icon: '📊', label: '사이트 분석' },
      { href: '/meta-analytics', icon: '📱', label: '채널 분석' },
      { href: '/competitors', icon: '🎯', label: '경쟁사' },
    ],
  },
  {
    label: '전략',
    items: [
      { href: '/strategy', icon: '💡', label: '마케팅 전략' },
    ],
  },
]

export function Sidebar() {
  return (
    <aside className="w-56 bg-card border-r border-border flex flex-col h-full shrink-0">
      <ProjectSwitcher />

      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Project Settings — always first */}
        <div className="space-y-0.5">
          <SidebarNavItem href="/settings" icon="⚙️" label="프로젝트 설정" />
        </div>

        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarNavItem key={item.href} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

    </aside>
  )
}
