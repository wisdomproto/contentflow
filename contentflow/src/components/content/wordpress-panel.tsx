'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BlogCardItem, AddCardButton } from './blog-card-item';
import { ChannelModelSelector } from './channel-model-selector';
import { cn } from '@/lib/utils';
import { ChannelContentList } from './channel-content-list';
import { PromptEditDialog } from './prompt-edit-dialog';
import { WordpressPreviewDialog } from './wordpress-preview-dialog';
import { useAiGeneration } from '@/hooks/use-ai-generation';
import { useCardImageGeneration } from '@/hooks/use-card-image-generation';
import { useProjectStore } from '@/stores/project-store';
import { buildBlogPrompt, buildBlogImagePromptForCard } from '@/lib/prompt-builder';
import { GenerationButton } from './generation-button';
import { Globe } from 'lucide-react';
import { generateId } from '@/lib/utils';
import type { Content, Project, BlogContent, BlogCard } from '@/types/database';

// Helper: fetch AI generate (SSE) and return full text
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

// ─── Inner: 개별 WordPress 콘텐츠 ────────────────────────────────

interface WordpressPanelInnerProps {
  blogContent: BlogContent;
  content: Content;
  project: Project;
  hasBaseArticle: boolean;
  channelModels: { textModel: string; imageModel: string; aspectRatio: string; imageStyle: string };
}

type WorkflowStep = 1 | 2 | 3 | 4;

const WORKFLOW_STEPS = [
  { step: 1 as WorkflowStep, label: '키워드 설정', icon: '🎯' },
  { step: 2 as WorkflowStep, label: '구조 설계', icon: '📐' },
  { step: 3 as WorkflowStep, label: 'AI 생성', icon: '✨' },
  { step: 4 as WorkflowStep, label: 'SEO 검사', icon: '🔍' },
];

