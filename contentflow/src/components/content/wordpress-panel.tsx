'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BlogCardItem, AddCardButton } from './blog-card-item';
import { ChannelModelSelector } from './channel-model-selector';
import { ChannelContentList } from './channel-content-list';
import { PromptEditDialog } from './prompt-edit-dialog';
import { useAiGeneration } from '@/hooks/use-ai-generation';
import { useCardImageGeneration } from '@/hooks/use-card-image-generation';
import { useProjectStore } from '@/stores/project-store';
import { buildBlogPrompt, buildBlogImagePromptForCard } from '@/lib/prompt-builder';
import { GenerationButton } from './generation-button';
import { Globe } from 'lucide-react';
import { generateId } from '@/lib/utils';
import type { Content, Project, BlogContent, BlogCard } from '@/types/database';

// ─── Inner: 개별 WordPress 콘텐츠 ────────────────────────────────

interface WordpressPanelInnerProps {
  blogContent: BlogContent;
  content: Content;
  project: Project;
  hasBaseArticle: boolean;
  channelModels: { textModel: string; imageModel: string; aspectRatio: string; imageStyle: string };
}

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
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  // SEO meta fields
  const [metaTitle, setMetaTitle] = useState(blogContent.seo_title ?? '');
  const [metaDescription, setMetaDescription] = useState('');
  const [urlSlug, setUrlSlug] = useState('');

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
    const prompt = buildBlogPrompt({
      project,
      content,
      baseArticle: baseArticle ?? undefined,
      seoTitle: metaTitle,
      keywords: { primary: content.tags?.[0] ?? '', secondary: content.tags?.slice(1) ?? [] },
    });
    // Append Google SEO instruction
    const wpPrompt = `${prompt}\n\n## WordPress / Google SEO 최적화 지침\n- H1/H2/H3 계층 구조를 명확히 사용하세요\n- 각 섹션에 내부링크 기회를 제안하세요\n- 이미지 alt 텍스트를 키워드가 포함된 설명형으로 작성하세요\n- Meta title은 60자 이내, meta description은 160자 이내로 작성하세요\n- 구글 검색 의도에 맞는 자연스러운 키워드 배치를 사용하세요`;
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
      {/* Google SEO Score Placeholder */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Globe size={14} className="text-blue-500" />
          Google SEO 점수
          <Badge variant="outline" className="text-xs">준비중</Badge>
        </h3>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { label: 'Title', value: metaTitle.length > 0 ? (metaTitle.length <= 60 ? '✓' : '!') : '—', ok: metaTitle.length > 0 && metaTitle.length <= 60 },
            { label: 'Meta Desc', value: metaDescription.length > 0 ? (metaDescription.length <= 160 ? '✓' : '!') : '—', ok: metaDescription.length > 0 && metaDescription.length <= 160 },
            { label: 'Headings', value: '—', ok: false },
            { label: 'Schema', value: '—', ok: false },
          ].map(({ label, value, ok }) => (
            <div key={label} className="bg-muted rounded-md p-3">
              <div className={`text-lg font-bold ${ok ? 'text-green-600' : 'text-muted-foreground'}`}>{value}</div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SEO Meta Fields */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <h3 className="text-sm font-semibold">SEO 메타 정보</h3>
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
