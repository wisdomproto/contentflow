'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Sparkles, Loader2, Send, History, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContentStore } from '@/stores/useContentStore';
import { toast } from '@/components/ui/Toast';

interface HistoryItem {
  url: string;
  prompt: string;
  timestamp: number;
}

interface SectionImageProps {
  imageUrl: string | null;
  placeholder: string;
  onImageChange: (url: string | null) => void;
  sectionHeader?: string;
  sectionText?: string;
}

export function SectionImage({ imageUrl, placeholder, onImageChange, sectionHeader, sectionText }: SectionImageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  const activeContentId = useContentStore((s) => s.activeContentId);
  const contents = useContentStore((s) => s.contents);
  const imageModel = activeContentId ? contents[activeContentId]?.imageModel : undefined;

  const addToHistory = useCallback((url: string, prompt: string) => {
    setHistory((prev) => {
      if (prev.some((h) => h.url === url)) return prev;
      return [{ url, prompt, timestamp: Date.now() }, ...prev].slice(0, 20);
    });
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        onImageChange(url);
        addToHistory(url, file.name);
      }
    },
    [onImageChange, addToHistory],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const file = e.clipboardData.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const generateImage = async (prompt: string) => {
    setIsGenerating(true);
    setShowPromptInput(false);

    // Build context from the current content
    const content = activeContentId ? contents[activeContentId] : null;
    const context = content ? {
      blogTitle: content.blog.title,
      topic: content.source.topic,
      keywords: content.source.keywords,
      sectionHeader,
      sectionText: sectionText?.replace(/<[^>]*>/g, '').slice(0, 300),
      imagePlaceholder: placeholder,
    } : undefined;

    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: imageModel ?? 'flash-image', context }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '이미지 생성에 실패했습니다');
      }

      const byteChars = atob(data.image);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType });
      const url = URL.createObjectURL(blob);

      onImageChange(url);
      addToHistory(url, prompt);
      setCustomPrompt('');
      toast('이미지가 생성되었습니다', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '이미지 생성에 실패했습니다';
      toast(message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIGenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = sectionHeader || placeholder || '블로그 이미지';
    await generateImage(prompt);
  };

  const handlePromptSubmit = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const prompt = customPrompt.trim();
    if (!prompt) return;
    await generateImage(prompt);
  };

  const handleTogglePrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPromptInput((prev) => !prev);
    setShowHistory(false);
    setCustomPrompt('');
    setTimeout(() => promptInputRef.current?.focus(), 50);
  };

  const handleToggleHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHistory((prev) => !prev);
    setShowPromptInput(false);
  };

  const handleSelectHistory = (item: HistoryItem) => {
    onImageChange(item.url);
  };

  const handleDeleteHistory = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    setHistory((prev) => prev.filter((h) => h.url !== url));
    if (imageUrl === url) {
      onImageChange(null);
    }
  };

  const handleClearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange(null);
    setShowHistory(false);
    setShowPromptInput(false);
  };

  const handleFileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const historyStrip = history.length > 0 && (showHistory || !imageUrl) && (
    <div className="w-full" onClick={(e) => e.stopPropagation()}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          히스토리 ({history.length})
        </span>
        {imageUrl && (
          <button
            onClick={handleToggleHistory}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            닫기
          </button>
        )}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {history.map((item) => (
          <div
            key={item.url}
            className={cn(
              'group/thumb relative shrink-0 cursor-pointer overflow-hidden rounded-md border-2 transition-colors',
              imageUrl === item.url ? 'border-primary' : 'border-transparent hover:border-primary/40',
            )}
            onClick={() => handleSelectHistory(item)}
            title={item.prompt}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.prompt}
              className="h-14 w-14 object-cover"
            />
            <button
              onClick={(e) => handleDeleteHistory(e, item.url)}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover/thumb:opacity-100"
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  if (imageUrl) {
    return (
      <div className="flex flex-col gap-2">
        <div className="group relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="섹션 이미지"
            className="w-full rounded-md object-cover"
            style={{ maxHeight: '300px' }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex flex-wrap justify-center gap-1.5">
              <button
                onClick={handleFileClick}
                className="rounded-md bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                <Upload size={14} className="mr-1 inline" />
                교체
              </button>
              <button
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className="rounded-md bg-card px-3 py-1.5 text-sm font-medium text-primary hover:bg-muted disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 size={14} className="mr-1 inline animate-spin" />
                ) : (
                  <Sparkles size={14} className="mr-1 inline" />
                )}
                AI 재생성
              </button>
              <button
                onClick={handleTogglePrompt}
                className="rounded-md bg-card px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-muted"
              >
                <Send size={14} className="mr-1 inline" />
                프롬프트
              </button>
              {history.length > 0 && (
                <button
                  onClick={handleToggleHistory}
                  className="rounded-md bg-card px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-muted"
                >
                  <History size={14} className="mr-1 inline" />
                  히스토리
                </button>
              )}
              <button
                onClick={handleClearImage}
                className="rounded-md bg-card px-3 py-1.5 text-sm font-medium text-destructive hover:bg-muted"
              >
                <Trash2 size={14} className="mr-1 inline" />
                삭제
              </button>
            </div>
            {showPromptInput && (
              <div className="flex w-4/5 gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={promptInputRef}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePromptSubmit(e)}
                  placeholder="원하는 이미지를 설명하세요..."
                  className="flex-1 rounded-md bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handlePromptSubmit}
                  disabled={!customPrompt.trim() || isGenerating}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  생성
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
        {showHistory && historyStrip}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 transition-colors',
          isDragging ? 'border-primary bg-accent' : 'border-border hover:border-primary/50 hover:bg-muted/50',
          isGenerating && 'pointer-events-none opacity-60',
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 size={24} className="animate-spin text-primary" />
            <p className="text-center text-xs text-muted-foreground">AI 이미지 생성 중...</p>
          </>
        ) : (
          <>
            <Camera size={24} className="text-muted-foreground" />
            {placeholder ? (
              <p className="text-center text-xs text-muted-foreground">
                📷 추천 사진: {placeholder}
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                이미지를 드래그하거나 클릭하여 업로드
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={handleFileClick}
                className="flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs text-foreground hover:bg-muted"
              >
                <Upload size={12} /> 파일 업로드
              </button>
              <button
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Sparkles size={12} /> AI 생성
              </button>
              <button
                onClick={handleTogglePrompt}
                className="flex items-center gap-1 rounded-md border border-primary/30 px-3 py-1 text-xs text-primary hover:bg-accent"
              >
                <Send size={12} /> 프롬프트
              </button>
              {history.length > 0 && (
                <button
                  onClick={handleToggleHistory}
                  className="flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <History size={12} /> 히스토리 ({history.length})
                </button>
              )}
            </div>
            {showPromptInput && (
              <div className="mt-1 flex w-full gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={promptInputRef}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePromptSubmit(e)}
                  placeholder="원하는 이미지를 설명하세요... (예: 따뜻한 카페 인테리어)"
                  className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <button
                  onClick={handlePromptSubmit}
                  disabled={!customPrompt.trim() || isGenerating}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  생성
                </button>
              </div>
            )}
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      {historyStrip}
    </div>
  );
}
