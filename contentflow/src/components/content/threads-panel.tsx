'use client';

import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThreadsCardItem, AddPostButton } from './threads-card-item';
import { ChannelModelSelector } from './channel-model-selector';
import { ChannelContentList } from './channel-content-list';
import { PromptEditDialog } from './prompt-edit-dialog';
import { ThreadsPreviewDialog } from './threads-preview-dialog';
import { useAiGeneration } from '@/hooks/use-ai-generation';
import { useCardImageGeneration } from '@/hooks/use-card-image-generation';
import { useProjectStore } from '@/stores/project-store';
import { buildThreadsPrompt } from '@/lib/prompt-builder';
import { Loader2, Copy, Check, Eye } from 'lucide-react';
import { GenerationButton } from './generation-button';
import type { Content, Project, ThreadsContent, ThreadsCard } from '@/types/database';
import { generateId } from '@/lib/utils';

// ─── Inner: individual threads content ────────────────────────────

interface ThreadsPanelInnerProps {
  threadsContent: ThreadsContent;
  content: Content;
  project: Project;
  hasBaseArticle: boolean;
  channelModels: { textModel: string; imageModel: string; aspectRatio: string; imageStyle: string };
}

function ThreadsPanelInner({ threadsContent, content, project, hasBaseArticle, channelModels }: ThreadsPanelInnerProps) {
  const {
    getBaseArticle,
    getThreadsCards,
    setThreadsCardsForContent,
    updateThreadsCard,
    deleteThreadsCard,
    addThreadsCard,
  } = useProjectStore();

  const baseArticle = getBaseArticle(content.id);
  const cards = getThreadsCards(threadsContent.id);

  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  // Text generation
  const { isGenerating, generate, abort } = useAiGeneration({
    onComplete: useCallback(
      (fullText: string) => {
        try {
          const objMatch = fullText.match(/\{[\s\S]*\}/);
          if (!objMatch) throw new Error('JSON not found');
          const parsed = JSON.parse(objMatch[0]) as {
            posts: { text: string; order: number }[];
          };
          if (!parsed.posts?.length) throw new Error('No posts');

          const now = new Date().toISOString();
          const newCards: ThreadsCard[] = parsed.posts
            .sort((a, b) => a.order - b.order)
            .map((post, i) => ({
              id: generateId('tp'),
              threads_content_id: threadsContent.id,
              text_content: post.text || '',
              media_url: null,
              media_type: null,
              sort_order: i,
              created_at: now,
              updated_at: now,
            }));

          setThreadsCardsForContent(threadsContent.id, newCards);
        } catch {
          alert('스레드 포스트 파싱 실패. 다시 시도해 주세요.');
        }
      },
      [threadsContent.id, setThreadsCardsForContent]
    ),
    onError: useCallback((err: string) => {
      alert(`AI 생성 오류: ${err}`);
    }, []),
  });

  // Image generation (공통 훅)
  const { isGeneratingImage, generatingCardId, generateCardImage } = useCardImageGeneration({
    getPrompt: (card: ThreadsCard) => {
      const basePrompt = card.media_type || 'Professional photo related to the post content';
      return channelModels.imageStyle ? `${channelModels.imageStyle}. ${basePrompt}` : basePrompt;
    },
    getExistingImage: (card: ThreadsCard) => card.media_url || null,
    saveResult: (cardId: string, dataUrl: string) => {
      updateThreadsCard(cardId, { media_url: dataUrl, media_type: 'image' });
    },
    imageModel: channelModels.imageModel,
    aspectRatio: channelModels.aspectRatio || '1:1',
    imageStyle: channelModels.imageStyle,
    projectId: project.id,
  });

  const handleGenerateCardImage = (cardId: string) => generateCardImage(cardId, cards);

  const handleGenerate = () => {
    const prompt = buildThreadsPrompt({ project, content, baseArticle: baseArticle ?? undefined });
    setGeneratedPrompt(prompt);
    setShowPromptDialog(true);
  };

  const handleStartGeneration = (prompt: string) => {
    generate(prompt, channelModels.textModel);
  };

  const handleCardUpdate = (cardId: string, updates: Partial<ThreadsCard>) => {
    updateThreadsCard(cardId, updates);
  };

  const handleCardDelete = (cardId: string) => {
    deleteThreadsCard(cardId);
  };

  const handleAddPost = () => {
    addThreadsCard(threadsContent.id, cards.length);
  };

  const handleCopyAll = async () => {
    const allText = cards
      .map((card, i) => `[${i + 1}/${cards.length}]\n${card.text_content}`)
      .join('\n\n---\n\n');
    await navigator.clipboard.writeText(allText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {cards.length > 0 && <Badge variant="secondary" className="text-xs">{cards.length}개 포스트</Badge>}
        </div>
        <div className="flex gap-2">
          <GenerationButton
            variant="text"
            isGenerating={isGenerating}
            disabled={!hasBaseArticle}
            onClick={handleGenerate}
            onAbort={abort}
            className={!isGenerating ? 'bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 text-white' : undefined}
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
              {copied ? '복사됨!' : '전체 복사'}
            </Button>
          )}
        </div>
      </div>

      {/* No base article */}
      {!hasBaseArticle && (
        <p className="text-sm text-muted-foreground">기본 글을 먼저 작성해 주세요.</p>
      )}

      {/* Thread Posts */}
      {cards.length > 0 && (
        <div className="space-y-0">
          {cards.map((card, i) => (
            <ThreadsCardItem
              key={card.id}
              card={card}
              index={i}
              isLast={i === cards.length - 1}
              onUpdate={handleCardUpdate}
              onDelete={handleCardDelete}
              onGenerateImage={handleGenerateCardImage}
              isGeneratingImage={isGeneratingImage}
              generatingCardId={generatingCardId}
            />
          ))}
        </div>
      )}

      {/* Add Post */}
      {hasBaseArticle && <AddPostButton onAdd={handleAddPost} />}

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
      <ThreadsPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        cards={cards}
      />
    </div>
  );
}

