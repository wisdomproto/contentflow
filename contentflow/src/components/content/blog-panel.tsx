'use client';

import { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

// ─── SSE fetch helper ──────────────────────────────────────────
async function fetchAiGenerate(prompt: string, model: string): Promise<string> {
  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model }),
  });
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No reader');
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) fullText += parsed.text;
          if (parsed.error) throw new Error(parsed.error);
        } catch {}
      }
    }
  }
  return fullText;
}

// ─── SEO Score Display ─────────────────────────────────────────

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

// ─── Workflow types ─────────────────────────────────────────────

type WorkflowStep = 1 | 2 | 3 | 4;

const WORKFLOW_STEPS = [
  { step: 1 as WorkflowStep, label: '키워드', icon: '🎯' },
  { step: 2 as WorkflowStep, label: '구조', icon: '📐' },
  { step: 3 as WorkflowStep, label: '생성', icon: '✨' },
  { step: 4 as WorkflowStep, label: 'SEO', icon: '🔍' },
];

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

  const { savedKeywords } = useProjectStore();

  const baseArticle = getBaseArticle(content.id);
  const cards = getBlogCards(blogContent.id);

  // ── Workflow step state ──
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);

  // Auto-jump to Step 3 when cards exist from DB
  useEffect(() => {
    if (cards.length > 0 && currentStep === 1) {
      setCurrentStep(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length]);

  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  // ── Keyword state (Step 1) ──
  const existingKeywords = blogContent.naver_keywords as { primary?: string; secondary?: string[] } | null;
  const [seoTitle, setSeoTitle] = useState(blogContent.seo_title ?? '');
  const [primaryKeyword, setPrimaryKeyword] = useState(
    blogContent.primary_keyword ?? existingKeywords?.primary ?? ''
  );
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>(
    blogContent.secondary_keywords ?? existingKeywords?.secondary ?? []
  );
  const [searchIntent, setSearchIntent] = useState<string>(blogContent.search_intent ?? 'informational');
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [newGoldenInput, setNewGoldenInput] = useState('');
  const [customGoldenKeywords, setCustomGoldenKeywords] = useState<{ keyword: string; totalSearch: number }[]>([]);
  const [removedGoldenKeywords, setRemovedGoldenKeywords] = useState<string[]>([]);

  // AI keyword recommendation state
  const [recommendedKeywords, setRecommendedKeywords] = useState<any[]>([]);
  const [recommending, setRecommending] = useState(false);

  // ── Structure state (Step 2) ──
  const [metaDescription, setMetaDescription] = useState(blogContent.meta_description ?? '');
  const [headingStructure, setHeadingStructure] = useState(blogContent.heading_structure ?? '');
  const [structureGenerating, setStructureGenerating] = useState(false);

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
    if (!primaryKeyword && !existingKeywords?.primary && !blogContent.primary_keyword) {
      const tags = content.tags ?? [];
      if (tags.length > 0) {
        const primary = tags[0];
        const secondary = tags.slice(1);
        setPrimaryKeyword(primary);
        setSecondaryKeywords(secondary);
        updateBlogContent(blogContent.id, {
          naver_keywords: { primary, secondary },
          primary_keyword: primary,
          secondary_keywords: secondary,
        });
      } else if (content.title) {
        setPrimaryKeyword(content.title);
        updateBlogContent(blogContent.id, {
          naver_keywords: { primary: content.title, secondary: [] },
          primary_keyword: content.title,
          secondary_keywords: [],
        });
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
    updateBlogContent(blogContent.id, {
      naver_keywords: { primary, secondary },
      primary_keyword: primary,
      secondary_keywords: secondary,
    });
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
            id: generateId(),
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

  // Image generation
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
    const structureInstruction = headingStructure.trim()
      ? `\n\n## 콘텐츠 구조 (이 구조를 따르세요):\n${headingStructure}`
      : '';
    const intentMap: Record<string, string> = {
      informational: '정보형',
      commercial: '상업형',
      transactional: '거래형',
      navigational: '탐색형',
    };
    const naverPrompt = `${prompt}${structureInstruction}\n\n## 네이버 SEO 최적화 지침\n- 주 키워드: "${primaryKeyword}" — 제목, 첫 문단, 소제목에 자연스럽게 배치\n- 보조 키워드: ${secondaryKeywords.join(', ')} — 본문에 분산 배치\n- 검색 의도: ${intentMap[searchIntent] ?? searchIntent} — 이 의도에 맞는 콘텐츠 구성\n- 네이버 블로그 D.I.A. 최적화를 고려하세요`;
    setGeneratedPrompt(naverPrompt);
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

  // Golden keywords
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

  // AI keyword recommendation
  const handleRecommendKeywords = async () => {
    setRecommending(true);
    setRecommendedKeywords([]);
    try {
      // Use content title + tags as seed keywords for Naver API (same as keyword analysis module)
      const seeds = [content.title, ...(content.tags || [])].filter(Boolean).slice(0, 5);
      let allResults: any[] = [];
      for (const seed of seeds) {
        const res = await fetch('/api/naver/keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: [seed] }),
        });
        const data = await res.json();
        if (data.keywords?.length) {
          for (const kw of data.keywords) {
            if (!allResults.some(r => r.keyword === kw.keyword)) {
              allResults.push({ keyword: kw.keyword, naverVolume: kw.totalSearchVolume || 0, naverComp: kw.competition || '-' });
            }
          }
        }
        await new Promise(r => setTimeout(r, 300));
      }
      // Sort by volume desc
      allResults.sort((a: any, b: any) => (b.naverVolume || 0) - (a.naverVolume || 0));
      setRecommendedKeywords(allResults.slice(0, 30));
    } catch (err) {
      console.error('Keyword recommendation error:', err);
    } finally {
      setRecommending(false);
    }
  };

  // Content length calculation for SEO check
  const totalContentLength = cards.reduce((acc, c) => {
    const text = (c.content as Record<string, unknown>)?.text;
    return acc + (typeof text === 'string' ? text.length : 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* ── Step Progress Bar ── */}
      <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
        {WORKFLOW_STEPS.map(({ step, label, icon }) => (
          <button
            key={step}
            onClick={() => setCurrentStep(step)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-colors',
              currentStep === step
                ? 'bg-primary text-primary-foreground shadow-sm'
                : currentStep > step
                  ? 'text-green-500 hover:bg-accent'
                  : 'text-muted-foreground hover:bg-accent'
            )}
          >
            <span>{currentStep > step ? '✓' : icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════
         Step 1: 🎯 키워드 설정
         ════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">🎯 키워드 설정</h3>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              disabled={recommending || !hasBaseArticle}
              onClick={handleRecommendKeywords}
            >
              {recommending ? <><Loader2 size={12} className="animate-spin" /> 추천 중...</> : '✨ AI 키워드 추천'}
            </Button>
          </div>

          {!hasBaseArticle && (
            <p className="text-sm text-muted-foreground">기본 글을 먼저 작성해 주세요.</p>
          )}

          {/* Primary keyword */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">주요 키워드 (Primary)</label>
            <Input
              value={primaryKeyword}
              onChange={(e) => handlePrimaryKeywordChange(e.target.value)}
              placeholder="메인 검색 키워드"
              className="text-sm"
            />
          </div>

          {/* Secondary keywords */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">보조 키워드 (Secondary)</label>
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

          {/* Search intent selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">검색 의도</label>
            <div className="flex gap-2">
              {[
                { value: 'informational', label: '정보형', desc: '~란?, ~방법' },
                { value: 'commercial', label: '상업형', desc: '~추천, ~비교' },
                { value: 'transactional', label: '거래형', desc: '~예약, ~가격' },
                { value: 'navigational', label: '탐색형', desc: '브랜드 검색' },
              ].map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setSearchIntent(value)}
                  className={cn(
                    'flex-1 py-2 px-2 rounded-md text-xs border transition-colors',
                    searchIntent === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  <div className="font-medium">{label}</div>
                  <div className="text-[10px] opacity-70">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Keyword Recommendation Results */}
          {recommendedKeywords.length > 0 && (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="bg-muted px-3 py-1.5 text-xs font-semibold">AI 추천 키워드</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-3 py-1.5">키워드</th>
                    <th className="text-right px-3 py-1.5">네이버 검색량</th>
                    <th className="text-right px-3 py-1.5">경쟁도</th>
                    <th className="text-right px-3 py-1.5">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendedKeywords.map((kw: any, i: number) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-1.5 font-medium">{kw.keyword}</td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">
                        {kw.naverVolume?.toLocaleString() ?? kw.naver_volume?.toLocaleString() ?? '-'}
                      </td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">
                        {kw.naverComp ?? kw.naver_comp ?? '-'}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 text-[10px] px-1.5"
                            onClick={() => handlePrimaryKeywordChange(kw.keyword)}
                          >
                            주요
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 text-[10px] px-1.5"
                            onClick={() => {
                              if (!secondaryKeywords.includes(kw.keyword)) {
                                const updated = [...secondaryKeywords, kw.keyword];
                                setSecondaryKeywords(updated);
                                saveKeywords(primaryKeyword, updated);
                              }
                            }}
                          >
                            보조+
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Golden keyword banner */}
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

          {/* Saved keywords from store */}
          {(savedKeywords as any[]).length > 0 && (
            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">📁 보관함 키워드</div>
              <div className="flex flex-wrap gap-1.5">
                {(savedKeywords as any[]).map((sk: any) => (
                  <Badge
                    key={sk.keyword}
                    variant="outline"
                    className="text-xs gap-1 pr-1 cursor-pointer hover:bg-accent"
                  >
                    <button onClick={() => handlePrimaryKeywordChange(sk.keyword)} className="hover:underline" title="주요 키워드로 설정">
                      {sk.keyword}
                    </button>
                    <button
                      onClick={() => {
                        if (!secondaryKeywords.includes(sk.keyword)) {
                          const updated = [...secondaryKeywords, sk.keyword];
                          setSecondaryKeywords(updated);
                          saveKeywords(primaryKeyword, updated);
                        }
                      }}
                      className="hover:text-primary ml-0.5 text-[10px]"
                      title="보조 키워드 추가"
                    >
                      +
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Naver keyword search */}
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

          {/* Next button */}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                saveKeywords(primaryKeyword, secondaryKeywords);
                updateBlogContent(blogContent.id, {
                  search_intent: searchIntent,
                  primary_keyword: primaryKeyword || null,
                  secondary_keywords: secondaryKeywords,
                });
                setCurrentStep(2);
              }}
              disabled={!primaryKeyword.trim()}
            >
              다음: 구조 설계 →
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
         Step 2: 📐 구조 설계
         ════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">📐 콘텐츠 구조 설계</h3>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              disabled={structureGenerating || !primaryKeyword.trim()}
              onClick={async () => {
                setStructureGenerating(true);
                try {
                  const prompt = `You are a Naver blog SEO expert. Generate an optimized content structure for a blog post.

Primary keyword: "${primaryKeyword}"
Secondary keywords: ${secondaryKeywords.join(', ') || 'none'}
Search intent: ${searchIntent}
${baseArticle?.body ? `Base article summary: ${(baseArticle as any).body_plain_text?.substring(0, 500) || baseArticle.body.substring(0, 500)}` : ''}
${project.industry ? `Industry: ${project.industry}` : ''}

Return ONLY valid JSON (no explanation) with this exact structure:
{
  "seoTitle": "60자 이내 SEO 최적화 제목 (한국어, 네이버 검색 최적화)",
  "metaDescription": "120~160자 메타 설명 (한국어, 네이버 검색 결과에 표시)",
  "headingStructure": "H2: 제목1\\n  H3: 소제목1\\n  H3: 소제목2\\nH2: 제목2\\n  H3: 소제목3\\nH2: 결론"
}`;
                  const fullText = await fetchAiGenerate(prompt, channelModels.textModel);
                  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.seoTitle) {
                      setSeoTitle(parsed.seoTitle);
                      updateBlogContent(blogContent.id, { seo_title: parsed.seoTitle });
                    }
                    if (parsed.metaDescription) {
                      setMetaDescription(parsed.metaDescription);
                      updateBlogContent(blogContent.id, { meta_description: parsed.metaDescription });
                    }
                    if (parsed.headingStructure) {
                      setHeadingStructure(parsed.headingStructure);
                      updateBlogContent(blogContent.id, { heading_structure: parsed.headingStructure });
                    }
                  }
                } catch (err) {
                  console.error('Structure generation error:', err);
                } finally {
                  setStructureGenerating(false);
                }
              }}
            >
              {structureGenerating ? <><Loader2 size={12} className="animate-spin" /> 생성 중...</> : '✨ AI 자동 생성'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">키워드 기반으로 AI가 SEO 타이틀, 메타 설명, H2/H3 구조를 자동 생성합니다.</p>

          {/* SEO Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">SEO 타이틀</label>
              <span className={`text-[10px] ${seoTitle.length > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {seoTitle.length} / 60
              </span>
            </div>
            <Input
              value={seoTitle}
              onChange={(e) => handleSeoTitleChange(e.target.value)}
              placeholder="검색에 노출될 블로그 제목..."
              maxLength={100}
              className="text-sm"
            />
            {seoTitle.length > 60 && (
              <p className="text-xs text-red-500 mt-1">60자를 초과하면 검색 결과에서 잘릴 수 있습니다.</p>
            )}
          </div>

          {/* Meta Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">메타 설명</label>
              <span className={`text-[10px] ${metaDescription.length > 160 ? 'text-red-500' : metaDescription.length >= 120 ? 'text-green-500' : 'text-muted-foreground'}`}>
                {metaDescription.length} / 120~160
              </span>
            </div>
            <Textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="검색 결과에 표시될 설명 (120~160자 권장)"
              maxLength={200}
              rows={2}
              className="text-sm resize-none"
            />
            {metaDescription.length > 160 && (
              <p className="text-xs text-red-500 mt-1">160자를 초과하면 검색 결과에서 잘릴 수 있습니다.</p>
            )}
          </div>

          {/* Heading Structure */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Heading 구조 (H2/H3)</label>
            <Textarea
              value={headingStructure}
              onChange={(e) => setHeadingStructure(e.target.value)}
              placeholder={`H2: 소제목1\n  H3: 세부 항목1\n  H3: 세부 항목2\nH2: 소제목2\n  H3: 세부 항목3\nH2: 결론`}
              rows={8}
              className="text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">H2/H3 구조를 미리 잡으면 AI가 이 구조에 맞춰 생성합니다. 비워두면 AI가 자동 설계합니다.</p>
          </div>

          {/* Back / Next */}
          <div className="flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(1)}>← 키워드 설정</Button>
            <Button
              size="sm"
              onClick={() => {
                updateBlogContent(blogContent.id, {
                  seo_title: seoTitle || null,
                  meta_description: metaDescription || null,
                  heading_structure: headingStructure || null,
                });
                setCurrentStep(3);
              }}
            >
              다음: AI 생성 →
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
         Step 3: ✨ AI 콘텐츠 생성
         ════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">✨ AI 콘텐츠 생성</h3>

          {/* Summary box */}
          <div className="bg-muted rounded-md p-3 text-xs space-y-1">
            <div><span className="text-muted-foreground">주 키워드:</span> <span className="font-medium">{primaryKeyword || '미설정'}</span></div>
            <div><span className="text-muted-foreground">보조 키워드:</span> <span className="font-medium">{secondaryKeywords.length > 0 ? secondaryKeywords.join(', ') : '미설정'}</span></div>
            <div><span className="text-muted-foreground">검색 의도:</span> <span className="font-medium">{
              searchIntent === 'informational' ? '정보형' :
              searchIntent === 'commercial' ? '상업형' :
              searchIntent === 'transactional' ? '거래형' :
              searchIntent === 'navigational' ? '탐색형' : searchIntent
            }</span></div>
            <div><span className="text-muted-foreground">SEO 타이틀:</span> <span className="font-medium">{seoTitle || '미설정'}</span></div>
          </div>

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
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              기본글에서 콘텐츠를 먼저 작성하면, AI가 네이버 SEO에 최적화된 블로그 글로 변환합니다.
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

          {/* Back / Next */}
          <div className="flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(2)}>← 구조 설계</Button>
            <Button size="sm" onClick={() => setCurrentStep(4)} disabled={cards.length === 0}>다음: SEO 검사 →</Button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
         Step 4: 🔍 네이버 SEO 검사
         ════════════════════════════════════════════════════════════ */}
      {currentStep === 4 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">🔍 네이버 SEO 검사</h3>

          {/* Existing SeoScoreDisplay */}
          <SeoScoreDisplay score={seoResult.score} details={seoResult.details} />

          {/* Score Cards Grid */}
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: 'SEO Title', value: seoTitle.length > 0 ? (seoTitle.length <= 60 ? '✓' : '!') : '—', ok: seoTitle.length > 0 && seoTitle.length <= 60 },
              { label: '키워드 in 제목', value: primaryKeyword && seoTitle.toLowerCase().includes(primaryKeyword.toLowerCase()) ? '✓' : '—', ok: !!primaryKeyword && seoTitle.toLowerCase().includes(primaryKeyword.toLowerCase()) },
              { label: 'Headings', value: cards.length > 0 ? '✓' : '—', ok: cards.length > 0 },
              { label: '콘텐츠 섹션', value: cards.length >= 3 ? '✓' : `${cards.length}`, ok: cards.length >= 3 },
            ].map(({ label, value, ok }) => (
              <div key={label} className={cn('rounded-md p-3 border', ok ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-muted')}>
                <div className={`text-lg font-bold ${ok ? 'text-green-500' : 'text-muted-foreground'}`}>{value}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          {/* Checklist (7 items) */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">체크리스트</h4>
            {[
              { check: seoTitle.length > 0 && seoTitle.length <= 60, label: 'SEO 제목 60자 이내' },
              { check: !!primaryKeyword && seoTitle.toLowerCase().includes(primaryKeyword.toLowerCase()), label: '주요 키워드가 제목에 포함' },
              { check: cards.length >= 3, label: '본문 3개 섹션 이상' },
              { check: cards.some(c => !!(c.content as Record<string, unknown>)?.url), label: '이미지 1개 이상' },
              { check: secondaryKeywords.length >= 3, label: '보조 키워드 3개 이상' },
              { check: totalContentLength >= 2000, label: `본문 글자 수 2000자 이상 (현재: ${totalContentLength.toLocaleString()}자)` },
              { check: hasBaseArticle, label: '기본글 작성 완료' },
            ].map(({ check, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span className={check ? 'text-green-500' : 'text-muted-foreground'}>{check ? '✅' : '⬜'}</span>
                <span className={check ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
              </div>
            ))}
          </div>

          {/* Back / Publish Ready */}
          <div className="flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(3)}>← AI 생성</Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">✓ 발행 준비 완료</Button>
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      <PromptEditDialog
        open={showPromptDialog}
        onOpenChange={setShowPromptDialog}
        initialPrompt={generatedPrompt}
        isGenerating={isGenerating}
        onGenerate={handleStartGeneration}
        onAbort={abort}
      />

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
        onAddToQueue={(id, channel) => alert(`${channel}에 발행 큐 추가 (ID: ${id})`)}
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
