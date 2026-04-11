'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BaseArticleEditor, type BaseArticleEditorRef } from '@/components/editor/base-article-editor';
import { PromptEditDialog } from './prompt-edit-dialog';
import { TopicSuggestionDialog, type TopicSuggestion } from './topic-suggestion-dialog';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useAiGeneration } from '@/hooks/use-ai-generation';
import { useProjectStore } from '@/stores/project-store';
import { ChannelModelSelector } from './channel-model-selector';
import { buildBaseArticlePrompt, buildPartialRegenerationPrompt, buildTopicSuggestionPrompt } from '@/lib/prompt-builder';
import { countWords } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Lightbulb, Search, Loader2, X, Pencil, Check } from 'lucide-react';
import { GenerationButton } from './generation-button';
import type { Content, Project } from '@/types/database';

interface BaseArticlePanelInnerProps {
  content: Content;
  project: Project;
}

function BaseArticlePanelInner({ content, project }: BaseArticlePanelInnerProps) {
  const editorRef = useRef<BaseArticleEditorRef>(null);
  const { createOrUpdateBaseArticle, getBaseArticle, updateContent, getChannelModels, setChannelModels } = useProjectStore();
  const baseArticle = getBaseArticle(content.id);
  const channelModels = getChannelModels(project.id, 'base-article');

  const [wordCount, setWordCount] = useState(baseArticle?.word_count ?? 0);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [partialMode, setPartialMode] = useState<string | null>(null);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Topic suggestion state
  const [showTopicDialog, setShowTopicDialog] = useState(false);
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([]);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);

  const { schedule, lastSaved } = useAutoSave({
    onSave: useCallback(
      (data: { html: string; plainText: string; wordCount: number }) => {
        createOrUpdateBaseArticle(content.id, {
          body: data.html,
          body_plain_text: data.plainText,
          word_count: data.wordCount,
        });
      },
      [content.id, createOrUpdateBaseArticle]
    ),
  });

  const handleEditorUpdate = useCallback(
    (html: string, plainText: string, wc: number) => {
      setWordCount(wc);
      schedule(html, plainText, wc);
    },
    [schedule]
  );

  // Article AI generation
  const { isGenerating, generate, abort } = useAiGeneration({
    onChunk: useCallback((_text: string, accumulated: string) => {
      if (throttleRef.current) return;
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null;
        editorRef.current?.setContent(accumulated);
      }, 200);
    }, []),
    onComplete: useCallback(
      (fullText: string) => {
        if (throttleRef.current) {
          clearTimeout(throttleRef.current);
          throttleRef.current = null;
        }
        if (partialMode) {
          editorRef.current?.replaceSelection(fullText);
          setPartialMode(null);
        } else {
          editorRef.current?.setContent(fullText);
        }
        const plain = fullText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const wc = countWords(plain);
        setWordCount(wc);
        createOrUpdateBaseArticle(content.id, {
          body: fullText,
          body_plain_text: plain,
          word_count: wc,
        });
      },
      [content.id, createOrUpdateBaseArticle, partialMode]
    ),
    onError: useCallback((err: string) => {
      alert(`AI 생성 오류: ${err}`);
      setPartialMode(null);
    }, []),
  });

  // Topic AI generation (separate hook instance)
  const topicGeneration = useAiGeneration({
    onComplete: useCallback((fullText: string) => {
      setIsGeneratingTopics(false);
      try {
        const jsonMatch = fullText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('JSON 형식을 찾을 수 없습니다.');
        const parsed = JSON.parse(jsonMatch[0]) as TopicSuggestion[];
        setTopicSuggestions(parsed);
        setTopicError(null);
      } catch {
        setTopicError('주제 파싱 실패. 다시 시도해 주세요.');
        setTopicSuggestions([]);
      }
    }, []),
    onError: useCallback((err: string) => {
      setIsGeneratingTopics(false);
      setTopicError(err);
    }, []),
  });

  // Handlers
  const handleTopicGenerate = (hint?: string) => {
    const prompt = buildTopicSuggestionPrompt({ project, content, topicHint: hint });
    setTopicSuggestions([]);
    setTopicError(null);
    setIsGeneratingTopics(true);
    setShowTopicDialog(true);
    topicGeneration.generate(prompt, channelModels.textModel);
  };

  const handleTopicSelect = (topic: TopicSuggestion) => {
    const topicText = `${topic.title}\n\n${topic.outline}`;
    updateContent(content.id, { topic: topicText, title: topic.title });
  };

  const handleClearTopic = () => {
    updateContent(content.id, { topic: null });
  };

  const handleAiGenerate = () => {
    const prompt = buildBaseArticlePrompt({ project, content });
    setGeneratedPrompt(prompt);
    setPartialMode(null);
    setShowPromptDialog(true);
  };

  const handlePartialRegenerate = (selectedText: string) => {
    const fullText = editorRef.current?.getPlainText() ?? '';
    const prompt = buildPartialRegenerationPrompt({ project, content }, selectedText, fullText);
    setPartialMode(selectedText);
    generate(prompt, channelModels.textModel);
  };

  const handleStartGeneration = (prompt: string) => {
    generate(prompt, channelModels.textModel);
  };

  // Topic editing state
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [editingTopicText, setEditingTopicText] = useState('');

  const handleStartEditTopic = () => {
    setEditingTopicText(content.topic ?? '');
    setIsEditingTopic(true);
  };

  const handleSaveEditTopic = () => {
    const trimmed = editingTopicText.trim();
    if (trimmed) {
      // Extract title from first line
      const firstLine = trimmed.split('\n')[0].trim();
      updateContent(content.id, { topic: trimmed, title: firstLine });
    }
    setIsEditingTopic(false);
  };

  const handleCancelEditTopic = () => {
    setIsEditingTopic(false);
  };

  const hasTopic = !!content.topic;

  // 주제가 있고 기본글이 비어있으면 자동 AI 생성 시작
  const autoGeneratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      hasTopic &&
      !isGenerating &&
      !baseArticle?.body &&
      autoGeneratedRef.current !== content.id
    ) {
      autoGeneratedRef.current = content.id;
      const prompt = buildBaseArticlePrompt({ project, content });
      generate(prompt, channelModels.textModel);
    }
  }, [content.id, hasTopic, isGenerating, baseArticle?.body, project, content, generate, channelModels.textModel]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">기본 글</h2>
          <Badge variant="secondary" className="text-xs">
            {wordCount}자
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowTopicDialog(true); }} disabled={isGenerating || isGeneratingTopics} className="gap-1.5">
            <Lightbulb size={14} /> AI 주제뽑기
          </Button>
          <GenerationButton
            variant="text"
            isGenerating={isGenerating}
            disabled={!hasTopic}
            onClick={handleAiGenerate}
            onAbort={abort}
            label="AI 글 생성"
          />
          <Button variant="outline" disabled className="gap-1.5">
            <Search size={14} /> Perplexity 첨삭
          </Button>
        </div>
      </div>

      {/* Model Selector */}
      <ChannelModelSelector
        textModel={channelModels.textModel}
        imageModel={channelModels.imageModel}
        onTextModelChange={(m) => setChannelModels(project.id, 'base-article', { textModel: m })}
        onImageModelChange={(m) => setChannelModels(project.id, 'base-article', { imageModel: m })}
        showImageModel={false}
      />

      {/* Selected topic display / edit */}
      {hasTopic && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-primary mb-1">선택된 주제</p>
            <div className="flex gap-1">
              {isEditingTopic ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleSaveEditTopic} className="shrink-0 h-6 w-6 p-0 text-primary hover:text-primary">
                    <Check size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancelEditTopic} className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                    <X size={14} />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={handleStartEditTopic} className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-primary">
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClearTopic} className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                    <X size={14} />
                  </Button>
                </>
              )}
            </div>
          </div>
          {isEditingTopic ? (
            <Textarea
              value={editingTopicText}
              onChange={(e) => setEditingTopicText(e.target.value)}
              className="mt-1 text-sm h-32 resize-none overflow-y-auto bg-background"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancelEditTopic();
              }}
            />
          ) : (
            <p className="text-sm whitespace-pre-line cursor-pointer" onClick={handleStartEditTopic}>{content.topic}</p>
          )}
        </div>
      )}

      {!hasTopic && (
        <p className="text-sm text-muted-foreground">
          &quot;AI 주제뽑기&quot;로 주제를 먼저 선택하면, 해당 주제로 글을 생성할 수 있습니다.
        </p>
      )}

      {/* Auto-save status */}
      {lastSaved && (
        <p className="text-xs text-muted-foreground">
          마지막 저장: {lastSaved.toLocaleTimeString('ko-KR')}
        </p>
      )}

      {/* Editor */}
      <BaseArticleEditor
        ref={editorRef}
        initialContent={baseArticle?.body}
        onUpdate={handleEditorUpdate}
        onPartialRegenerate={handlePartialRegenerate}
        projectId={project.id}
      />

      {/* Prompt Dialog */}
      <PromptEditDialog
        open={showPromptDialog}
        onOpenChange={setShowPromptDialog}
        initialPrompt={generatedPrompt}
        isGenerating={isGenerating}
        onGenerate={handleStartGeneration}
        onAbort={abort}
      />

      {/* Topic Suggestion Dialog */}
      <TopicSuggestionDialog
        open={showTopicDialog}
        onOpenChange={setShowTopicDialog}
        topics={topicSuggestions}
        isGenerating={isGeneratingTopics}
        error={topicError}
        onSelect={handleTopicSelect}
        onRegenerate={handleTopicGenerate}
      />
    </div>
  );
}

export function BaseArticlePanel() {
  const { selectedContentId, contents, selectedProjectId, projects } = useProjectStore();
  const content = contents.find((c) => c.id === selectedContentId);
  const project = projects.find((p) => p.id === selectedProjectId);
  if (!content || !project) return null;
  return <BaseArticlePanelInner key={content.id} content={content} project={project} />;
}