// ─── Outer: multi threads content list ────────────────────────────

export function ThreadsPanel() {
  const { selectedContentId, contents, selectedProjectId, projects, getBaseArticle, getThreadsContents, addThreadsContent, updateThreadsContent, deleteThreadsContent, getChannelModels, setChannelModels } = useProjectStore();
  const content = contents.find((c) => c.id === selectedContentId);
  const project = projects.find((p) => p.id === selectedProjectId);
  if (!content || !project) return null;
  const hasBaseArticle = !!getBaseArticle(content.id);
  const threadsContents = getThreadsContents(content.id);
  const channelModels = getChannelModels(project.id, 'threads');

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">스레드</h2>
      </div>

      <ChannelModelSelector
        textModel={channelModels.textModel}
        imageModel={channelModels.imageModel}
        onTextModelChange={(m) => setChannelModels(project.id, 'threads', { textModel: m })}
        onImageModelChange={(m) => setChannelModels(project.id, 'threads', { imageModel: m })}
        showImageModel={true}
        aspectRatio={channelModels.aspectRatio}
        onAspectRatioChange={(r) => setChannelModels(project.id, 'threads', { aspectRatio: r })}
        imageStyle={channelModels.imageStyle}
        onImageStyleChange={(s) => setChannelModels(project.id, 'threads', { imageStyle: s })}
        defaultAspectRatio="1:1"
      />

      <ChannelContentList<ThreadsContent>
        items={threadsContents}
        getId={(item) => item.id}
        getTitle={(item, index) => item.title || `스레드 ${index + 1}`}
        onTitleChange={(id, title) => updateThreadsContent(id, { title })}
        onAdd={() => addThreadsContent(content.id)}
        onDelete={(id) => deleteThreadsContent(id)}
        addLabel="새 스레드 추가"
        renderContent={(threadsContent) => (
          <ThreadsPanelInner
            key={threadsContent.id}
            threadsContent={threadsContent}
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
