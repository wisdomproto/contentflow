'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, BookOpen, Image, MessageCircle, Youtube, Info, FileText, Trash2 } from 'lucide-react';
import type { Project } from '@/types/database';

interface WritingGuideSectionProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

const GUIDE_CHANNELS = [
  { key: 'blog' as const, label: '블로그', icon: BookOpen, field: 'writing_guide_blog' as const },
  { key: 'instagram' as const, label: '인스타그램', icon: Image, field: 'writing_guide_instagram' as const },
  { key: 'threads' as const, label: '스레드', icon: MessageCircle, field: 'writing_guide_threads' as const },
  { key: 'youtube' as const, label: '유튜브', icon: Youtube, field: 'writing_guide_youtube' as const },
];

interface GuideFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileDropZone({ label, onFileContent }: { label: string; onFileContent: (file: GuideFile) => void }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback(async (file: File) => {
    const text = await file.text();
    onFileContent({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type || 'text/plain',
      content: text,
    });
  }, [onFileContent]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      readFile(e.dataTransfer.files[0]);
    }
  }, [readFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      readFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
        isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/50'
      }`}
    >
      <Upload size={20} className={`mx-auto mb-1.5 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
      <p className="text-xs text-muted-foreground">
        {isDragOver ? '여기에 놓으세요' : label}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">PDF, DOCX, MD, TXT 지원</p>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.docx,.doc,.md,.txt"
      />
    </div>
  );
}

export function WritingGuideSection({ project, onUpdate }: WritingGuideSectionProps) {
  const [globalGuide, setGlobalGuide] = useState(project.writing_guide_global ?? '');
  const [blogGuide, setBlogGuide] = useState(project.writing_guide_blog ?? '');
  const [instagramGuide, setInstagramGuide] = useState(project.writing_guide_instagram ?? '');
  const [threadsGuide, setThreadsGuide] = useState(project.writing_guide_threads ?? '');
  const [youtubeGuide, setYoutubeGuide] = useState(project.writing_guide_youtube ?? '');

  // Track uploaded files per guide slot (for UI display)
  const [guideFiles, setGuideFiles] = useState<Record<string, GuideFile | null>>({
    global: null, blog: null, instagram: null, threads: null, youtube: null,
  });

  useEffect(() => {
    setGlobalGuide(project.writing_guide_global ?? '');
    setBlogGuide(project.writing_guide_blog ?? '');
    setInstagramGuide(project.writing_guide_instagram ?? '');
    setThreadsGuide(project.writing_guide_threads ?? '');
    setYoutubeGuide(project.writing_guide_youtube ?? '');
    setGuideFiles({ global: null, blog: null, instagram: null, threads: null, youtube: null });
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const guideState: Record<string, { value: string; setter: (v: string) => void }> = {
    global: { value: globalGuide, setter: setGlobalGuide },
    blog: { value: blogGuide, setter: setBlogGuide },
    instagram: { value: instagramGuide, setter: setInstagramGuide },
    threads: { value: threadsGuide, setter: setThreadsGuide },
    youtube: { value: youtubeGuide, setter: setYoutubeGuide },
  };

  const handleFileUpload = useCallback((key: string, file: GuideFile) => {
    const state = guideState[key];
    if (state) {
      // Append file content to existing guide text
      const newValue = state.value ? `${state.value}\n\n--- ${file.name} ---\n${file.content}` : file.content;
      state.setter(newValue);
      setGuideFiles((prev) => ({ ...prev, [key]: file }));
    }
  }, [guideState]);

  const handleRemoveFile = (key: string) => {
    setGuideFiles((prev) => ({ ...prev, [key]: null }));
  };

  const handleSave = () => {
    onUpdate({
      writing_guide_global: globalGuide || null,
      writing_guide_blog: blogGuide || null,
      writing_guide_instagram: instagramGuide || null,
      writing_guide_threads: threadsGuide || null,
      writing_guide_youtube: youtubeGuide || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground flex items-start gap-2">
        <Info size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-foreground">적용 우선순위</p>
          <p className="mt-1">1. 전체 글쓰기 가이드가 기본으로 적용되고, 채널별 가이드가 추가로 반영됩니다.</p>
          <p>2. 파일을 드래그하면 내용이 텍스트 가이드에 추가됩니다.</p>
        </div>
      </div>

      {/* Global guide */}
      <Card>
        <CardHeader>
          <CardTitle>전체 글쓰기 가이드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">모든 채널에 공통 적용되는 글쓰기 가이드입니다. 톤앤매너, 문체, 구조 등을 작성하세요.</p>
          <div className="space-y-2">
            <Label htmlFor="global-guide">텍스트 가이드</Label>
            <Textarea
              id="global-guide"
              value={globalGuide}
              onChange={(e) => setGlobalGuide(e.target.value)}
              placeholder="예: 모든 글은 독자의 문제를 먼저 제시하고, 해결책을 제시합니다. ~입니다 체를 사용하며, 전문 용어는 쉽게 풀어 씁니다."
              className="h-32 resize-none overflow-y-auto"
            />
          </div>
          <div className="space-y-2">
            <Label>파일에서 가이드 추가</Label>
            {guideFiles.global && (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <FileText size={14} className="text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{guideFiles.global.name}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(guideFiles.global.size)}</span>
                <Button variant="ghost" size="sm" onClick={() => handleRemoveFile('global')} className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                  <Trash2 size={12} />
                </Button>
              </div>
            )}
            <FileDropZone label="전체 글쓰기 가이드 파일 업로드" onFileContent={(f) => handleFileUpload('global', f)} />
          </div>
        </CardContent>
      </Card>

      {/* Channel guides */}
      {GUIDE_CHANNELS.map((ch) => {
        const Icon = ch.icon;
        const state = guideState[ch.key];
        const file = guideFiles[ch.key];
        return (
          <Card key={ch.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon size={18} /> {ch.label} 글쓰기 가이드
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {ch.label} 채널 컨텐츠 생성 시 전체 가이드에 추가로 적용됩니다. 해당 채널 특유의 말투, 해시태그 규칙, 길이 제한 등을 작성하세요.
              </p>
              <div className="space-y-2">
                <Label htmlFor={`${ch.key}-guide`}>텍스트 가이드</Label>
                <Textarea
                  id={`${ch.key}-guide`}
                  value={state.value}
                  onChange={(e) => state.setter(e.target.value)}
                  placeholder={`${ch.label} 채널 전용 가이드 (말투, 형식, 해시태그 등)`}
                  className="h-28 resize-none overflow-y-auto"
                />
              </div>
              <div className="space-y-2">
                <Label>파일에서 가이드 추가</Label>
                {file && (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <FileText size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(ch.key)} className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                )}
                <FileDropZone label={`${ch.label} 글쓰기 가이드 파일 업로드`} onFileContent={(f) => handleFileUpload(ch.key, f)} />
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-end">
        <Button onClick={handleSave}>저장</Button>
      </div>
    </div>
  );
}
