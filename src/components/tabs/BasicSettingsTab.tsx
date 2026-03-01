'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useFolderStore } from '@/stores/useFolderStore';
import { useContentStore } from '@/stores/useContentStore';
import { useUIStore } from '@/stores/useUIStore';
import { TONE_OPTIONS } from '@/lib/constants';
import type { IdeaExtraction } from '@/mock/contents';
import { Sparkles, X, Lightbulb } from 'lucide-react';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { IdeaExtractResult } from './IdeaExtractResult';

export function BasicSettingsTab() {
  const folders = useFolderStore((s) => s.folders);
  const activeContentId = useContentStore((s) => s.activeContentId);
  const contents = useContentStore((s) => s.contents);
  const updateSource = useContentStore((s) => s.updateSource);
  const setBlogData = useContentStore((s) => s.setBlogData);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  const updateBlogTitle = useContentStore((s) => s.updateBlogTitle);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedIdeas, setExtractedIdeas] = useState<IdeaExtraction | null>(null);
  const [keywordInput, setKeywordInput] = useState('');

  const content = activeContentId ? contents[activeContentId] : null;

  const handleExtractIdeas = useCallback(async () => {
    if (!content?.source.topic) return;
    setIsExtracting(true);
    try {
      const res = await fetch('/api/ai/extract-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: content.source.topic,
          model: content.modelSettings?.blog ?? 'flash',
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'API error');
      setExtractedIdeas(result as IdeaExtraction);
    } catch (err) {
      console.error('Idea extraction failed:', err);
      const msg = err instanceof Error ? err.message : '아이디어 추출에 실패했습니다.';
      alert(msg);
    } finally {
      setIsExtracting(false);
    }
  }, [content?.source.topic, content?.modelSettings?.blog]);

  const handleGenerate = useCallback(async () => {
    if (!activeContentId || !content) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: content.source.topic,
          keywords: content.source.keywords,
          insights: content.source.insights,
          tone: content.source.tone,
          model: content.modelSettings?.blog ?? 'flash',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API error');
      setBlogData(activeContentId, data.title, data.sections, data.tags);
      setActiveTab('blog');
    } catch (err) {
      console.error('Blog generation failed:', err);
      const msg = err instanceof Error ? err.message : '블로그 생성에 실패했습니다.';
      alert(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [activeContentId, content, setBlogData, setActiveTab]);

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 text-4xl">📝</div>
        <h2 className="mb-2 text-lg font-semibold">컨텐츠를 선택해주세요</h2>
        <p className="text-sm text-muted-foreground">
          사이드바에서 컨텐츠를 선택하거나 새 폴더를 만들어 시작하세요
        </p>
      </div>
    );
  }

  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      const newKeywords = [...content.source.keywords, keywordInput.trim()];
      updateSource(content.id, { keywords: newKeywords });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    updateSource(content.id, {
      keywords: content.source.keywords.filter((k) => k !== keyword),
    });
  };

  const folderOptions = [
    { value: '', label: '폴더 선택...' },
    ...folders.map((f) => ({ value: f.id, label: `${f.settings.icon} ${f.settings.name}` })),
  ];

  const toneOptions = [
    { value: '', label: '폴더 페르소나 기본값 사용' },
    ...TONE_OPTIONS,
  ];

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold">기본 설정</h2>

      <div className="flex flex-col gap-5">
        <Select
          id="folder"
          label="폴더 선택"
          options={folderOptions}
          value={content.folderId || ''}
          onChange={() => updateSource(content.id, {})}
        />

        <div>
          <Input
            id="topic"
            label="주제 입력"
            placeholder="예: 강남역 카페 투어"
            value={content.source.topic}
            onChange={(e) => updateSource(content.id, { topic: e.target.value })}
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleExtractIdeas}
              disabled={!content.source.topic || isExtracting}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExtracting ? (
                <>
                  <Spinner size="sm" className="mr-0.5" />
                  추출 중...
                </>
              ) : (
                <>
                  <Lightbulb size={14} />
                  AI 아이디어 추출
                </>
              )}
            </button>
            <ModelSelector
              tab="blog"
              contentId={content.id}
              currentModel={content.modelSettings?.blog ?? 'flash'}
              compact
            />
          </div>
        </div>

        {/* AI Idea Extraction Results */}
        {extractedIdeas && (
          <IdeaExtractResult
            ideas={extractedIdeas}
            existingKeywords={content.source.keywords}
            onAddKeyword={(kw) =>
              updateSource(content.id, { keywords: [...content.source.keywords, kw] })
            }
            onApplyTitle={(title) => updateBlogTitle(content.id, title)}
          />
        )}

        <Input
          id="title"
          label="제목"
          placeholder="블로그 제목을 입력하세요 (AI 추천 제목 클릭 시 자동 입력)"
          value={content.blog.title}
          onChange={(e) => updateBlogTitle(content.id, e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">핵심 키워드</label>
          <input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleAddKeyword}
            placeholder="키워드 입력 후 Enter"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {content.source.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {content.source.keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                >
                  {kw}
                  <button onClick={() => handleRemoveKeyword(kw)} className="hover:text-foreground">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="insights" className="text-sm font-medium text-foreground">
            컨텐츠 요약
          </label>
          <textarea
            id="insights"
            rows={4}
            placeholder="작성하고 싶은 컨텐츠 내용을 자유롭게 요약해주세요 (경험, 핵심 포인트, 강조할 내용 등)"
            value={content.source.insights}
            onChange={(e) => updateSource(content.id, { insights: e.target.value })}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            AI가 이 내용을 바탕으로 블로그 본문을 생성합니다
          </p>
        </div>

        <Select
          id="tone"
          label="톤앤매너 (이 컨텐츠만 변경)"
          options={toneOptions}
          value={content.source.tone}
          onChange={(e) => updateSource(content.id, { tone: e.target.value })}
        />

        <Button
          variant="primary"
          size="lg"
          onClick={handleGenerate}
          disabled={!content.source.topic || isGenerating}
          className="mt-4 w-full"
        >
          {isGenerating ? (
            <>
              <Spinner size="sm" className="mr-2" />
              AI 초안 생성 중...
            </>
          ) : (
            <>
              <Sparkles size={18} className="mr-2" />
              AI 초안 생성
            </>
          )}
        </Button>
      </div>
      </div>
    </div>
  );
}
