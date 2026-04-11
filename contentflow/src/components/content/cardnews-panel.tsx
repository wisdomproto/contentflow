'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardNewsCardItem, AddSlideButton, parseCanvasData, defaultCanvasData, type CardCanvasData, type TextBlock } from './cardnews-card-item';
import { CARD_TEMPLATES, type CardTemplate } from './cardnews-templates';
import { ChannelModelSelector } from './channel-model-selector';
import { ChannelContentList } from './channel-content-list';
import { PromptEditDialog } from './prompt-edit-dialog';
import { useAiGeneration } from '@/hooks/use-ai-generation';
import { useCardImageGeneration } from '@/hooks/use-card-image-generation';
import { base64ToBlob } from '@/hooks/use-r2-upload';
import { useProjectStore } from '@/stores/project-store';
import { buildCardNewsImagePromptsPrompt } from '@/lib/prompt-builder';

import { Eye, EyeOff, Loader2, Hash, X, Download, Upload, RefreshCw, ChevronDown, Save } from 'lucide-react';
import { GenerationButton } from './generation-button';
import type { Content, Project, InstagramContent, InstagramCard, BlogCard } from '@/types/database';
import { generateId, cn } from '@/lib/utils';

// ─── Module-level batch image generation (survives tab switches) ──

interface BatchJob {
  id: string;
  abortController: AbortController;
  progress: { current: number; total: number };
  currentSlideIndex: number;  // which slide is being generated right now
  isRunning: boolean;
  listeners: Set<() => void>;
}

const batchJobs = new Map<string, BatchJob>();

function getBatchJob(igContentId: string): BatchJob | undefined {
  return batchJobs.get(igContentId);
}

function subscribeBatch(igContentId: string, listener: () => void): () => void {
  const job = batchJobs.get(igContentId);
  if (job) job.listeners.add(listener);
  return () => { job?.listeners.delete(listener); };
}

function notifyBatch(job: BatchJob) {
  job.listeners.forEach(fn => fn());
}

async function runBatchImageGeneration(
  igContentId: string,
  prompts: { prompt: string; aspectRatio: string; slideIndex: number }[],
  imageModel: string,
  projectId: string,
) {
  if (batchJobs.get(igContentId)?.isRunning) return;

  const controller = new AbortController();
  const job: BatchJob = {
    id: igContentId,
    abortController: controller,
    progress: { current: 0, total: prompts.length },
    currentSlideIndex: -1,
    isRunning: true,
    listeners: batchJobs.get(igContentId)?.listeners ?? new Set(),
  };
  batchJobs.set(igContentId, job);
  notifyBatch(job);

  for (let i = 0; i < prompts.length; i++) {
    if (controller.signal.aborted) break;
    job.progress = { current: i, total: prompts.length };
    job.currentSlideIndex = prompts[i].slideIndex;
    notifyBatch(job);

    const p = prompts[i];
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p.prompt, model: imageModel, aspectRatio: p.aspectRatio }),
        signal: controller.signal,
      });
      if (!res.ok) { console.warn(`[batch] Slide ${i + 1} HTTP ${res.status}`); continue; }
      const data = await res.json();
      if (!data?.image) continue;

      const store = useProjectStore.getState();
      const cards = store.getInstagramCards(igContentId);
      const card = cards[p.slideIndex];
      if (!card) continue;

      let savedUrl = `data:${data.mimeType};base64,${data.image}`;
      try {
        const blob = base64ToBlob(data.image, data.mimeType);
        const presignRes = await fetch('/api/storage/presign', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, category: 'images', fileName: `${card.id}.${data.mimeType?.split('/')[1] || 'png'}`, contentType: data.mimeType, contentId: card.id }),
        });
        if (presignRes.ok) {
          const { presignedUrl, publicUrl } = await presignRes.json();
          const uploadRes = await fetch(presignedUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': data.mimeType } });
          if (uploadRes.ok) savedUrl = publicUrl;
        }
      } catch { /* R2 fail → keep data URL */ }

      store.updateInstagramCard(card.id, { background_image_url: savedUrl });
    } catch (err) {
      if ((err as Error).name === 'AbortError') break;
      console.warn(`[batch] Slide ${i + 1} error:`, (err as Error).message);
    }
  }

  job.progress = { current: prompts.length, total: prompts.length };
  job.currentSlideIndex = -1;
  job.isRunning = false;
  notifyBatch(job);
  // Cleanup after a bit
  setTimeout(() => { if (!job.isRunning) batchJobs.delete(igContentId); }, 3000);
}

function abortBatch(igContentId: string) {
  const job = batchJobs.get(igContentId);
  if (job) {
    job.abortController.abort();
    job.isRunning = false;
    notifyBatch(job);
    batchJobs.delete(igContentId);
  }
}

