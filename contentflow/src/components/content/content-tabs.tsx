'use client';

import { useState } from 'react';
import { FileText, BookOpen, Image, MessageCircle, Youtube, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/project-store';
import { useUIStore } from '@/stores/ui-store';
import { BaseArticlePanel } from './base-article-panel';
import { BlogPanel } from './blog-panel';
import { WordpressPanel } from './wordpress-panel';
import { CardNewsPanel } from './cardnews-panel';
import { ThreadsPanel } from './threads-panel';
import { YoutubePanel } from './youtube-panel';
import { LanguageSelector } from './language-selector';
import { PublishBar } from './publish-bar';

type TabId = 'base-article' | 'wordpress' | 'blog' | 'cardnews' | 'threads' | 'youtube';

const TAB_TO_CHANNEL: Record<string, string> = {
  blog: 'naver_blog',
  wordpress: 'wordpress',
  cardnews: 'instagram',
  threads: 'threads',
  youtube: 'youtube',
};

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'base-article', label: '기본글', icon: <FileText size={16} /> },
  { id: 'blog', label: 'N 블로그', icon: <BookOpen size={16} /> },
  { id: 'wordpress', label: 'WordPress', icon: <Globe size={16} /> },
  { id: 'cardnews', label: '카드뉴스', icon: <Image size={16} /> },
  { id: 'threads', label: '스레드', icon: <MessageCircle size={16} /> },
  { id: 'youtube', label: '유튜브', icon: <Youtube size={16} /> },
];

export function ContentTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('base-article');
  const { selectedContentId, getBaseArticle } = useProjectStore();
  const { selectedLanguage } = useUIStore();
  const hasBaseArticle = selectedContentId ? !!getBaseArticle(selectedContentId) : false;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tab Bar */}
      <div className="border-b border-border bg-background">
        <nav className="flex gap-1 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Language Selector */}
      <LanguageSelector />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
        {activeTab === 'base-article' && <BaseArticlePanel />}
        {activeTab === 'wordpress' && <WordpressPanel />}
        {activeTab === 'blog' && <BlogPanel />}
        {activeTab === 'cardnews' && <CardNewsPanel />}
        {activeTab === 'threads' && <ThreadsPanel />}
        {activeTab === 'youtube' && <YoutubePanel />}
      </div>

      {/* Publish Bar — shown for all channel tabs except base-article */}
      {activeTab !== 'base-article' && (
        <PublishBar
          channel={TAB_TO_CHANNEL[activeTab]}
          language={selectedLanguage}
          isConnected={false}
        />
      )}
    </div>
  );
}
