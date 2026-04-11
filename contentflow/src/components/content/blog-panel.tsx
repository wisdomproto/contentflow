'use client';

import { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BlogCardItem, AddCardButton } from './blog-card-item';
import { ChannelModelSelector } from './channel-model-selector';
import { ChannelContentList } from './channel-content-list';
import { PromptEditDialog } from './prompt-edit-dialog';
import { BlogPreviewDialog } from './blog-preview-dialog';
import { NaverKeywordPanel } from './naver-keyword-panel';
import { useAiGeneration } from '@/hooks/use-ai-generation';
import { useCardImageGeneration } from '@/hooks/use-card-image-generation';
import { useProjectStore } from '@/stores/project-store';
import { buildBlogPrompt, buildBlogImagePromptForCard } from '@/lib/prompt-builder';
import { calculateNaverSeoScore, type SeoDetail } from '@/lib/seo-scorer';
import { Eye, Loader2, ChevronDown, ChevronRight, X, Plus } from 'lucide-react';
import { GenerationButton } from './generation-button';
import type { Content, Project, BlogContent, BlogCard } from '@/types/database';
import type { ImportedStrategy } from '@/types/analytics';
import { generateId, cn } from '@/lib/utils';

function SeoScoreDisplay({ score, details }: { score: number; details: SeoDetail[] }) {
  const [expanded, setExpanded] = useState(false);
  const color = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="font-medium">SEO 점수</span>
        <span className={cn('font-bold text-lg', color)}>{score}</span>
        <span className="text-muted-foreground text-xs">/ 100</span>
      </button>
      {expanded && (
        <div className="space-y-1.5 pl-6">
          {details.map((d) => (
            <div key={d.category} className="flex items-center gap-2 text-xs">
              <div className={cn('w-14 text-right font-mono font-medium', d.score >= d.maxScore * 0.8 ? 'text-green-600' : d.score >= d.maxScore * 0.5 ? 'text-yellow-600' : 'text-red-600')}>
                {d.score}/{d.maxScore}
              </div>
              <div className="w-20 font-medium">{d.label}</div>
              <div className="text-muted-foreground flex-1">{d.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inner: 개별 블로그 콘텐츠 ────────────────────────────────

interface BlogPanelInnerProps {
  blogContent: BlogContent;
  content: Content;
  project: Project;
  hasBaseArticle: boolean;
  channelModels: { textModel: string; imageModel: string; aspectRatio: string; imageStyle: string };
  maxRetries: number;
}

function BlogPanelInner({ blogContent, content, project, hasBaseArticle, channelModels, maxRetries }: BlogPanelInnerProps) {
  const {
    getBaseArticle,
    getBlogCards,
    updateBlogContent,
    setBlogCardsForContent,
    updateBlogCard,
    deleteBlogCard,
    addBlogCard,
  } = useProjectStore();

  // Get strategy for keyword recommendations
  const strategy = useProjectStore((s) => {
    const projectId = s.selectedProjectId;
    return projectId ? s.getStrategy(projectId) : undefined;
  });

  const importedStrategy = useProjectStore((s) => {
    const projectId = s.selectedProjectId;
    if (!projectId) return null;
    const project = s.projects.find(p => p.id === projectId);
    return (project?.imported_strategy ?? null) as ImportedStrategy | null;
  });

  const baseArticle = getBaseArticle(content.id);
  const cards = getBlogCards(blogContent.id);

  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  // SEO 상태
  const existingKeywords = blogContent.naver_keywords as { primary?: string; secondary?: string[] } | null;
  const [seoTitle, setSeoTitle] = useState(blogContent.seo_title ?? '');
  const [primaryKeyword, setPrimaryKeyword] = useState(existingKeywords?.primary ?? '');
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>(existingKeywords?.secondary ?? []);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [newGoldenInput, setNewGoldenInput] = useState('');
  const [customGoldenKeywords, setCustomGoldenKeywords] = useState<{ keyword: string; totalSearch: number }[]>([]);
  const [removedGoldenKeywords, setRemovedGoldenKeywords] = useState<string[]>([]);

  // 기본글이 있고 아직 SEO 제목/키워드가 비어있으면 자동 세팅
  useEffect(() => {
    if (!hasBaseArticle) return;
    if (!seoTitle && !blogContent.seo_title) {
      const autoTitle = content.title || '';
      if (autoTitle) {
        setSeoTitle(autoTitle);
        updateBlogContent(blogContent.id, { seo_title: autoTitle });
      }
    }
    if (!primaryKeyword && !existingKeywords?.primary) {
      const tags = content.tags ?? [];
      if (tags.length > 0) {
        const primary = tags[0];
        const secondary = tags.slice(1);
        setPrimaryKeyword(primary);
        setSecondaryKeywords(secondary);
        updateBlogContent(blogContent.id, { naver_keywords: { primary, secondary } });
      } else if (content.title) {
        setPrimaryKeyword(content.title);
        updateBlogContent(blogContent.id, { naver_keywords: { primary: content.title, secondary: [] } });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBaseArticle, blogContent.id]);

  // SEO Score
  const naverKeywords = useMemo(() => ({
    primary: primaryKeyword,
    secondary: secondaryKeywords,
  }), [primaryKeyword, secondaryKeywords]);

  const seoResult = useMemo(() => {
    return calculateNaverSeoScore(seoTitle, cards, naverKeywords);
  }, [seoTitle, cards, naverKeywords]);

  const saveKeywords = useCallback((primary: string, secondary: string[]) => {
    updateBlogContent(blogContent.id, { naver_keywords: { primary, secondary } });
  }, [blogContent.id, updateBlogContent]);

  const handlePrimaryKeywordChange = (value: string) => {
    setPrimaryKeyword(value);
    saveKeywords(value, secondaryKeywords);
  };

  const handleAddSecondaryKeyword = () => {
    const kw = newKeywordInput.trim();
    if (!kw || secondaryKeywords.includes(kw)) return;
    const updated = [...secondaryKeywords, kw];
    setSecondaryKeywords(updated);
    setNewKeywordInput('');
    saveKeywords(primaryKeyword, updated);
  };

  const handleRemoveSecondaryKeyword = (kw: string) => {
    const updated = secondaryKeywords.filter((k) => k !== kw);
    setSecondaryKeywords(updated);
    saveKeywords(primaryKeyword, updated);
  };

  // SEO auto-retry state
  const retryCountRef = useRef(0);
  const generateRef = useRef<(prompt: string, model: string) => void>(undefined);
  const SEO_THRESHOLD = 0.9; // 90%

  function buildSeoFeedback(details: SeoDetail[]): string | null {
    // 이미지 최적화 제외하고 90% 미만인 항목 수집
    const failedItems = details
      .filter(d => d.category !== 'image' && d.category !== 'title' && d.score < d.maxScore * SEO_THRESHOLD)
      .map(d => `- ${d.label}: ${d.score}/${d.maxScore} (${d.message})`);
    if (failedItems.length === 0) return null;
    return failedItems.join('\n');
  }

  // AI text generation
  const { isGenerating, generate, abort } = useAiGeneration({
    onComplete: useCallback(
      (fullText: string) => {
        try {
          let sections: { text: string; alt?: string; caption?: string; image_prompt?: string }[];
          let aiSeoTitle: string | undefined;
          let aiPrimaryKw: string | undefined;
          let aiSecondaryKws: string[] | undefined;

          const objMatch = fullText.match(/\{[\s\S]*\}/);
          const arrMatch = fullText.match(/\[[\s\S]*\]/);

          if (objMatch) {
            try {
              const parsed = JSON.parse(objMatch[0]) as {
                seo_title?: string;
                primary_keyword?: string;
                secondary_keywords?: string[];
                sections?: { text: string; alt?: string; caption?: string; image_prompt?: string }[];
              };
              sections = parsed.sections ?? [];
              aiSeoTitle = parsed.seo_title;
              aiPrimaryKw = parsed.primary_keyword;
              aiSecondaryKws = parsed.secondary_keywords;
            } catch {
              if (!arrMatch) throw new Error('JSON 형식을 찾을 수 없습니다.');
              sections = JSON.parse(arrMatch[0]);
            }
          } else if (arrMatch) {
            sections = JSON.parse(arrMatch[0]);
          } else {
            throw new Error('JSON 형식을 찾을 수 없습니다.');
          }

          const finalTitle = aiSeoTitle || seoTitle || content.title || '';
          if (aiSeoTitle) setSeoTitle(aiSeoTitle);
          if (aiPrimaryKw) {
            setPrimaryKeyword(aiPrimaryKw);
            setSecondaryKeywords(aiSecondaryKws ?? []);
          }

          updateBlogContent(blogContent.id, {
            seo_title: finalTitle || null,
            ...(aiPrimaryKw ? { naver_keywords: { primary: aiPrimaryKw, secondary: aiSecondaryKws ?? [] } } : {}),
          });

          const now = new Date().toISOString();
          const newCards: BlogCard[] = sections.map((section, i) => ({
            id: generateId('bc'),
            blog_content_id: blogContent.id,
            card_type: 'text' as const,
            content: {
              text: section.text || '',
              url: '',
              alt: section.alt || '',
              caption: section.caption || '',
              image_prompt: section.image_prompt || '',
              image_style: '',
            },
            sort_order: i,
            created_at: now,
            updated_at: now,
          }));

          setBlogCardsForContent(blogContent.id, newCards);

          // SEO 점수 체크 후 자동 재생성
          const currentKw = aiPrimaryKw || primaryKeyword;
          const currentSecKws = aiSecondaryKws || secondaryKeywords;
          const seoCheck = calculateNaverSeoScore(finalTitle, newCards, { primary: currentKw, secondary: currentSecKws });
          const feedback = buildSeoFeedback(seoCheck.details);

          if (feedback && maxRetries > 0 && retryCountRef.current < maxRetries) {
            retryCountRef.current += 1;
            const retryPrompt = buildBlogPrompt({
              project,
              content,
              baseArticle: getBaseArticle(content.id) ?? undefined,
              seoTitle: finalTitle,
              keywords: { primary: currentKw, secondary: currentSecKws },
            });
            const seoFixPrompt = `${retryPrompt}\n\n## ⚠️ SEO 점수 개선 필요 (재생성 ${retryCountRef.current}/${maxRetries}회)\n현재 총점: ${seoCheck.score}/100 (이미지 제외)\n아래 항목의 점수가 낮습니다. 반드시 개선하세요:\n${feedback}\n\n이전 응답의 전체 내용을 유지하되, 위 항목만 집중 개선하세요.`;
            setTimeout(() => generateRef.current?.(seoFixPrompt, channelModels.textModel), 100);
          } else {
            retryCountRef.current = 0;
          }
        } catch {
          retryCountRef.current = 0;
          alert('블로그 섹션 파싱 실패. 다시 시도해 주세요.');
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [blogContent.id, seoTitle, primaryKeyword, secondaryKeywords, updateBlogContent, setBlogCardsForContent, project, content, channelModels.textModel, getBaseArticle, maxRetries]
    ),
    onError: useCallback((err: string) => {
      retryCountRef.current = 0;
      alert(`AI 생성 오류: ${err}`);
    }, []),
  });
  useEffect(() => { generateRef.current = generate; }, [generate]);

  // Image generation (공통 훅)
  const { isGeneratingImage, generatingCardId, imageProgress, generateCardImage, generateAllImages: generateAllCardImages, abort: abortImageGeneration } = useCardImageGeneration({
    getPrompt: (card: BlogCard) => {
      const cardContent = card.content as { image_prompt?: string; image_style?: string };
      const style = cardContent.image_style || channelModels.imageStyle || '';
      if (cardContent.image_prompt) return style ? `${style}.\n${cardContent.image_prompt}` : cardContent.image_prompt;
      const idx = cards.findIndex((c) => c.id === card.id);
      return buildBlogImagePromptForCard(project, cards, idx, style);
    },
    getExistingImage: (card: BlogCard) => (card.content as Record<string, unknown>)?.url as string || null,
    saveResult: (cardId: string, dataUrl: string, prompt: string) => {
      const latest = useProjectStore.getState().getBlogCards(blogContent.id).find((c) => c.id === cardId);
      updateBlogCard(cardId, { content: { ...(latest?.content ?? {}), url: dataUrl, image_prompt: prompt } });
    },
    shouldSkip: (card: BlogCard) => !!(card.content as Record<string, unknown>)?.url,
    imageModel: channelModels.imageModel,
    aspectRatio: channelModels.aspectRatio || '16:9',
    imageStyle: channelModels.imageStyle,
    projectId: project.id,
  });

  const handleGenerateCardImage = (cardId: string) => generateCardImage(cardId, cards);
  const handleGenerateAllImages = () => generateAllCardImages(cards);

  const handleGenerate = () => {
    const prompt = buildBlogPrompt({
      project,
      content,
      baseArticle: baseArticle ?? undefined,
      seoTitle,
      keywords: naverKeywords,
    });
    setGeneratedPrompt(prompt);
    setShowPromptDialog(true);
  };

  const handleStartGeneration = (prompt: string) => {
    generate(prompt, channelModels.textModel);
  };

  const handleCardUpdate = (cardId: string, newContent: Record<string, unknown>) => {
    updateBlogCard(cardId, { content: newContent });
  };

  const handleCardDelete = (cardId: string) => {
    deleteBlogCard(cardId);
  };

  const handleAddSection = () => {
    addBlogCard(blogContent.id, 'text', cards.length);
    const latestCards = useProjectStore.getState().getBlogCards(blogContent.id);
    const newCard = latestCards[latestCards.length - 1];
    if (newCard) {
      updateBlogCard(newCard.id, {
        content: { text: '', url: '', alt: '', caption: '', image_prompt: '', image_style: '' },
      });
    }
  };

  const handleSeoTitleChange = (value: string) => {
    setSeoTitle(value);
    updateBlogContent(blogContent.id, { seo_title: value || null });
  };

  const importedGolden = importedStrategy?.keywords.filter(k => k.isGolden) ?? [];
  const allGoldenKeywords = [
    ...(strategy?.keywords?.goldenKeywords ?? []).map(gk => ({
      keyword: gk.keyword,
      totalSearch: gk.totalSearch,
    })),
    ...importedGolden.map(k => ({
      keyword: k.keyword,
      totalSearch: k.totalSearch,
    })),
    ...customGoldenKeywords,
  ]
    .filter((k, i, arr) => arr.findIndex(x => x.keyword === k.keyword) === i)
    .filter(k => !removedGoldenKeywords.includes(k.keyword));

  const handleAddGoldenKeyword = () => {
    const kw = newGoldenInput.trim();
    if (!kw || allGoldenKeywords.some(g => g.keyword === kw)) return;
    setCustomGoldenKeywords(prev => [...prev, { keyword: kw, totalSearch: 0 }]);
    setRemovedGoldenKeywords(prev => prev.filter(r => r !== kw));
    setNewGoldenInput('');
  };

  const handleRemoveGoldenKeyword = (keyword: string) => {
    setCustomGoldenKeywords(prev => prev.filter(k => k.keyword !== keyword));
    setRemovedGoldenKeywords(prev => [...prev, keyword]);
  };

  return (
    <div className="space-y-4">
      {/* Golden keyword banner from marketing strategy */}
      {allGoldenKeywords.length > 0 && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">🥇 추천 키워드 (마케팅 전략)</div>
            <div className="flex items-center gap-1">
              <Input
                value={newGoldenInput}
                onChange={(e) => setNewGoldenInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddGoldenKeyword(); } }}
                placeholder="키워드 추가"
                className="h-6 w-[120px] text-xs bg-white dark:bg-emerald-950"
              />
              <Button variant="ghost" size="sm" onClick={handleAddGoldenKeyword} className="h-6 w-6 p-0">
                <Plus size={12} />
              </Button>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {allGoldenKeywords.map((gk) => (
              <Badge
                key={gk.keyword}
                variant="secondary"
                className="text-xs gap-1 pr-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-800"
              >
                <button onClick={() => handlePrimaryKeywordChange(gk.keyword)} className="hover:underline">
                  {gk.keyword} {gk.totalSearch > 0 ? `(${gk.totalSearch.toLocaleString()}/월)` : ''}
                </button>
                <button onClick={() => handleRemoveGoldenKeyword(gk.keyword)} className="hover:text-destructive ml-0.5">
                  <X size={10} />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Naver keyword search — above action buttons */}
      {hasBaseArticle && (
        <NaverKeywordPanel
          primaryKeyword={primaryKeyword}
          secondaryKeywords={secondaryKeywords}
          onSetPrimary={(kw) => handlePrimaryKeywordChange(kw)}
          onAddSecondary={(kw) => {
            const updated = [...secondaryKeywords, kw];
            setSecondaryKeywords(updated);
            saveKeywords(primaryKeyword, updated);
          }}
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {cards.length > 0 && (
            <Badge variant="secondary" className="text-xs">{cards.length}개 섹션</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <GenerationButton
            variant="text"
            isGenerating={isGenerating}
            disabled={!hasBaseArticle}
            onClick={handleGenerate}
            onAbort={abort}
          />
          <GenerationButton
            variant="batch-image"
            isGenerating={isGeneratingImage}
            disabled={cards.length === 0}
            onClick={handleGenerateAllImages}
            progress={imageProgress}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(true)}
            disabled={cards.length === 0}
            className="gap-1.5"
          >
            <Eye size={14} /> 미리보기
          </Button>
        </div>
      </div>

      {/* No base article */}
      {!hasBaseArticle && (
        <p className="text-sm text-muted-foreground">
          기본 글을 먼저 작성해 주세요.
        </p>
      )}

      {/* SEO Section */}
      {hasBaseArticle && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <h3 className="text-xs font-semibold">SEO 설정</h3>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">SEO 타이틀</label>
            <Input
              value={seoTitle}
              onChange={(e) => handleSeoTitleChange(e.target.value)}
              placeholder="검색에 노출될 블로그 제목..."
              maxLength={100}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">{seoTitle.length}/100자</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">주요 키워드</label>
            <Input
              value={primaryKeyword}
              onChange={(e) => handlePrimaryKeywordChange(e.target.value)}
              placeholder="메인 검색 키워드"
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">보조 키워드</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newKeywordInput}
                onChange={(e) => setNewKeywordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSecondaryKeyword(); } }}
                placeholder="보조 키워드 입력 후 Enter"
                className="flex-1 text-sm"
              />
              <Button variant="outline" size="sm" onClick={handleAddSecondaryKeyword}>
                <Plus size={14} />
              </Button>
            </div>
            {secondaryKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {secondaryKeywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-xs gap-1 pr-1">
                    {kw}
                    <button onClick={() => handleRemoveSecondaryKeyword(kw)} className="hover:text-destructive ml-0.5">
                      <X size={10} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {cards.length > 0 && (
            <SeoScoreDisplay score={seoResult.score} details={seoResult.details} />
          )}
        </div>
      )}

      {/* Card List */}
      {cards.length > 0 && (
        <div className="space-y-4">
          {cards.map((card, i) => (
            <BlogCardItem
              key={card.id}
              card={card}
              index={i}
              onUpdate={handleCardUpdate}
              onDelete={handleCardDelete}
              onGenerateImage={handleGenerateCardImage}
              onAbortImage={abortImageGeneration}
              isGeneratingImage={isGeneratingImage}
              generatingCardId={generatingCardId}
            />
          ))}
        </div>
      )}

      {/* Add Section */}
      {hasBaseArticle && <AddCardButton onAdd={handleAddSection} />}

      {/* Prompt Dialog */}
      <PromptEditDialog
        open={showPromptDialog}
        onOpenChange={setShowPromptDialog}
        initialPrompt={generatedPrompt}
        isGenerating={isGenerating}
        onGenerate={handleStartGeneration}
        onAbort={abort}
      />

      {/* Preview Dialog */}
      <BlogPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        cards={cards}
        seoTitle={seoTitle}
      />
    </div>
  );
}

// ─── Outer: 다중 블로그 콘텐츠 리스트 ────────────────────────────

export function BlogPanel() {
  const { selectedContentId, contents, selectedProjectId, projects, getBaseArticle, getBlogContents, addBlogContent, updateBlogContent, deleteBlogContent, getChannelModels, setChannelModels } = useProjectStore();
  const content = contents.find((c) => c.id === selectedContentId);
  const project = projects.find((p) => p.id === selectedProjectId);
  const [seoRetryLimit, setSeoRetryLimit] = useState(3);
  if (!content || !project) return null;
  const hasBaseArticle = !!getBaseArticle(content.id);
  const blogContents = getBlogContents(content.id);
  const channelModels = getChannelModels(project.id, 'blog');

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">블로그 (네이버)</h2>
      </div>

      {/* Model Selector + Image Settings + SEO Retry */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <ChannelModelSelector
            textModel={channelModels.textModel}
            imageModel={channelModels.imageModel}
            onTextModelChange={(m) => setChannelModels(project.id, 'blog', { textModel: m })}
            onImageModelChange={(m) => setChannelModels(project.id, 'blog', { imageModel: m })}
            aspectRatio={channelModels.aspectRatio}
            onAspectRatioChange={(r) => setChannelModels(project.id, 'blog', { aspectRatio: r })}
            imageStyle={channelModels.imageStyle}
            onImageStyleChange={(s) => setChannelModels(project.id, 'blog', { imageStyle: s })}
            defaultAspectRatio="16:9"
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pt-1">
          <label className="text-xs text-muted-foreground whitespace-nowrap">SEO 재생성</label>
          <Input
            type="number"
            min={0}
            max={10}
            value={seoRetryLimit}
            onChange={(e) => setSeoRetryLimit(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
            className="w-14 h-8 text-sm text-center"
          />
          <span className="text-xs text-muted-foreground">회</span>
        </div>
      </div>

      {/* Content List */}
      <ChannelContentList<BlogContent>
        items={blogContents}
        getId={(item) => item.id}
        getTitle={(item, index) => item.title || `블로그 글 ${index + 1}`}
        onTitleChange={(id, title) => updateBlogContent(id, { title })}
        onAdd={() => addBlogContent(content.id)}
        onDelete={(id) => deleteBlogContent(id)}
        addLabel="새 블로그 글 추가"
        renderContent={(blogContent) => (
          <BlogPanelInner
            key={blogContent.id}
            blogContent={blogContent}
            content={content}
            project={project}
            hasBaseArticle={hasBaseArticle}
            channelModels={channelModels}
            maxRetries={seoRetryLimit}
          />
        )}
      />
    </div>
  );
}
