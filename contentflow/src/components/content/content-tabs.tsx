'use client';

import { useState } from 'react';
import { FileText, BookOpen, Image, MessageCircle, Youtube, Globe, Send, Clock, Link2Off } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/project-store';
import { useUIStore } from '@/stores/ui-store';
import { BaseArticlePanel } from './base-article-panel';
import { BlogPanel } from './blog-panel';
import { WordpressPanel } from './wordpress-panel';
import { CardNewsPanel } from './cardnews-panel';
import { ThreadsPanel } from './threads-panel';
import { YoutubePanel } from './youtube-panel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ChannelConnectionsSection } from '@/components/project/channel-connections-section';

type TabId = 'base-article' | 'wordpress' | 'blog' | 'cardnews' | 'threads' | 'youtube';

const TAB_TO_CHANNEL: Record<string, string> = {
  blog: 'naver_blog',
  wordpress: 'wordpress',
  cardnews: 'instagram',
  threads: 'threads',
  youtube: 'youtube',
};

const CHANNEL_LABELS: Record<string, string> = {
  wordpress: 'WordPress',
  naver_blog: 'N 블로그',
  instagram: 'Instagram',
  threads: 'Threads',
  youtube: 'YouTube',
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
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const { selectedContentId, selectedProjectId, getBaseArticle, contents } = useProjectStore();
  const { selectedLanguage } = useUIStore();

  const channel = activeTab !== 'base-article' ? TAB_TO_CHANNEL[activeTab] : undefined;
  const channelLabel = channel ? (CHANNEL_LABELS[channel] || channel) : '';

  // Check WordPress connection
  const isConnected = channel === 'wordpress' && typeof window !== 'undefined' && !!localStorage.getItem(`wp_credentials_${selectedProjectId}`);

  async function handlePublish() {
    if (!isConnected && channel !== 'naver_blog') {
      setShowConnectDialog(true);
      return;
    }
    if (channel === 'wordpress') {
      const creds = JSON.parse(localStorage.getItem(`wp_credentials_${selectedProjectId}`) || '{}');
      const content = contents.find(c => c.id === selectedContentId);
      const baseArticle = selectedContentId ? getBaseArticle(selectedContentId) : null;
      try {
        const res = await fetch('/api/publish/wordpress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: content?.title || 'Untitled',
            content: baseArticle?.body || '',
            status: 'publish',
            siteUrl: creds.siteUrl,
            username: creds.username,
            applicationPassword: creds.appPassword,
          }),
        });
        const result = await res.json();
        if (result.success) alert(`발행 성공!\n${result.url}`);
        else alert(`발행 실패: ${result.error}`);
      } catch (err) {
        alert(`발행 오류: ${err}`);
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tab Bar + Publish */}
      <div className="border-b border-border bg-background flex items-center">
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

        {/* Publish buttons — right side */}
        {channel && (
          <div className="ml-auto pr-4 flex items-center gap-2">
            {channel === 'naver_blog' ? (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                📋 복사
              </Button>
            ) : (
              <>
                <Button
                  size="sm" variant="outline"
                  className={cn('h-7 text-xs gap-1', !isConnected && 'opacity-60')}
                  onClick={() => !isConnected ? setShowConnectDialog(true) : null}
                >
                  <Clock className="w-3 h-3" /> 예약
                </Button>
                <Button
                  size="sm"
                  className={cn('h-7 text-xs gap-1', !isConnected && 'opacity-60')}
                  onClick={handlePublish}
                >
                  <Send className="w-3 h-3" /> 발행
                </Button>
                {!isConnected && (
                  <Link2Off className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
        {activeTab === 'base-article' && <BaseArticlePanel />}
        {activeTab === 'wordpress' && <WordpressPanel />}
        {activeTab === 'blog' && <BlogPanel />}
        {activeTab === 'cardnews' && <CardNewsPanel />}
        {activeTab === 'threads' && <ThreadsPanel />}
        {activeTab === 'youtube' && <YoutubePanel />}
      </div>

      {/* Channel Connection Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>채널 연결 필요</DialogTitle>
            <DialogDescription>
              {channelLabel}에 발행하려면 먼저 채널을 연결해야 합니다.
            </DialogDescription>
          </DialogHeader>
          <ChannelConnectionsSection />
        </DialogContent>
      </Dialog>
    </div>
  );
}
