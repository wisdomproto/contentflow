'use client';

import { useState } from 'react';
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
import { createClient } from '@/lib/supabase/client';

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
  const { selectedContentId, getBaseArticle } = useProjectStore();

  const handleTranslate = async (targetLang: string) => {
    const baseArticle = selectedContentId ? getBaseArticle(selectedContentId) : null;
    if (!baseArticle?.body) {
      alert('기본글을 먼저 작성해주세요.');
      return;
    }

    setTranslationStatuses(prev => ({ ...prev, [targetLang]: 'translating' }));
    try {
      const langNames: Record<string, string> = { en: 'English', vi: 'Vietnamese', th: 'Thai', ja: 'Japanese', zh: 'Chinese', ms: 'Malay', id: 'Indonesian' };
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Translate the following Korean blog article to ${langNames[targetLang] || targetLang}. Keep the HTML structure intact. Maintain medical/health terminology accuracy. Output ONLY the translated HTML.\n\n${baseArticle.body.substring(0, 8000)}`,
        }),
      });
      if (!res.ok) throw new Error('번역 API 오류');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('스트림 오류');
      const decoder = new TextDecoder();
      let result = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            const payload = buffer.trim().replace(/^data: /, '');
            if (payload !== '[DONE]') {
              try { result += JSON.parse(payload).text || ''; } catch {}
            }
          }
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') break;
          try { result += JSON.parse(payload).text || ''; } catch {}
        }
      }

      // Save translated HTML to R2
      const projectId = useProjectStore.getState().selectedProjectId;
      const blob = new Blob([result], { type: 'text/html' });
      const fileName = `${selectedContentId}_${targetLang}.html`;
      const presignRes = await fetch('/api/storage/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, category: 'content', fileName, contentType: 'text/html', contentId: selectedContentId }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        throw new Error(`R2 presign 실패: ${presignData.error}`);
      }
      {
        const { presignedUrl, publicUrl } = presignData;
        await fetch(presignedUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'text/html' } });
        // Store URL reference in base_article metadata
        const supabase = createClient();
        const { data: ba } = await supabase.from('base_articles').select('factcheck_report').eq('content_id', selectedContentId).single();
        const existing = (ba?.factcheck_report as Record<string, unknown>) || {};
        const translations = (existing.translations as Record<string, string>) || {};
        translations[targetLang] = publicUrl;
        await supabase.from('base_articles').update({ factcheck_report: { ...existing, translations } }).eq('content_id', selectedContentId);
        // Sync Zustand store locally (DB already updated above)
        useProjectStore.setState((state) => ({
          baseArticles: state.baseArticles.map(ba2 =>
            ba2.content_id === selectedContentId
              ? { ...ba2, factcheck_report: { ...existing, translations } }
              : ba2
          ),
        }));
      }

      setTranslationStatuses(prev => ({ ...prev, [targetLang]: 'completed' }));
      alert(`${targetLang.toUpperCase()} 번역 완료!`);
    } catch (err) {
      setTranslationStatuses(prev => ({ ...prev, [targetLang]: 'none' }));
      alert(`번역 실패: ${(err as Error).message}`);
    }
  };

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
