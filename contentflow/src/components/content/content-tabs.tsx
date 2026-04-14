'use client';

import { useState, useEffect } from 'react';
import { FileText, BookOpen, Image, MessageCircle, Youtube, Globe, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/project-store';
import { BaseArticlePanel } from './base-article-panel';
import { BlogPanel } from './blog-panel';
import { WordpressPanel } from './wordpress-panel';
import { CardNewsPanel } from './cardnews-panel';
import { ThreadsPanel } from './threads-panel';
import { YoutubePanel } from './youtube-panel';
import { LanguageSelector } from './language-selector';
import { useUIStore } from '@/stores/ui-store';
import { createClient } from '@/lib/supabase/client';
import {
  translateAndSaveChannel,
  buildBlogCardsHtml,
  buildCardnewsHtml,
  buildThreadsHtml,
  buildYoutubeHtml,
  type ChannelKind,
} from '@/lib/channel-translator';

type TabId = 'base-article' | 'wordpress' | 'blog' | 'cardnews' | 'threads' | 'youtube' | 'shorts';

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
  { id: 'youtube', label: '롱폼', icon: <Youtube size={16} /> },
  { id: 'shorts', label: '숏폼', icon: <Smartphone size={16} /> },
];

export function ContentTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('base-article');
  const [translationStatuses, setTranslationStatuses] = useState<Record<string, string>>({});
  const { selectedLanguage } = useUIStore();

  // Naver Blog is Korean-only — auto-switch away if user picks a non-ko language.
  useEffect(() => {
    if (selectedLanguage !== 'ko' && activeTab === 'blog') {
      setActiveTab('base-article');
    }
  }, [selectedLanguage, activeTab]);
  const {
    selectedContentId,
    selectedProjectId,
    projects,
    getBaseArticle,
    getBlogContents,
    getBlogCards,
    getInstagramContents,
    getInstagramCards,
    getThreadsContents,
    getThreadsCards,
    getYoutubeContents,
    getYoutubeCards,
  } = useProjectStore();

  const handleTranslate = async (targetLang: string) => {
    if (!selectedContentId || !selectedProjectId) {
      alert('콘텐츠를 먼저 선택해주세요.');
      return;
    }
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    const channelKind: ChannelKind | null =
      activeTab === 'base-article' ? 'base'
      : activeTab === 'blog' ? 'naver_blog'
      : activeTab === 'wordpress' ? 'wordpress'
      : activeTab === 'cardnews' ? 'instagram'
      : activeTab === 'threads' ? 'threads'
      : activeTab === 'youtube' ? 'youtube'
      : null;

    if (!channelKind) {
      alert('이 채널은 번역을 지원하지 않습니다.');
      return;
    }

    // Collect source HTML per channel
    let sourceHtml = '';
    if (channelKind === 'base') {
      sourceHtml = getBaseArticle(selectedContentId)?.body || '';
      if (!sourceHtml) {
        alert('기본글을 먼저 작성해주세요.');
        return;
      }
    } else if (channelKind === 'naver_blog' || channelKind === 'wordpress') {
      const blog = getBlogContents(selectedContentId)[0];
      if (!blog) {
        alert(`${channelKind === 'naver_blog' ? 'N블로그' : 'WordPress'} 콘텐츠가 없습니다.`);
        return;
      }
      sourceHtml = buildBlogCardsHtml(getBlogCards(blog.id));
    } else if (channelKind === 'instagram') {
      const ig = getInstagramContents(selectedContentId)[0];
      if (!ig) { alert('카드뉴스 콘텐츠가 없습니다.'); return; }
      sourceHtml = buildCardnewsHtml(getInstagramCards(ig.id), ig.caption);
    } else if (channelKind === 'threads') {
      const th = getThreadsContents(selectedContentId)[0];
      if (!th) { alert('스레드 콘텐츠가 없습니다.'); return; }
      sourceHtml = buildThreadsHtml(getThreadsCards(th.id));
    } else if (channelKind === 'youtube') {
      const yt = getYoutubeContents(selectedContentId)[0];
      if (!yt) { alert('유튜브 콘텐츠가 없습니다.'); return; }
      sourceHtml = buildYoutubeHtml(getYoutubeCards(yt.id));
    }

    if (!sourceHtml.trim()) {
      alert('번역할 본문이 없습니다. 먼저 콘텐츠를 생성해주세요.');
      return;
    }

    setTranslationStatuses((prev) => ({ ...prev, [targetLang]: 'translating' }));
    try {
      const publicUrl = await translateAndSaveChannel({
        projectId: selectedProjectId,
        contentId: selectedContentId,
        project,
        targetLang,
        channel: channelKind,
        sourceHtml,
        isNaver: channelKind === 'naver_blog',
      });

      // Legacy sync: base article still keeps translations[] in factcheck_report for existing display code.
      if (channelKind === 'base') {
        const supabase = createClient();
        const { data: ba } = await supabase.from('base_articles').select('factcheck_report').eq('content_id', selectedContentId).single();
        const existing = (ba?.factcheck_report as Record<string, unknown>) || {};
        const translations = (existing.translations as Record<string, string>) || {};
        translations[targetLang] = publicUrl;
        await supabase.from('base_articles').update({ factcheck_report: { ...existing, translations } }).eq('content_id', selectedContentId);
        useProjectStore.setState((state) => ({
          baseArticles: state.baseArticles.map((ba2) =>
            ba2.content_id === selectedContentId
              ? { ...ba2, factcheck_report: { ...existing, translations } }
              : ba2
          ),
        }));
      }

      setTranslationStatuses((prev) => ({ ...prev, [targetLang]: 'completed' }));
      alert(`${targetLang.toUpperCase()} 번역 완료!`);
    } catch (err) {
      setTranslationStatuses((prev) => ({ ...prev, [targetLang]: 'none' }));
      alert(`번역 실패: ${(err as Error).message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tab Bar */}
      <div className="border-b border-border bg-background">
        <nav className="flex gap-1 px-4">
          {tabs
            .filter((tab) => !(tab.id === 'blog' && selectedLanguage !== 'ko'))
            .map((tab) => (
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

      {/* Language Selector — only shows when project has 2+ languages */}
      <LanguageSelector
        channel={activeTab === 'blog' ? 'naver_blog' : activeTab === 'cardnews' ? 'instagram' : activeTab}
        onTranslate={handleTranslate}
        translationStatuses={translationStatuses}
      />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
        {activeTab === 'base-article' && <BaseArticlePanel />}
        {activeTab === 'wordpress' && <WordpressPanel />}
        {activeTab === 'blog' && <BlogPanel />}
        {activeTab === 'cardnews' && <CardNewsPanel />}
        {activeTab === 'threads' && <ThreadsPanel />}
        {activeTab === 'youtube' && <YoutubePanel />}
        {activeTab === 'shorts' && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground h-full">
            <div className="text-center">
              <p className="text-4xl mb-4">📱</p>
              <p className="text-lg font-medium">숏폼</p>
              <p className="text-sm mt-2">60초 이내 세로 영상 (9:16)</p>
              <div className="flex gap-3 justify-center mt-4">
                <div className="bg-card border border-border rounded-lg px-4 py-3 text-center">
                  <div className="text-lg mb-1">🎬</div>
                  <div className="text-xs font-medium">YouTube Shorts</div>
                </div>
                <div className="bg-card border border-border rounded-lg px-4 py-3 text-center">
                  <div className="text-lg mb-1">📸</div>
                  <div className="text-xs font-medium">Instagram Reels</div>
                </div>
                <div className="bg-card border border-border rounded-lg px-4 py-3 text-center">
                  <div className="text-lg mb-1">🎵</div>
                  <div className="text-xs font-medium">TikTok</div>
                </div>
              </div>
              <p className="text-xs mt-4 text-muted-foreground">발행 시 채널 선택 가능</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
