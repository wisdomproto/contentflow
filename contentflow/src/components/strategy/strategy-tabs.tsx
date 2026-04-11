'use client';

import { cn } from '@/lib/utils';
import { Building2, Search, Share2, FileText, Target } from 'lucide-react';
import type { StrategyTab, TabStatus } from '@/types/strategy';

const tabs: { id: StrategyTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: '개요·경쟁사', icon: <Building2 size={16} /> },
  { id: 'keywords', label: '키워드 분석', icon: <Search size={16} /> },
  { id: 'channelStrategy', label: '채널·퍼널', icon: <Share2 size={16} /> },
  { id: 'contentStrategy', label: '콘텐츠·주제', icon: <FileText size={16} /> },
  { id: 'kpiAction', label: 'KPI·액션', icon: <Target size={16} /> },
];

interface StrategyTabsProps {
  activeTab: StrategyTab;
  onTabChange: (tab: StrategyTab) => void;
  tabStatuses: Record<StrategyTab, TabStatus>;
}

export function StrategyTabs({ activeTab, onTabChange, tabStatuses }: StrategyTabsProps) {
  return (
    <div className="border-b border-border bg-background sticky top-0 z-10">
      <nav className="flex gap-1 px-6 max-w-5xl mx-auto">
        {tabs.map((tab) => {
          const status = tabStatuses[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
              {status.status === 'generating' && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
              {status.status === 'complete' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
              {status.status === 'error' && (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
