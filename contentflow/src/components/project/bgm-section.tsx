'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Music, Trash2, Play, Pause } from 'lucide-react';
import { generateId } from '@/lib/utils';
import type { Project, BgmFile } from '@/types/database';

interface BgmSectionProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BgmSection({ project, onUpdate }: BgmSectionProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const files: BgmFile[] = project.bgm_files ?? [];

  const addFiles = useCallback(async (fileList: FileList) => {
    const audioFiles = Array.from(fileList).filter((f) =>
      f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f.name)
    );
    if (audioFiles.length === 0) return;

    const newFiles: BgmFile[] = [];

    for (const f of audioFiles) {
      const id = generateId('bgm');
      const fileEntry: BgmFile = {
        id,
        name: f.name,
        size: f.size,
        type: f.type || 'audio/mpeg',
        duration: null,
        added_at: new Date().toISOString(),
        url: null,
        r2_key: null,
      };

      try {
        const presignRes = await fetch('/api/storage/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            category: 'bgm',
            fileName: f.name,
            contentType: f.type || 'audio/mpeg',
            contentId: id,
          }),
        });

        if (presignRes.ok) {
          const { presignedUrl, publicUrl, key } = await presignRes.json();
          const uploadRes = await fetch(presignedUrl, {
            method: 'PUT',
            body: f,
            headers: { 'Content-Type': f.type || 'audio/mpeg' },
          });
          if (uploadRes.ok) {
            fileEntry.url = publicUrl;
            fileEntry.r2_key = key;
          }
        }
      } catch {
        // Upload failed
      }

      newFiles.push(fileEntry);
    }

    onUpdate({ bgm_files: [...files, ...newFiles] });
  }, [files, onUpdate, project.id]);

  const removeFile = async (fileId: string) => {
    if (playingId === fileId) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
    const file = files.find((f) => f.id === fileId);
    if (file?.r2_key) {
      try {
        await fetch('/api/storage/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys: [file.r2_key] }),
        });
      } catch {
        // Non-blocking
      }
    }
    const updated = files.filter((f) => f.id !== fileId);
    onUpdate({ bgm_files: updated.length > 0 ? updated : null });
  };

  const togglePlay = (fileId: string) => {
    if (playingId === fileId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    const file = files.find((f) => f.id === fileId);
    if (!file?.url) return;

    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(file.url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(fileId);
  };

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
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
        배경음악(BGM)을 등록하면 인스타그램 카드뉴스 동영상 등에서 사용할 수 있습니다.
      </div>

      <Card>
        <CardHeader>
          <CardTitle>배경음악 파일</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            <Upload size={28} className={`mx-auto mb-2 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-sm font-medium">
              {isDragOver ? '여기에 놓으세요' : '오디오 파일을 드래그하거나 클릭하여 선택'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">MP3, WAV, OGG, M4A, AAC, FLAC (다중 파일 가능)</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{files.length}개 파일</p>
              <div className="divide-y divide-border rounded-lg border">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 px-3 py-2.5">
                    <Music size={18} className="shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePlay(file.id)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      {playingId === file.id ? <Pause size={14} /> : <Play size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">등록된 배경음악이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