function WordpressPanelInner({ blogContent, content, project, hasBaseArticle, channelModels }: WordpressPanelInnerProps) {
  const {
    getBaseArticle,
    getBlogCards,
    updateBlogContent,
    setBlogCardsForContent,
    updateBlogCard,
    deleteBlogCard,
    addBlogCard,
  } = useProjectStore();

  const baseArticle = getBaseArticle(content.id);
  const cards = getBlogCards(blogContent.id);

  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);

  // Auto-jump to Step 3 when cards are loaded from DB
  useEffect(() => {
    if (cards.length > 0 && currentStep === 1) {
      setCurrentStep(3);
    }
  }, [cards.length]);

  // Keyword fields
  const [primaryKeyword, setPrimaryKeyword] = useState(blogContent.primary_keyword ?? content.tags?.[0] ?? '');
  const [secondaryKeywords, setSecondaryKeywords] = useState(
    blogContent.secondary_keywords?.join(', ') ?? content.tags?.slice(1)?.join(', ') ?? ''
  );
  const [searchIntent, setSearchIntent] = useState<string>(blogContent.search_intent ?? 'informational');

  // Structure fields
  const [headingStructure, setHeadingStructure] = useState(blogContent.heading_structure ?? '');

  // SEO meta fields
  const [metaTitle, setMetaTitle] = useState(blogContent.seo_title ?? '');
  const [metaDescription, setMetaDescription] = useState(blogContent.meta_description ?? '');
  const [urlSlug, setUrlSlug] = useState(blogContent.url_slug ?? '');
  const [structureGenerating, setStructureGenerating] = useState(false);
  const [keywordGenerating, setKeywordGenerating] = useState(false);

  const handleMetaTitleChange = (value: string) => {
    setMetaTitle(value);
    updateBlogContent(blogContent.id, { seo_title: value || null });
  };

  // AI text generation
  const { isGenerating, generate, abort } = useAiGeneration({
    onComplete: (fullText: string) => {
      try {
        let sections: { text: string; alt?: string; caption?: string; image_prompt?: string }[];

        const objMatch = fullText.match(/\{[\s\S]*\}/);
        const arrMatch = fullText.match(/\[[\s\S]*\]/);

        if (objMatch) {
          try {
            const parsed = JSON.parse(objMatch[0]) as {
              seo_title?: string;
              sections?: { text: string; alt?: string; caption?: string; image_prompt?: string }[];
            };
            sections = parsed.sections ?? [];
            if (parsed.seo_title) {
              setMetaTitle(parsed.seo_title);
              updateBlogContent(blogContent.id, { seo_title: parsed.seo_title });
            }
          } catch {
            if (!arrMatch) throw new Error('JSON 형식을 찾을 수 없습니다.');
            sections = JSON.parse(arrMatch[0]);
          }
        } else if (arrMatch) {
          sections = JSON.parse(arrMatch[0]);
        } else {
          throw new Error('JSON 형식을 찾을 수 없습니다.');
        }

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
      } catch {
        alert('WordPress 섹션 파싱 실패. 다시 시도해 주세요.');
      }
    },
    onError: (err: string) => {
      alert(`AI 생성 오류: ${err}`);
    },
  });

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
    const secondaryArr = secondaryKeywords.split(',').map(k => k.trim()).filter(Boolean);
    const prompt = buildBlogPrompt({
      project,
      content,
      baseArticle: baseArticle ?? undefined,
      seoTitle: metaTitle,
      keywords: { primary: primaryKeyword, secondary: secondaryArr },
    });
    const structureInstruction = headingStructure.trim()
      ? `\n\n## 콘텐츠 구조 (이 구조를 따르세요):\n${headingStructure}`
      : '';
    const wpPrompt = `${prompt}${structureInstruction}\n\n## WordPress / Google SEO 최적화 지침\n- 주 키워드: "${primaryKeyword}" — 제목, 첫 문단, H2에 자연스럽게 배치\n- 보조 키워드: ${secondaryArr.join(', ')} — H2/H3와 본문에 분산 배치 (키워드 밀도 1~2%)\n- 검색 의도: ${searchIntent} — 이 의도에 맞는 콘텐츠 구성\n- H1/H2/H3 계층 구조를 명확히 사용하세요\n- 각 섹션에 내부링크 기회를 제안하세요\n- 이미지 alt 텍스트를 키워드가 포함된 설명형으로 작성하세요\n- 마지막에 FAQ 섹션(3~5개 질문)을 추가하세요 (GEO 최적화)\n- 구글 검색 의도에 맞는 자연스러운 키워드 배치를 사용하세요`;
    setGeneratedPrompt(wpPrompt);
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

  return (
    <div className="space-y-4">
      {/* Workflow Steps */}
      <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
        {WORKFLOW_STEPS.map(({ step, label, icon }, i) => (
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

      {/* Step 1: 키워드 설정 */}
      {currentStep === 1 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">🎯 타겟 키워드 설정</h3>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              disabled={keywordGenerating}
              onClick={async () => {
                setKeywordGenerating(true);
                try {
                  const articleText = baseArticle?.body_plain_text || baseArticle?.body || content.title || '';
                  const prompt = `You are a Google SEO keyword researcher. Suggest optimal keywords for a blog post.

${project.industry ? `Industry: ${project.industry}` : ''}
${project.brand_name ? `Brand: ${project.brand_name}` : ''}
Article title: "${content.title}"
${articleText ? `Article content (first 500 chars): ${articleText.substring(0, 500)}` : ''}

Return ONLY valid JSON (no explanation):
{
  "primaryKeyword": "주요 키워드 1개 (한국어, 검색량 높은 것)",
  "secondaryKeywords": ["보조 키워드1", "보조 키워드2", "보조 키워드3", "보조 키워드4", "보조 키워드5"],
  "searchIntent": "informational|commercial|transactional|navigational"
}`;
                  const fullText = await fetchAiGenerate(prompt, channelModels.textModel);
                  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.primaryKeyword) setPrimaryKeyword(parsed.primaryKeyword);
                    if (parsed.secondaryKeywords) setSecondaryKeywords(parsed.secondaryKeywords.join(', '));
                    if (parsed.searchIntent) setSearchIntent(parsed.searchIntent);
                    // Save to DB immediately after AI recommendation
                    updateBlogContent(blogContent.id, {
                      primary_keyword: parsed.primaryKeyword || null,
                      secondary_keywords: parsed.secondaryKeywords || [],
                      search_intent: parsed.searchIntent || null,
                    });
                  }
                } catch (err) {
                  console.error('Keyword generation error:', err);
                } finally {
                  setKeywordGenerating(false);
                }
              }}
            >
              {keywordGenerating ? '추천 중...' : '✨ AI 키워드 추천'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">기본글 내용과 업종을 기반으로 AI가 키워드를 추천합니다.</p>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">주 키워드 (Primary)</label>
            <Input
              value={primaryKeyword}
              onChange={(e) => setPrimaryKeyword(e.target.value)}
              placeholder="예: 소아 성장클리닉"
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">보조 키워드 (Secondary) — 쉼표로 구분</label>
            <Input
              value={secondaryKeywords}
              onChange={(e) => setSecondaryKeywords(e.target.value)}
              placeholder="예: 성장호르몬 치료, 키 성장 검사, 성장판 검사"
              className="text-sm"
            />
          </div>
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
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                updateBlogContent(blogContent.id, {
                  primary_keyword: primaryKeyword || null,
                  secondary_keywords: secondaryKeywords.split(',').map(k => k.trim()).filter(Boolean),
                  search_intent: searchIntent,
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

      {/* Step 2: 구조 설계 */}
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
                  const secondaryArr = secondaryKeywords.split(',').map(k => k.trim()).filter(Boolean);
                  const prompt = `You are a Google SEO expert. Generate an optimized content structure for a blog post.

Primary keyword: "${primaryKeyword}"
Secondary keywords: ${secondaryArr.join(', ') || 'none'}
Search intent: ${searchIntent}
${baseArticle?.body ? `Base article summary: ${baseArticle.body_plain_text?.substring(0, 500) || baseArticle.body.substring(0, 500)}` : ''}
${project.industry ? `Industry: ${project.industry}` : ''}

Return ONLY valid JSON (no explanation) with this exact structure:
{
  "metaTitle": "60자 이내 SEO 최적화 제목 (한국어)",
  "metaDescription": "120~160자 메타 설명 (한국어)",
  "urlSlug": "english-url-slug",
  "headingStructure": "H2: 제목1\\n  H3: 소제목1\\n  H3: 소제목2\\nH2: 제목2\\n  H3: 소제목3\\nH2: FAQ\\nH2: 결론"
}`;
                  const fullText = await fetchAiGenerate(prompt, channelModels.textModel);
                  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.metaTitle) setMetaTitle(parsed.metaTitle);
                    if (parsed.metaDescription) setMetaDescription(parsed.metaDescription);
                    if (parsed.urlSlug) setUrlSlug(parsed.urlSlug);
                    if (parsed.headingStructure) setHeadingStructure(parsed.headingStructure);
                    // Save to DB immediately after AI structure generation
                    updateBlogContent(blogContent.id, {
                      seo_title: parsed.metaTitle || null,
                      meta_description: parsed.metaDescription || null,
                      url_slug: parsed.urlSlug || null,
                      heading_structure: parsed.headingStructure || null,
                    });
                  }
                } catch (err) {
                  console.error('Structure generation error:', err);
                } finally {
                  setStructureGenerating(false);
                }
              }}
            >
              {structureGenerating ? '생성 중...' : '✨ AI 구조 자동 생성'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">키워드 기반으로 AI가 Meta Title, Description, H2/H3 구조를 자동 생성합니다.</p>

          {/* SEO Meta Fields */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">Meta Title (H1)</label>
                <span className={`text-[10px] ${metaTitle.length > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {metaTitle.length} / 60
                </span>
              </div>
              <Input
                value={metaTitle}
                onChange={(e) => handleMetaTitleChange(e.target.value)}
                placeholder="예: 소아 성장 클리닉 완벽 가이드 | 2026 전문의 추천"
                maxLength={80}
                className="text-sm"
              />
            </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-muted-foreground">Meta Title</label>
            <span className={`text-[10px] ${metaTitle.length > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {metaTitle.length} / 60
            </span>
          </div>
          <Input
            value={metaTitle}
            onChange={(e) => handleMetaTitleChange(e.target.value)}
            placeholder="페이지 제목 (검색 결과에 표시)"
            maxLength={80}
            className="text-sm"
          />
          {metaTitle.length > 60 && (
            <p className="text-xs text-red-500 mt-1">60자를 초과하면 검색 결과에서 잘릴 수 있습니다.</p>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-muted-foreground">Meta Description</label>
            <span className={`text-[10px] ${metaDescription.length > 160 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {metaDescription.length} / 160
            </span>
          </div>
          <Textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="페이지 설명 (검색 결과에 표시)"
            maxLength={200}
            rows={2}
            className="text-sm resize-none"
          />
          {metaDescription.length > 160 && (
            <p className="text-xs text-red-500 mt-1">160자를 초과하면 검색 결과에서 잘릴 수 있습니다.</p>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-muted-foreground">URL Slug</label>
          </div>
          <Input
            value={urlSlug}
            onChange={(e) => setUrlSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="page-url-slug"
            className="text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">영문 소문자, 숫자, 하이픈만 사용 가능합니다.</p>
        </div>
      </div>

          {/* Heading Structure */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Heading 구조 (H2/H3)</label>
            <Textarea
              value={headingStructure}
              onChange={(e) => setHeadingStructure(e.target.value)}
              placeholder={`H2: 성장클리닉이란?\n  H3: 성장 지연의 원인\n  H3: 언제 방문해야 할까?\nH2: 성장호르몬 치료\n  H3: 치료 과정\n  H3: 비용과 보험\nH2: 자주 묻는 질문 (FAQ)\nH2: 결론`}
              rows={8}
              className="text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">H2/H3 구조를 미리 잡으면 AI가 이 구조에 맞춰 생성합니다. 비워두면 AI가 자동 설계합니다.</p>
          </div>

          <div className="flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(1)}>← 키워드 설정</Button>
            <Button
              size="sm"
              onClick={() => {
                updateBlogContent(blogContent.id, {
                  seo_title: metaTitle || null,
                  meta_description: metaDescription || null,
                  url_slug: urlSlug || null,
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

      {/* Step 3: AI 생성 */}
      {currentStep === 3 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">✨ AI 콘텐츠 생성</h3>

          {/* Current settings summary */}
          <div className="bg-muted rounded-md p-3 text-xs space-y-1">
            <div><span className="text-muted-foreground">주 키워드:</span> <span className="font-medium">{primaryKeyword || '미설정'}</span></div>
            <div><span className="text-muted-foreground">보조 키워드:</span> <span className="font-medium">{secondaryKeywords || '미설정'}</span></div>
            <div><span className="text-muted-foreground">검색 의도:</span> <span className="font-medium">{searchIntent}</span></div>
            <div><span className="text-muted-foreground">Meta Title:</span> <span className="font-medium">{metaTitle || '미설정'}</span></div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {cards.length > 0 && (
            <Badge variant="secondary" className="text-xs">{cards.length}개 섹션</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowPreview(true)} disabled={cards.length === 0}>
            미리보기
          </Button>
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
        </div>
      </div>

      {/* No base article */}
      {!hasBaseArticle && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          기본글에서 콘텐츠를 먼저 작성하면, AI가 Google SEO에 최적화된 WordPress 글로 변환합니다.
          <br />
          <span className="text-xs mt-1 block">H1/H2/H3 구조, 내부링크, alt 텍스트, Schema 마크업 자동 적용</span>
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
      {currentStep === 3 && hasBaseArticle && <AddCardButton onAdd={handleAddSection} />}

          <div className="flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(2)}>← 구조 설계</Button>
            <Button size="sm" onClick={() => setCurrentStep(4)} disabled={cards.length === 0}>다음: SEO 검사 →</Button>
          </div>
        </div>
      )}

      {/* Step 4: SEO 검사 */}
      {currentStep === 4 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">🔍 Google SEO 검사</h3>

          {/* Score Cards */}
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: 'Title', value: metaTitle.length > 0 ? (metaTitle.length <= 60 ? '✓' : '!') : '—', ok: metaTitle.length > 0 && metaTitle.length <= 60 },
              { label: 'Meta Desc', value: metaDescription.length > 0 ? (metaDescription.length <= 160 ? '✓' : '!') : '—', ok: metaDescription.length > 0 && metaDescription.length <= 160 },
              { label: 'Headings', value: cards.length > 0 ? '✓' : '—', ok: cards.length > 0 },
              { label: 'Content', value: cards.length >= 3 ? '✓' : '—', ok: cards.length >= 3 },
            ].map(({ label, value, ok }) => (
              <div key={label} className={cn('rounded-md p-3 border', ok ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-muted')}>
                <div className={`text-lg font-bold ${ok ? 'text-green-500' : 'text-muted-foreground'}`}>{value}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">체크리스트</h4>
            {[
              { check: metaTitle.length > 0 && metaTitle.length <= 60, label: 'Meta Title이 60자 이내' },
              { check: metaTitle.toLowerCase().includes(primaryKeyword.toLowerCase()) && primaryKeyword.length > 0, label: 'Meta Title에 주 키워드 포함' },
              { check: metaDescription.length >= 120 && metaDescription.length <= 160, label: 'Meta Description이 120~160자' },
              { check: urlSlug.length > 0, label: 'URL Slug 설정됨' },
              { check: cards.length >= 3, label: '콘텐츠 섹션 3개 이상' },
              { check: cards.some(c => (c.content as Record<string, unknown>)?.url), label: '이미지 1개 이상 포함' },
              { check: cards.every(c => {
                const content = c.content as Record<string, unknown>;
                return !content?.url || (content?.alt && String(content.alt).length > 0);
              }), label: '모든 이미지에 alt 텍스트' },
            ].map(({ check, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span className={check ? 'text-green-500' : 'text-muted-foreground'}>{check ? '✅' : '⬜'}</span>
                <span className={check ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
              </div>
            ))}
          </div>

          {/* Schema Markup */}
          <div className="bg-muted rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">Schema 마크업</span>
              <Button size="sm" variant="outline" className="h-6 text-[10px]">자동 생성</Button>
            </div>
            <p className="text-[10px] text-muted-foreground">발행 시 Article/FAQ/MedicalEntity Schema를 자동으로 추가합니다.</p>
          </div>

          <div className="flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(3)}>← AI 생성</Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700">✓ 발행 준비 완료</Button>
          </div>
        </div>
      )}

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
      <WordpressPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        title={content.title}
        metaTitle={metaTitle}
        metaDescription={metaDescription}
        cards={cards}
      />
    </div>
  );
}

// ─── Outer: 다중 WordPress 콘텐츠 리스트 ────────────────────────────

export function WordpressPanel() {
  const {
    selectedContentId,
    contents,
    selectedProjectId,
    projects,
    getBaseArticle,
    getBlogContents,
    addBlogContent,
    updateBlogContent,
    deleteBlogContent,
    getChannelModels,
    setChannelModels,
  } = useProjectStore();

  const content = contents.find((c) => c.id === selectedContentId);
  const project = projects.find((p) => p.id === selectedProjectId);

  if (!content || !project) return null;

  const hasBaseArticle = !!getBaseArticle(content.id);
  const wpContents = getBlogContents(content.id);
  const channelModels = getChannelModels(project.id, 'blog');

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Globe size={20} className="text-blue-500" />
          WordPress (Google SEO)
        </h2>
      </div>

      {/* Model Selector */}
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

      {/* Content List */}
      <ChannelContentList<BlogContent>
        items={wpContents}
        getId={(item) => item.id}
        getTitle={(item, index) => item.title || `WordPress 글 ${index + 1}`}
        onTitleChange={(id, title) => updateBlogContent(id, { title })}
        onAdd={() => addBlogContent(content.id)}
        onDelete={(id) => deleteBlogContent(id)}
        addLabel="새 WordPress 글 추가"
        onAddToQueue={(id) => alert(`발행 큐에 추가되었습니다 (ID: ${id})`)}
        renderContent={(blogContent) => (
          <WordpressPanelInner
            key={blogContent.id}
            blogContent={blogContent}
            content={content}
            project={project}
            hasBaseArticle={hasBaseArticle}
            channelModels={channelModels}
          />
        )}
      />
    </div>
  );
}