/** Hook to subscribe to batch progress */
function useBatchProgress(igContentId: string) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    return subscribeBatch(igContentId, () => forceUpdate(n => n + 1));
  }, [igContentId]);
  const job = getBatchJob(igContentId);
  return {
    isRunning: job?.isRunning ?? false,
    progress: job?.progress ?? { current: 0, total: 0 },
    currentSlideIndex: job?.currentSlideIndex ?? -1,
  };
}

// ─── Inner: 개별 카드뉴스 콘텐츠 ────────────────────────────

interface CardNewsPanelInnerProps {
  igContent: InstagramContent;
  content: Content;
  project: Project;
  hasBaseArticle: boolean;
  channelModels: { textModel: string; imageModel: string; aspectRatio: string; imageStyle: string };
}

function CardNewsPanelInner({ igContent, content, project, hasBaseArticle, channelModels }: CardNewsPanelInnerProps) {
  const {
    getBaseArticle,
    getInstagramCards,
    updateInstagramContent,
    setInstagramCardsForContent,
    updateInstagramCard,
    deleteInstagramCard,
    addInstagramCard,
    getBlogContents,
    getBlogCards,
    setChannelModels,
  } = useProjectStore();

  const baseArticle = getBaseArticle(content.id);
  const cards = getInstagramCards(igContent.id);

  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [caption, setCaption] = useState(igContent.caption ?? '');
  const [slideTexts, setSlideTexts] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [hashtagInput, setHashtagInput] = useState('');
  const hashtags = igContent.hashtags ?? [];

  // Section collapse states
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [isTemplatePropsOpen, setIsTemplatePropsOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<CardTemplate[]>(() => {
    try { const s = localStorage.getItem('cf-saved-templates'); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  const saveCurrentAsTemplate = () => {
    const firstCard = cards[0];
    if (!firstCard) return;
    const data = parseCanvasData(firstCard.text_style, firstCard.background_image_url);
    const name = prompt('템플릿 이름을 입력하세요:');
    if (!name?.trim()) return;
    const tpl: CardTemplate = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      bgColor: data.bgColor,
      imageY: data.imageY,
      preview: { bg: data.bgColor, textColor: data.textBlocks[0]?.color || '#ffffff' },
      textBlocks: data.textBlocks.map(({ text, ...rest }) => rest),
    };
    setSavedTemplates(prev => {
      const next = [...prev, tpl];
      localStorage.setItem('cf-saved-templates', JSON.stringify(next));
      return next;
    });
  };

  const deleteSavedTemplate = (id: string) => {
    setSavedTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      localStorage.setItem('cf-saved-templates', JSON.stringify(next));
      return next;
    });
    if (activeTemplateId === id) setActiveTemplateId(null);
  };

  const allTemplates = [...CARD_TEMPLATES, ...savedTemplates];
  const [isCaptionOpen, setIsCaptionOpen] = useState(false);
  const [isSlideTextOpen, setIsSlideTextOpen] = useState(false);

  // 슬라이드 텍스트 초기화
  useEffect(() => {
    if (cards.length > 0 && !slideTexts) {
      const texts = cards.map(c => c.text_content || '').join('\n\n');
      if (texts.trim()) setSlideTexts(texts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [igContent.id]);

  // 해시태그 자동 세팅
  useEffect(() => {
    if (hashtags.length > 0) return;
    const tags = content.tags ?? [];
    if (tags.length === 0) return;
    const autoHashtags = tags.map(t => t.replace(/\s+/g, '').replace(/^#/, '')).filter(Boolean);
    if (project.brand_name) autoHashtags.push(project.brand_name.replace(/\s+/g, ''));
    if (autoHashtags.length > 0) updateInstagramContent(igContent.id, { hashtags: autoHashtags });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [igContent.id]);

  const imageStyle = channelModels.imageStyle || 'Photorealistic, high quality photography, natural lighting, detailed';
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isDraggingRef, setIsDraggingRef] = useState(false);
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const refInputRef = useRef<HTMLInputElement>(null);

  const uploadRefImage = useCallback(async (file: File) => {
    setIsUploadingRef(true);
    try {
      const presignRes = await fetch('/api/storage/presign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, category: 'references', fileName: file.name, contentType: file.type, contentId: igContent.id }),
      });
      if (!presignRes.ok) throw new Error('Presign 실패');
      const { presignedUrl, publicUrl } = await presignRes.json();
      const uploadRes = await fetch(presignedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!uploadRes.ok) throw new Error('R2 업로드 실패');
      setReferenceImage(publicUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => setReferenceImage(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingRef(false);
    }
  }, [project.id, igContent.id]);

  // ── AI Text Generation ──
  const { isGenerating: isGeneratingPrompts, generate: generatePrompts, abort: abortPrompts } = useAiGeneration({
    onComplete: useCallback(
      (fullText: string) => {
        try {
          const jsonMatch = fullText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('JSON 형식을 찾을 수 없습니다.');
          const parsed = JSON.parse(jsonMatch[0]) as {
            caption: string;
            hashtags: string[];
            slides: { header?: string; title?: string; headline?: string; body?: string; footer?: string; text_overlay?: string; image_prompt: string }[];
          };

          const newCaption = parsed.caption || caption;
          const newHashtags = parsed.hashtags?.length ? parsed.hashtags : hashtags;
          setCaption(newCaption);
          updateInstagramContent(igContent.id, { caption: newCaption || null, hashtags: newHashtags });

          const now = new Date().toISOString();
          const newCards: InstagramCard[] = parsed.slides.map((slide, i) => {
            const header = slide.header || '';
            const title = slide.title || slide.headline || '';
            const body = slide.body || slide.text_overlay || '';
            const footer = slide.footer || '';
            const combined = [header, title, body, footer].filter(Boolean).join('\n');

            const canvasData: CardCanvasData = {
              bgColor: '#18181b',
              imageUrl: null,
              imageY: 50,
              textBlocks: [
                { id: 'header', text: header, x: 10, y: 5, fontSize: 11, color: '#8B5CF6', fontWeight: 'bold', textAlign: 'left', width: 80 },
                { id: 'title', text: title, x: 10, y: 15, fontSize: 28, color: '#ffffff', fontWeight: 'bold', textAlign: 'left', width: 80 },
                { id: 'body', text: body, x: 10, y: 55, fontSize: 14, color: '#cccccc', fontWeight: 'normal', textAlign: 'left', width: 80 },
                { id: 'footer', text: footer, x: 10, y: 90, fontSize: 10, color: '#666666', fontWeight: 'normal', textAlign: 'left', width: 80 },
              ],
            };

            return {
              id: generateId('ic'),
              instagram_content_id: igContent.id,
              text_content: combined || null,
              background_color: '#18181b',
              background_image_url: null,
              text_style: canvasData as unknown as Record<string, unknown>,
              image_prompt: slide.image_prompt || null,
              reference_image_url: null,
              sort_order: i,
              created_at: now,
              updated_at: now,
            };
          });

          setInstagramCardsForContent(igContent.id, newCards);
          const textLines = parsed.slides.map(s => {
            return [s.header, s.title || s.headline, s.body || s.text_overlay, s.footer].filter(Boolean).join('\n');
          }).join('\n\n');
          setSlideTexts(textLines);
        } catch {
          alert('카드뉴스 프롬프트 파싱 실패. 다시 시도해 주세요.');
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [igContent.id, caption, hashtags]
    ),
    onError: useCallback((err: string) => { alert(`AI 생성 오류: ${err}`); }, []),
  });

  // ── Image Generation (module-level, survives tab switches) ──
  const { isRunning: isGeneratingImages, progress: cardnewsBatchProgress, currentSlideIndex: batchSlideIndex } = useBatchProgress(igContent.id);

  const isGenerating = isGeneratingPrompts || isGeneratingImages;

  const handleGenerate = () => {
    const prompt = buildCardNewsImagePromptsPrompt({ project, content, baseArticle: baseArticle ?? undefined });
    const blogContents = getBlogContents(content.id);
    let blogSectionsPrompt = '';
    if (blogContents.length > 0) {
      const blogCards = getBlogCards(blogContents[0].id);
      if (blogCards.length > 0) {
        const sections = blogCards.map((bc: BlogCard, i: number) => {
          const c = bc.content as { text?: string };
          const plain = (c.text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          return `섹션 ${i + 1}: ${plain}`;
        }).join('\n\n');
        blogSectionsPrompt = `\n\n## 블로그 섹션 (각 섹션을 1장의 카드뉴스로 요약)\n${sections}`;
      }
    }
    setGeneratedPrompt(prompt + blogSectionsPrompt);
    setShowPromptDialog(true);
  };

  const handleStartGeneration = (prompt: string) => { generatePrompts(prompt, channelModels.textModel); };

  const handleApplyTexts = () => {
    const texts = slideTexts.split(/\n\n+/).map(t => t.trim()).filter(Boolean);
    const state = useProjectStore.getState();
    const currentCards = state.getInstagramCards(igContent.id);
    for (let i = 0; i < currentCards.length && i < texts.length; i++) {
      updateInstagramCard(currentCards[i].id, { text_content: texts[i] });
    }
    for (let i = currentCards.length; i < texts.length; i++) {
      addInstagramCard(igContent.id, i);
      const updated = useProjectStore.getState().getInstagramCards(igContent.id);
      const newCard = updated[i];
      if (newCard) updateInstagramCard(newCard.id, { text_content: texts[i] });
    }
  };

  const handleGenerateAllImages = () => {
    handleApplyTexts();
    const state = useProjectStore.getState();
    const currentCards = state.getInstagramCards(igContent.id);
    if (currentCards.length === 0) return;
    const prompts = currentCards.map((card, i) => ({
      slideIndex: i,
      prompt: card.image_prompt || `Create an illustration for social media card: "${card.text_content || 'Slide'}". ${imageStyle}`,
      aspectRatio: channelModels.aspectRatio || '4:5',
    }));
    runBatchImageGeneration(igContent.id, prompts, channelModels.imageModel, project.id);
  };

  const { isGeneratingImage: isRegeneratingCard, generatingCardId, generateCardImage: generateSingleCardImage } = useCardImageGeneration({
    getPrompt: (card: InstagramCard) => {
      if (card.image_prompt) return imageStyle ? `${imageStyle}. ${card.image_prompt}` : card.image_prompt;
      return `Create an illustration for social media card: "${card.text_content || 'Slide'}". ${imageStyle}`;
    },
    getExistingImage: (card: InstagramCard) => card.background_image_url || null,
    saveResult: (cardId: string, dataUrl: string, prompt: string) => {
      updateInstagramCard(cardId, { background_image_url: dataUrl, image_prompt: prompt });
    },
    imageModel: channelModels.imageModel,
    aspectRatio: channelModels.aspectRatio || '4:5',
    imageStyle: imageStyle,
    referenceImage: referenceImage || undefined,
    projectId: project.id,
  });

  const handleGenerateCardImage = (cardId: string) => generateSingleCardImage(cardId, cards);
  const handleCardUpdate = (cardId: string, updates: Partial<InstagramCard>) => { updateInstagramCard(cardId, updates); };
  const handleCardDelete = (cardId: string) => { deleteInstagramCard(cardId); };
  const handleAddSlide = () => { addInstagramCard(igContent.id, cards.length); };

  // ── Template ──
  const applyTemplate = (template: CardTemplate) => {
    for (const card of cards) {
      const existing = parseCanvasData(card.text_style, card.background_image_url);
      const newBlocks: TextBlock[] = template.textBlocks.map(tb => {
        const existingBlock = existing.textBlocks.find(b => b.id === tb.id);
        return { ...tb, text: existingBlock?.text ?? '' };
      });
      const canvasData: CardCanvasData = {
        bgColor: template.bgColor,
        imageUrl: existing.imageUrl,
        imageY: template.imageY,
        textBlocks: newBlocks,
      };
      updateInstagramCard(card.id, {
        text_style: canvasData as unknown as Record<string, unknown>,
        background_color: template.bgColor,
      });
    }
  };

  // ── Download ──
  const handleDownloadAllImages = async () => {
    if (cards.length === 0) return;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card.background_image_url && !card.text_content?.trim()) continue;
      try {
        const blob = await renderCardToBlob(card);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cardnews_${String(i + 1).padStart(2, '0')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) { console.error(`카드 ${i + 1} 렌더링 실패:`, err); }
    }
  };

  const renderCardToBlob = (card: InstagramCard): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const W = 1080; const H = 1350; // 4:5
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      const data = parseCanvasData(card.text_style, card.background_image_url);

      const drawTextBlocks = () => {
        for (const block of data.textBlocks) {
          if (!block.text) continue;
          const x = (block.x / 100) * W;
          const y = (block.y / 100) * H;
          const maxW = (block.width / 100) * W;
          const fs = block.fontSize * (W / 300);
          ctx.fillStyle = block.color;
          ctx.font = `${block.fontWeight} ${fs}px "Noto Sans KR", sans-serif`;
          ctx.textAlign = block.textAlign as CanvasTextAlign;
          ctx.textBaseline = 'top';
          const tx = block.textAlign === 'center' ? x + maxW / 2 : block.textAlign === 'right' ? x + maxW : x;
          ctx.shadowColor = 'rgba(0,0,0,0.4)';
          ctx.shadowBlur = fs * 0.1;
          const lines: string[] = [];
          let cur = '';
          for (const ch of block.text) {
            if (ch === '\n') { lines.push(cur); cur = ''; continue; }
            const test = cur + ch;
            if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = ch; } else { cur = test; }
          }
          if (cur) lines.push(cur);
          lines.forEach((line, li) => ctx.fillText(line, tx, y + li * fs * 1.4));
          ctx.shadowColor = 'transparent';
        }
      };

      ctx.fillStyle = data.bgColor;
      ctx.fillRect(0, 0, W, H);

      if (data.imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // Draw image at full width, natural aspect ratio, positioned by imageY
          const scale = W / img.naturalWidth;
          const imgH = img.naturalHeight * scale;
          const yCenter = (data.imageY / 100) * H;
          const drawY = yCenter - imgH / 2;
          ctx.drawImage(img, 0, drawY, W, imgH);
          drawTextBlocks();
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
        };
        img.onerror = () => { drawTextBlocks(); canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png'); };
        img.src = data.imageUrl;
      } else {
        drawTextBlocks();
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
      }
    });
  };

  const handleCaptionChange = (value: string) => {
    setCaption(value);
    updateInstagramContent(igContent.id, { caption: value || null });
  };

  const handleAddHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (!tag || hashtags.includes(tag)) return;
    const newTags = [...hashtags, tag];
    updateInstagramContent(igContent.id, { hashtags: newTags });
    setHashtagInput('');
  };

  const handleRemoveHashtag = (tag: string) => {
    updateInstagramContent(igContent.id, { hashtags: hashtags.filter(t => t !== tag) });
  };

  return (
    <div className="space-y-4">
      {/* Template picker + properties */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground">템플릿</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allTemplates.map(t => (
            <div key={t.id} className="relative shrink-0">
              <button
                onClick={() => {
                  applyTemplate(t);
                  setActiveTemplateId(t.id);
                  setIsTemplatePropsOpen(true);
                }}
                className={cn(
                  'rounded-lg border overflow-hidden transition-all',
                  activeTemplateId === t.id ? 'border-primary ring-2 ring-primary' : 'border-border hover:ring-1 hover:ring-primary/50',
                )}
                title={t.name}
              >
                <div className="relative w-14 overflow-hidden" style={{ aspectRatio: '4/5', backgroundColor: t.preview.bg }}>
                  {t.textBlocks.filter(tb => !tb.hidden).slice(0, 3).map(tb => (
                    <div key={tb.id} className="absolute" style={{ left: `${tb.x}%`, top: `${tb.y}%`, width: `${tb.width}%` }}>
                      <div style={{ height: Math.max(2, tb.fontSize * 0.15), backgroundColor: t.preview.textColor, opacity: 0.5, borderRadius: 1 }} />
                    </div>
                  ))}
                </div>
                <p className="text-[8px] text-center py-0.5 bg-muted/50 truncate px-1">{t.name}</p>
              </button>
              {t.id.startsWith('custom-') && (
                <button onClick={() => deleteSavedTemplate(t.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[8px] z-10 hover:bg-destructive/80">
                  <X size={8} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Template properties panel — collapsible */}
        {activeTemplateId && (() => {
          const tpl = allTemplates.find(t => t.id === activeTemplateId);
          if (!tpl) return null;
          // Read current style from first card (or default)
          const firstCard = cards[0];
          const currentData = firstCard ? parseCanvasData(firstCard.text_style, firstCard.background_image_url) : defaultCanvasData();

          const updateAllCards = (updates: Partial<CardCanvasData>) => {
            for (const card of cards) {
              const existing = parseCanvasData(card.text_style, card.background_image_url);
              const next = { ...existing, ...updates };
              updateInstagramCard(card.id, {
                text_style: next as unknown as Record<string, unknown>,
                ...(updates.bgColor ? { background_color: updates.bgColor } : {}),
              });
            }
          };

          return (
            <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
              <button onClick={() => setIsTemplatePropsOpen(!isTemplatePropsOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-muted/50 transition-colors">
                <span className="text-[10px] font-semibold">{tpl.name} 속성</span>
                <ChevronDown size={12} className={cn('text-muted-foreground transition-transform', isTemplatePropsOpen && 'rotate-180')} />
              </button>
              {isTemplatePropsOpen && (
                <div className="px-3 pb-3 space-y-3 text-[10px]">
                  {/* Background color */}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-14 shrink-0">배경색</span>
                    <input type="color" value={currentData.bgColor}
                      onChange={(e) => updateAllCards({ bgColor: e.target.value })}
                      className="w-6 h-6 rounded border border-border cursor-pointer p-0" />
                    <div className="flex gap-1">
                      {['#ffffff', '#f5f5f5', '#18181b', '#111111', '#0A0A0F', '#7C3AED', '#000000'].map(c => (
                        <button key={c} onClick={() => updateAllCards({ bgColor: c })}
                          className={cn('w-5 h-5 rounded-full border transition-transform hover:scale-110',
                            currentData.bgColor === c ? 'ring-2 ring-primary' : 'border-border'
                          )}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>

                  {/* Image position */}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-14 shrink-0">이미지 위치</span>
                    <input type="range" min={0} max={100} step={10} value={currentData.imageY}
                      onChange={(e) => updateAllCards({ imageY: Number(e.target.value) })}
                      className="flex-1 h-1 accent-primary" />
                    <span className="w-8 text-right">{currentData.imageY}%</span>
                    <span className="text-muted-foreground text-[9px]">{currentData.imageUrl ? '있음' : '없음 (생성/붙여넣기)'}</span>
                  </div>

                  {/* Text blocks quick edit */}
                  <div className="space-y-1.5">
                    <span className="text-muted-foreground">텍스트 블록</span>
                    {currentData.textBlocks.map(block => (
                      <div key={block.id} className={cn('flex items-center gap-1.5 pl-2', block.hidden && 'opacity-40')}>
                        {/* Show/Hide toggle */}
                        <button onClick={() => {
                          for (const card of cards) {
                            const data = parseCanvasData(card.text_style, card.background_image_url);
                            const newBlocks = data.textBlocks.map(b => b.id === block.id ? { ...b, hidden: !b.hidden } : b);
                            updateInstagramCard(card.id, { text_style: { ...data, textBlocks: newBlocks } as unknown as Record<string, unknown> });
                          }
                        }} className="shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground" title={block.hidden ? '보이기' : '숨기기'}>
                          {block.hidden ? <EyeOff size={10} /> : <Eye size={10} />}
                        </button>
                        <span className="w-10 text-muted-foreground truncate">{block.id}</span>
                        <span className="text-muted-foreground">y:</span>
                        <input type="number" min={0} max={100} step={5} value={block.y}
                          onChange={(e) => {
                            const newY = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                            for (const card of cards) {
                              const data = parseCanvasData(card.text_style, card.background_image_url);
                              const newBlocks = data.textBlocks.map(b => b.id === block.id ? { ...b, y: newY } : b);
                              updateInstagramCard(card.id, { text_style: { ...data, textBlocks: newBlocks } as unknown as Record<string, unknown> });
                            }
                          }}
                          className="w-10 h-5 text-center bg-transparent border border-border rounded" />
                        <span className="text-muted-foreground">크기:</span>
                        <input type="number" min={8} max={72} value={block.fontSize}
                          onChange={(e) => {
                            const fs = Math.max(8, Math.min(72, parseInt(e.target.value) || 14));
                            for (const card of cards) {
                              const data = parseCanvasData(card.text_style, card.background_image_url);
                              const newBlocks = data.textBlocks.map(b => b.id === block.id ? { ...b, fontSize: fs } : b);
                              updateInstagramCard(card.id, { text_style: { ...data, textBlocks: newBlocks } as unknown as Record<string, unknown> });
                            }
                          }}
                          className="w-10 h-5 text-center bg-transparent border border-border rounded" />
                        <input type="color" value={block.color}
                          onChange={(e) => {
                            for (const card of cards) {
                              const data = parseCanvasData(card.text_style, card.background_image_url);
                              const newBlocks = data.textBlocks.map(b => b.id === block.id ? { ...b, color: e.target.value } : b);
                              updateInstagramCard(card.id, { text_style: { ...data, textBlocks: newBlocks } as unknown as Record<string, unknown> });
                            }
                          }}
                          className="w-4 h-4 rounded border border-border cursor-pointer p-0" />
                        <div className="flex gap-0.5">
                          {(['left', 'center', 'right'] as const).map(a => (
                            <button key={a}
                              onClick={() => {
                                for (const card of cards) {
                                  const data = parseCanvasData(card.text_style, card.background_image_url);
                                  const newBlocks = data.textBlocks.map(b => b.id === block.id ? { ...b, textAlign: a } : b);
                                  updateInstagramCard(card.id, { text_style: { ...data, textBlocks: newBlocks } as unknown as Record<string, unknown> });
                                }
                              }}
                              className={cn('w-4 h-4 flex items-center justify-center rounded border text-[8px]',
                                block.textAlign === a ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>
                              {a === 'left' ? '←' : a === 'center' ? '↔' : '→'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Save as template */}
                  <button onClick={saveCurrentAsTemplate}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border border-dashed border-muted-foreground/30 hover:border-primary hover:text-primary transition-colors">
                    <Save size={10} /> 현재 설정을 템플릿으로 저장
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {cards.length > 0 && <Badge variant="secondary" className="text-xs">{cards.length}장</Badge>}
        </div>
        <div className="flex gap-2">
          <GenerationButton
            variant="text"
            isGenerating={isGeneratingPrompts}
            disabled={!hasBaseArticle || isGeneratingImages}
            onClick={handleGenerate}
            onAbort={abortPrompts}
            label="AI 텍스트"
            loadingLabel="텍스트 생성 중..."
            className={!isGeneratingPrompts ? 'bg-pink-600 hover:bg-pink-700 text-white' : undefined}
          />
          <GenerationButton
            variant="batch-image"
            isGenerating={isGeneratingImages}
            disabled={cards.length === 0 || isGeneratingPrompts}
            onClick={handleGenerateAllImages}
            onAbort={() => abortBatch(igContent.id)}
            progress={cardnewsBatchProgress}
          />
          {cards.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => { setPreviewIndex(0); setShowPreview(true); }} className="gap-1.5">
              <Eye size={14} /> 미리보기
            </Button>
          )}
          {cards.some(c => c.background_image_url) && (
            <Button variant="outline" size="sm" onClick={handleDownloadAllImages} className="gap-1.5">
              <Download size={14} /> 다운로드
            </Button>
          )}
        </div>
      </div>

      {/* Reference Image */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">참조 이미지</span>
        {referenceImage ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={referenceImage} alt="참조" className="w-12 h-12 object-cover rounded border border-border" />
              <button onClick={() => setReferenceImage(null)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                <X size={10} />
              </button>
            </div>
            <span className="text-[10px] text-muted-foreground">모든 이미지 생성 시 이 스타일을 참조</span>
          </div>
        ) : (
          <div
            onDrop={(e) => { e.preventDefault(); setIsDraggingRef(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) uploadRefImage(f); }}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingRef(true); }}
            onDragLeave={() => setIsDraggingRef(false)}
            onClick={() => !isUploadingRef && refInputRef.current?.click()}
            className={cn('flex-1 h-12 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer transition-colors', isDraggingRef ? 'border-primary bg-primary/10' : 'border-muted-foreground/20 hover:border-primary/50')}
          >
            {isUploadingRef ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : <Upload size={14} className="text-muted-foreground" />}
            <span className="text-xs text-muted-foreground">{isUploadingRef ? '업로드 중...' : '이미지 드래그 또는 클릭'}</span>
          </div>
        )}
        <input ref={refInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadRefImage(f); e.target.value = ''; }} />
      </div>

      {!hasBaseArticle && <p className="text-sm text-muted-foreground">기본 글을 먼저 작성해 주세요.</p>}

      {/* Caption & Hashtags — collapsible */}
      {hasBaseArticle && (
        <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
          <button onClick={() => setIsCaptionOpen(!isCaptionOpen)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors">
            <h3 className="text-xs font-semibold">캡션 & 해시태그</h3>
            <ChevronDown size={14} className={cn('text-muted-foreground transition-transform', isCaptionOpen && 'rotate-180')} />
          </button>
          {isCaptionOpen && (
            <div className="px-3 pb-3 space-y-3">
              <textarea value={caption} onChange={(e) => handleCaptionChange(e.target.value)}
                placeholder="인스타그램 캡션..." className="w-full text-sm border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary bg-transparent resize-none" rows={3} />
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Hash size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" value={hashtagInput} onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddHashtag(); } }}
                    placeholder="해시태그 입력 후 Enter" className="w-full text-sm border border-border rounded-md pl-7 pr-3 py-1.5 focus:outline-none focus:border-primary bg-transparent" />
                </div>
                <Button variant="outline" size="sm" onClick={handleAddHashtag}>추가</Button>
              </div>
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {hashtags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                      #{tag}
                      <button onClick={() => handleRemoveHashtag(tag)} className="hover:text-destructive"><X size={10} /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Slide text editor — collapsible */}
      {cards.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
          <button onClick={() => setIsSlideTextOpen(!isSlideTextOpen)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors">
            <h3 className="text-xs font-semibold">슬라이드 텍스트 (빈줄로 구분)</h3>
            <ChevronDown size={14} className={cn('text-muted-foreground transition-transform', isSlideTextOpen && 'rotate-180')} />
          </button>
          {isSlideTextOpen && (
            <div className="px-3 pb-3 space-y-2">
              <div className="flex items-center justify-end gap-1">
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating || !hasBaseArticle} className="text-xs h-6 gap-1">
                  <RefreshCw size={10} /> 재생성
                </Button>
                <Button variant="outline" size="sm" onClick={handleApplyTexts} className="text-xs h-6">텍스트 적용</Button>
              </div>
              <textarea value={slideTexts} onChange={(e) => setSlideTexts(e.target.value)}
                placeholder={"첫 번째 슬라이드\n\n두 번째 슬라이드"} className="w-full text-sm border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary bg-transparent resize-none font-mono"
                rows={Math.max(6, slideTexts.split('\n').length + 1)} />
              <p className="text-[10px] text-muted-foreground">{slideTexts.split(/\n\n+/).filter(t => t.trim()).length}개 슬라이드</p>
            </div>
          )}
        </div>
      )}

      {/* Slide Grid — 2 columns */}
      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {cards.map(card => (
            <CardNewsCardItem
              key={card.id}
              card={card}
              index={card.sort_order}
              onUpdate={handleCardUpdate}
              onDelete={handleCardDelete}
              onGenerateImage={() => handleGenerateCardImage(card.id)}
              isGeneratingImage={generatingCardId === card.id || (isGeneratingImages && batchSlideIndex === card.sort_order)}
              isSelected={selectedCardId === card.id}
              onSelect={() => setSelectedCardId(selectedCardId === card.id ? null : card.id)}
            />
          ))}
          <AddSlideButton onAdd={handleAddSlide} />
        </div>
      )}

      {cards.length === 0 && hasBaseArticle && (
        <div className="grid grid-cols-2 gap-4">
          <AddSlideButton onAdd={handleAddSlide} />
        </div>
      )}

      {/* Preview modal */}
      {showPreview && cards[previewIndex] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setShowPreview(false)}>
          <div className="relative max-w-[90vmin] max-h-[90vh] flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))} disabled={previewIndex === 0} className="text-white">◀</Button>
              <span className="text-white text-sm">{previewIndex + 1} / {cards.length}</span>
              <Button variant="ghost" size="sm" onClick={() => setPreviewIndex(Math.min(cards.length - 1, previewIndex + 1))} disabled={previewIndex >= cards.length - 1} className="text-white">▶</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)} className="text-white"><X size={16} /></Button>
            </div>
            {(() => {
              const data = parseCanvasData(cards[previewIndex].text_style, cards[previewIndex].background_image_url);
              return (
                <div className="relative rounded-lg overflow-hidden" style={{ width: '64vmin', aspectRatio: '4/5', backgroundColor: data.bgColor }}>
                  {data.imageUrl && (
                    <div className="absolute inset-x-0" style={{ top: `${data.imageY}%`, transform: 'translateY(-50%)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={data.imageUrl} alt="" className="w-full h-auto" />
                    </div>
                  )}
                  {data.textBlocks.map(block => (
                    <div key={block.id} className="absolute" style={{ left: `${block.x}%`, top: `${block.y}%`, width: `${block.width}%` }}>
                      <p className="whitespace-pre-line break-words" style={{
                        fontSize: `${block.fontSize * 3}px`, color: block.color, fontWeight: block.fontWeight,
                        textAlign: block.textAlign, textShadow: data.imageUrl ? '0 2px 8px rgba(0,0,0,0.6)' : undefined, lineHeight: 1.3,
                      }}>
                        {block.text}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Prompt dialog */}
      <PromptEditDialog open={showPromptDialog} onOpenChange={setShowPromptDialog} initialPrompt={generatedPrompt}
        isGenerating={isGeneratingPrompts} onGenerate={handleStartGeneration} onAbort={abortPrompts} />
    </div>
  );
}

// ─── Outer: 다중 카드뉴스 콘텐츠 리스트 ──────────────────

export function CardNewsPanel() {
  const { selectedContentId, contents, selectedProjectId, projects, getBaseArticle, getInstagramContents, addInstagramContent, updateInstagramContent, deleteInstagramContent, getChannelModels, setChannelModels } = useProjectStore();
  const content = contents.find((c) => c.id === selectedContentId);
  const project = projects.find((p) => p.id === selectedProjectId);
  if (!content || !project) return null;
  const hasBaseArticle = !!getBaseArticle(content.id);
  const igContents = getInstagramContents(content.id);
  const channelModels = getChannelModels(project.id, 'cardnews');

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">카드뉴스 (인스타그램)</h2>
          <Badge variant="outline" className="text-[10px] font-mono">4:5</Badge>
        </div>
      </div>

      {/* Model + Image ratio selector */}
      <ChannelModelSelector
        textModel={channelModels.textModel}
        imageModel={channelModels.imageModel}
        onTextModelChange={(m) => setChannelModels(project.id, 'cardnews', { textModel: m })}
        onImageModelChange={(m) => setChannelModels(project.id, 'cardnews', { imageModel: m })}
        aspectRatio={channelModels.aspectRatio}
        onAspectRatioChange={(r) => setChannelModels(project.id, 'cardnews', { aspectRatio: r })}
        imageStyle={channelModels.imageStyle}
        onImageStyleChange={(s) => setChannelModels(project.id, 'cardnews', { imageStyle: s })}
        defaultAspectRatio="4:5"
      />

      <ChannelContentList<InstagramContent>
        items={igContents}
        getId={(item) => item.id}
        getTitle={(item, index) => item.title || `카드뉴스 ${index + 1}`}
        onTitleChange={(id, title) => updateInstagramContent(id, { title })}
        onAdd={() => addInstagramContent(content.id)}
        onDelete={(id) => deleteInstagramContent(id)}
        addLabel="새 카드뉴스 추가"
        renderContent={(igContent) => (
          <CardNewsPanelInner
            key={igContent.id}
            igContent={igContent}
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
