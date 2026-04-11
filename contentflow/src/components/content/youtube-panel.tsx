'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TimelineCard, AddSceneButton, SECTION_TYPES, getSectionInfo } from './youtube-card-item';
import { ChannelModelSelector } from './channel-model-selector';
import { ChannelContentList } from './channel-content-list';
import { PromptEditDialog } from './prompt-edit-dialog';
import { YoutubePreviewDialog } from './youtube-preview-dialog';
import { useAiGeneration } from '@/hooks/use-ai-generation';
import { useCardImageGeneration } from '@/hooks/use-card-image-generation';
import { useProjectStore } from '@/stores/project-store';
import { buildYoutubePrompt, buildYoutubeImagePrompt, buildYoutubeVideoPrompt } from '@/lib/prompt-builder';
import {
  Loader2, Copy, Check, Eye, Clock, ImageIcon,
  ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import { GenerationButton } from './generation-button';
import { ImageCardWidget } from './image-card-widget';
import type { Content, Project, YoutubeContent, YoutubeCard, VideoDuration } from '@/types/database';
import { generateId } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ─── Inner: Vrew-style youtube editor ────────────────────────────

interface YoutubePanelInnerProps {
  youtubeContent: YoutubeContent;
  content: Content;
  project: Project;
  hasBaseArticle: boolean;
  channelModels: { textModel: string; imageModel: string; aspectRatio: string; imageStyle: string };
}

function YoutubePanelInner({ youtubeContent, content, project, hasBaseArticle, channelModels }: YoutubePanelInnerProps) {
  const {
    getBaseArticle,
    getYoutubeCards,
    setYoutubeCardsForContent,
    updateYoutubeCard,
    deleteYoutubeCard,
    addYoutubeCard,
    updateYoutubeContent,
  } = useProjectStore();

  const baseArticle = getBaseArticle(content.id);
  const cards = getYoutubeCards(youtubeContent.id);

  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const narrationRef = useRef<HTMLTextAreaElement>(null);

  // Auto-select first card when cards change
  useEffect(() => {
    if (cards.length > 0 && (!selectedCardId || !cards.find(c => c.id === selectedCardId))) {
      setSelectedCardId(cards[0].id);
    }
    if (cards.length === 0) setSelectedCardId(null);
  }, [cards, selectedCardId]);

  // Auto-resize narration
  useEffect(() => {
    const ta = narrationRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [selectedCardId, cards]);

  const selectedCard = cards.find(c => c.id === selectedCardId) ?? null;
  const selectedIndex = selectedCard ? cards.findIndex(c => c.id === selectedCard.id) : -1;

  // ─── Text generation ────────────────────────────────
  const { isGenerating, generate, abort } = useAiGeneration({
    onComplete: useCallback(
      (fullText: string) => {
        try {
          const objMatch = fullText.match(/\{[\s\S]*\}/);
          if (!objMatch) throw new Error('JSON not found');
          const parsed = JSON.parse(objMatch[0]) as {
            video_title?: string;
            video_description?: string;
            video_tags?: string[];
            sections: { section_type: string; narration_text: string; screen_direction: string; subtitle_text?: string }[];
          };
          if (!parsed.sections?.length) throw new Error('No sections');

          if (parsed.video_title || parsed.video_description || parsed.video_tags) {
            updateYoutubeContent(youtubeContent.id, {
              ...(parsed.video_title ? { video_title: parsed.video_title } : {}),
              ...(parsed.video_description ? { video_description: parsed.video_description } : {}),
              ...(parsed.video_tags ? { video_tags: parsed.video_tags } : {}),
            });
          }

          const now = new Date().toISOString();
          const newCards: YoutubeCard[] = parsed.sections.map((sec, i) => {
            const tempCard = {
              section_type: sec.section_type || 'main',
              narration_text: sec.narration_text || '',
              screen_direction: sec.screen_direction || '',
              subtitle_text: sec.subtitle_text ?? null,
            } as YoutubeCard;
            return {
              id: generateId('yc'),
              youtube_content_id: youtubeContent.id,
              section_type: tempCard.section_type,
              narration_text: tempCard.narration_text,
              screen_direction: tempCard.screen_direction,
              subtitle_text: tempCard.subtitle_text,
              image_url: null,
              image_prompt: buildYoutubeImagePrompt(project, tempCard, channelModels.imageStyle),
              video_prompt: buildYoutubeVideoPrompt(project, tempCard, channelModels.imageStyle),
              sort_order: i,
              created_at: now,
              updated_at: now,
            };
          });

          setYoutubeCardsForContent(youtubeContent.id, newCards);
          if (newCards.length > 0) setSelectedCardId(newCards[0].id);
        } catch {
          alert('대본 파싱 실패. 다시 시도해 주세요.');
        }
      },
      [youtubeContent.id, setYoutubeCardsForContent, updateYoutubeContent, project, channelModels.imageStyle]
    ),
    onError: useCallback((err: string) => {
      alert(`AI 생성 오류: ${err}`);
    }, []),
  });

  // ─── Image generation (공통 훅) ─────────────────────
  const { isGeneratingImage, generatingCardId, imageProgress, generateCardImage, generateAllImages: generateAllCardImages, abort: abortImageGeneration } = useCardImageGeneration({
    getPrompt: (card: YoutubeCard) => card.image_prompt || buildYoutubeImagePrompt(project, card, channelModels.imageStyle),
    getExistingImage: (card: YoutubeCard) => card.image_url || null,
    saveResult: (cardId: string, dataUrl: string, prompt: string) => {
      updateYoutubeCard(cardId, { image_url: dataUrl, image_prompt: prompt });
    },
    shouldSkip: (card: YoutubeCard) => !!card.image_url,
    imageModel: channelModels.imageModel,
    aspectRatio: channelModels.aspectRatio || '16:9',
    imageStyle: channelModels.imageStyle,
    projectId: project.id,
  });

  const handleGenerateCardImage = (cardId: string) => generateCardImage(cardId, cards);
  const handleGenerateAllImages = () => generateAllCardImages(cards);

  // ─── Handlers ───────────────────────────────────────
  const handleGenerate = () => {
    const prompt = buildYoutubePrompt({
      project,
      content,
      baseArticle: baseArticle ?? undefined,
      youtubeContent,
    });
    setGeneratedPrompt(prompt);
    setShowPromptDialog(true);
  };

  const handleStartGeneration = (prompt: string) => {
    generate(prompt, channelModels.textModel);
  };

  const handleCardUpdate = (cardId: string, updates: Partial<YoutubeCard>) => {
    updateYoutubeCard(cardId, updates);
  };

  const handleCardDelete = (cardId: string) => {
    deleteYoutubeCard(cardId);
    if (selectedCardId === cardId) {
      const remaining = cards.filter(c => c.id !== cardId);
      setSelectedCardId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleAddSection = () => {
    addYoutubeCard(youtubeContent.id, cards.length);
    // Select the newly added card
    setTimeout(() => {
      const latest = useProjectStore.getState().getYoutubeCards(youtubeContent.id);
      if (latest.length > 0) {
        setSelectedCardId(latest[latest.length - 1].id);
      }
    }, 50);
  };

  const handleCopyAll = async () => {
    const text = cards
      .map((card, i) => {
        const lines: string[] = [];
        lines.push(`[${i + 1}] ${(card.section_type ?? 'main').toUpperCase()}`);
        if (card.narration_text) lines.push(`나레이션: ${card.narration_text}`);
        if (card.screen_direction) lines.push(`화면: ${card.screen_direction}`);
        if (card.subtitle_text) lines.push(`자막: ${card.subtitle_text}`);
        return lines.join('\n');
      })
      .join('\n\n---\n\n');
    const fullText = youtubeContent.video_title ? `# ${youtubeContent.video_title}\n\n${text}` : text;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrevCard = () => {
    if (selectedIndex > 0) setSelectedCardId(cards[selectedIndex - 1].id);
  };
  const handleNextCard = () => {
    if (selectedIndex < cards.length - 1) setSelectedCardId(cards[selectedIndex + 1].id);
  };

  const totalChars = cards.reduce((sum, c) => sum + (c.narration_text?.length ?? 0), 0);
  const estimatedMinutes = Math.max(1, Math.round(totalChars / 250));

  const selectedSectionInfo = selectedCard ? getSectionInfo(selectedCard.section_type) : null;

  return (
    <div className="space-y-3">
      {/* Video Settings (collapsible) */}
      <button
        onClick={() => setShowVideoSettings(!showVideoSettings)}
        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <ChevronDown size={12} className={cn('transition-transform', !showVideoSettings && '-rotate-90')} />
        <Clock size={12} />
        영상 설정
        {youtubeContent.video_title && (
          <span className="font-normal text-muted-foreground/70 truncate ml-2">{youtubeContent.video_title}</span>
        )}
      </button>

      {showVideoSettings && (
        <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/20">
          <Input
            value={youtubeContent.video_title ?? ''}
            onChange={(e) => updateYoutubeContent(youtubeContent.id, { video_title: e.target.value })}
            placeholder="영상 제목"
            className="text-sm"
          />
          <div className="flex gap-2">
            <select
              value={youtubeContent.target_duration ?? 'mid'}
              onChange={(e) => updateYoutubeContent(youtubeContent.id, { target_duration: e.target.value as VideoDuration })}
              className="text-xs px-3 py-1.5 rounded-md border border-border bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="short">숏폼 (1~3분)</option>
              <option value="mid">표준 (5~10분)</option>
              <option value="long">롱폼 (15~30분)</option>
            </select>
            <Input
              value={(youtubeContent.video_tags ?? []).join(', ')}
              onChange={(e) =>
                updateYoutubeContent(youtubeContent.id, {
                  video_tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                })
              }
              placeholder="태그 (쉼표로 구분)"
              className="text-xs flex-1"
            />
          </div>
          <Textarea
            value={youtubeContent.video_description ?? ''}
            onChange={(e) => updateYoutubeContent(youtubeContent.id, { video_description: e.target.value })}
            placeholder="영상 설명"
            className="text-xs h-16 resize-none"
          />
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {cards.length > 0 && <Badge variant="secondary" className="text-xs">{cards.length}개 씬</Badge>}
          {cards.length > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Clock size={10} /> ~{estimatedMinutes}분
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <GenerationButton
            variant="text"
            isGenerating={isGenerating}
            disabled={!hasBaseArticle}
            onClick={handleGenerate}
            onAbort={abort}
            label="AI 대본"
            loadingLabel="대본 생성 중..."
            className={!isGenerating ? 'bg-red-600 hover:bg-red-700 text-white' : undefined}
          />
          <GenerationButton
            variant="batch-image"
            isGenerating={isGeneratingImage}
            disabled={cards.length === 0}
            onClick={handleGenerateAllImages}
            onAbort={abortImageGeneration}
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
          {cards.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-1.5">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '복사됨!' : '복사'}
            </Button>
          )}
        </div>
      </div>

      {/* No base article */}
      {!hasBaseArticle && (
        <p className="text-sm text-muted-foreground">기본 글을 먼저 작성해 주세요.</p>
      )}

      {/* ─── Preview + Script Editor (2 columns) ─── */}
      {cards.length > 0 && selectedCard && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: Preview (3/5) */}
          <div className="lg:col-span-3 space-y-3">
            {/* Scene image */}
            <div className="relative">
              <ImageCardWidget
                src={selectedCard.image_url || null}
                alt={`씬 ${selectedIndex + 1}`}
                aspectClass="aspect-video"
                isGenerating={generatingCardId === selectedCard.id}
                onRegenerate={() => handleGenerateCardImage(selectedCard.id)}
                onDelete={() => updateYoutubeCard(selectedCard.id, { image_url: null })}
                onUpload={(file) => {
                  const reader = new FileReader();
                  reader.onload = () => updateYoutubeCard(selectedCard.id, { image_url: reader.result as string });
                  reader.readAsDataURL(file);
                }}
                placeholder="이미지 생성 또는 업로드"
              />
              {/* Section badge */}
              {selectedSectionInfo && (
                <div className="absolute top-3 left-3 z-10">
                  <span className={cn('text-xs font-bold px-2 py-1 rounded text-white', selectedSectionInfo.color)}>
                    {selectedSectionInfo.label}
                  </span>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="sm" onClick={handlePrevCard} disabled={selectedIndex <= 0}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                {selectedIndex + 1} / {cards.length}
              </span>
              <Button variant="ghost" size="sm" onClick={handleNextCard} disabled={selectedIndex >= cards.length - 1}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          {/* Right: Script Editor (2/5) */}
          <div className="lg:col-span-2 space-y-3">
            {/* Section type */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">씬 타입</span>
              <select
                value={selectedCard.section_type ?? 'main'}
                onChange={(e) => handleCardUpdate(selectedCard.id, { section_type: e.target.value })}
                className="text-xs font-medium px-2 py-1 rounded-md border border-border bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary flex-1"
              >
                {SECTION_TYPES.map((st) => (
                  <option key={st.value} value={st.value}>{st.label}</option>
                ))}
              </select>
            </div>

            {/* Narration */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">나레이션</label>
              <textarea
                ref={narrationRef}
                value={selectedCard.narration_text ?? ''}
                onChange={(e) => handleCardUpdate(selectedCard.id, { narration_text: e.target.value })}
                placeholder="나레이터가 읽을 대본..."
                className="w-full bg-muted/30 rounded-lg p-3 text-sm resize-none focus:outline-none min-h-[100px] placeholder:text-muted-foreground/50 border border-border/50"
                rows={4}
              />
              <span className="text-[10px] text-muted-foreground">{selectedCard.narration_text?.length ?? 0}자</span>
            </div>

            {/* Screen direction */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">화면 디렉션</label>
              <textarea
                value={selectedCard.screen_direction ?? ''}
                onChange={(e) => handleCardUpdate(selectedCard.id, { screen_direction: e.target.value })}
                placeholder="B-roll, 텍스트 오버레이, 그래프 등..."
                className="w-full bg-muted/30 rounded-lg p-3 text-xs resize-none focus:outline-none min-h-[60px] placeholder:text-muted-foreground/50 border border-border/50"
                rows={2}
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">자막</label>
              <input
                value={selectedCard.subtitle_text ?? ''}
                onChange={(e) => handleCardUpdate(selectedCard.id, { subtitle_text: e.target.value })}
                placeholder="화면에 표시할 짧은 자막..."
                className="w-full bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/50 border-b border-border/50 pb-1 px-1"
              />
            </div>

            {/* Image prompt + generate */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">이미지 프롬프트</label>
              <textarea
                value={selectedCard.image_prompt ?? ''}
                onChange={(e) => handleCardUpdate(selectedCard.id, { image_prompt: e.target.value })}
                placeholder="이미지 생성 프롬프트..."
                className="w-full bg-muted/30 rounded-lg p-2 text-xs resize-none focus:outline-none min-h-[40px] placeholder:text-muted-foreground/50 border border-border/50"
                rows={2}
              />
              <Button
                onClick={() => handleGenerateCardImage(selectedCard.id)}
                disabled={isGeneratingImage}
                size="sm"
                variant="outline"
                className="w-full gap-1.5 mt-1"
              >
                {generatingCardId === selectedCard.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <ImageIcon size={12} />
                )}
                {selectedCard.image_url ? '이미지 재생성' : '이미지 생성'}
              </Button>
            </div>

            {/* Video prompt */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">영상 프롬프트</label>
              <textarea
                value={selectedCard.video_prompt ?? ''}
                onChange={(e) => handleCardUpdate(selectedCard.id, { video_prompt: e.target.value })}
                placeholder="영상 생성 프롬프트..."
                className="w-full bg-muted/30 rounded-lg p-2 text-xs resize-none focus:outline-none min-h-[40px] placeholder:text-muted-foreground/50 border border-border/50"
                rows={2}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Timeline ─── */}
      {cards.length > 0 && (
        <div className="border-t border-border pt-3">
          <div
            ref={timelineRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
          >
            {cards.map((card, i) => (
              <TimelineCard
                key={card.id}
                card={card}
                index={i}
                isSelected={card.id === selectedCardId}
                onClick={() => setSelectedCardId(card.id)}
                onDelete={handleCardDelete}
              />
            ))}
            {hasBaseArticle && <AddSceneButton onAdd={handleAddSection} />}
          </div>
        </div>
      )}

      {/* Empty state: just add button */}
      {cards.length === 0 && hasBaseArticle && (
        <div className="flex justify-center py-6">
          <Button variant="outline" onClick={handleAddSection} className="gap-2">
            AI 대본을 생성하거나 수동으로 씬을 추가하세요
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <PromptEditDialog
        open={showPromptDialog}
        onOpenChange={setShowPromptDialog}
        initialPrompt={generatedPrompt}
        isGenerating={isGenerating}
        onGenerate={handleStartGeneration}
        onAbort={abort}
      />
      <YoutubePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        cards={cards}
        videoTitle={youtubeContent.video_title}
      />
    </div>
  );
}

// ─── Outer: multi youtube content list ────────────────────────────

export function YoutubePanel() {
  const { selectedContentId, contents, selectedProjectId, projects, getBaseArticle, getYoutubeContents, addYoutubeContent, updateYoutubeContent, deleteYoutubeContent, getChannelModels, setChannelModels } = useProjectStore();
  const content = contents.find((c) => c.id === selectedContentId);
  const project = projects.find((p) => p.id === selectedProjectId);
  if (!content || !project) return null;
  const hasBaseArticle = !!getBaseArticle(content.id);
  const youtubeContents = getYoutubeContents(content.id);
  const channelModels = getChannelModels(project.id, 'youtube');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">유튜브</h2>
      </div>

      <ChannelModelSelector
        textModel={channelModels.textModel}
        imageModel={channelModels.imageModel}
        onTextModelChange={(m) => setChannelModels(project.id, 'youtube', { textModel: m })}
        onImageModelChange={(m) => setChannelModels(project.id, 'youtube', { imageModel: m })}
        showImageModel={true}
        aspectRatio={channelModels.aspectRatio}
        onAspectRatioChange={(r) => setChannelModels(project.id, 'youtube', { aspectRatio: r })}
        imageStyle={channelModels.imageStyle}
        onImageStyleChange={(s) => setChannelModels(project.id, 'youtube', { imageStyle: s })}
        defaultAspectRatio="16:9"
      />

      <ChannelContentList<YoutubeContent>
        items={youtubeContents}
        getId={(item) => item.id}
        getTitle={(item, index) => item.title || `유튜브 대본 ${index + 1}`}
        onTitleChange={(id, title) => updateYoutubeContent(id, { title })}
        onAdd={() => addYoutubeContent(content.id)}
        onDelete={(id) => deleteYoutubeContent(id)}
        addLabel="새 유튜브 대본 추가"
        renderContent={(youtubeContent) => (
          <YoutubePanelInner
            key={youtubeContent.id}
            youtubeContent={youtubeContent}
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
