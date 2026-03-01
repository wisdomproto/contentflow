'use client';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { Settings, FileText, ImageIcon, Video } from 'lucide-react';
import type { TabId } from '@/types/content';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'basic', label: '기본설정', icon: <Settings size={16} /> },
  { id: 'blog', label: '블로그', icon: <FileText size={16} /> },
  { id: 'cardnews', label: '카드뉴스', icon: <ImageIcon size={16} /> },
  { id: 'video', label: '영상', icon: <Video size={16} /> },
];

export function TabBar() {
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  return (
    <div className="flex border-b border-border bg-card">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
