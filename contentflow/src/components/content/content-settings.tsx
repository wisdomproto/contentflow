'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { X, Upload, Link, Youtube, FileText, FileImage, File } from 'lucide-react';
import { useProjectStore } from '@/stores/project-store';
import type { Content, Project, ReferenceFile } from '@/types/database';

interface ContentSettingsProps {
  content: Content;
  project: Project;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return FileImage;
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText;
  return File;
}

export function ContentSettings({ content, project }: ContentSettingsProps) {
  const { updateContent, projects } = useProjectStore();
  const [title, setTitle] = useState(content.title);
  const [category, setCategory] = useState(content.category ?? '');
  const [tags, setTags] = useState<string[]>(content.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [memo, setMemo] = useState(content.memo ?? '');

  useEffect(() => {
    setTitle(content.title);
    setCategory(content.category ?? '');
    setTags(content.tags ?? []);
    setMemo(content.memo ?? '');
  }, [content.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    updateContent(content.id, {
      title: title.trim() || content.title,
      category: category || null,
      tags: tags.length > 0 ? tags : null,
      memo: memo || null,
    });
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const projectFiles: ReferenceFile[] = project.reference_files ?? [];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">
      {/* Content Info */}
      <Card>
        <CardHeader>
          <CardTitle>컨텐츠 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content-title">컨텐츠명</Label>
            <Input id="content-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content-category">카테고리</Label>
            <Input id="content-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="예: 건강, IT, 뷰티" />
          </div>
          <div className="space-y-2">
            <Label>태그</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="hover:text-destructive">
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="태그 입력 후 Enter"
              />
              <Button variant="outline" size="sm" onClick={addTag}>추가</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content-memo">메모</Label>
            <Textarea id="content-memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="자유 메모" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground pt-2">
            <div>생성일: {formatDate(content.created_at)}</div>
            <div>최종 수정일: {formatDate(content.updated_at)}</div>
          </div>
          <div className="space-y-2">
            <Label>소속 프로젝트</Label>
            <Select
              value={content.project_id}
              onValueChange={(projectId) => { if (projectId) updateContent(content.id, { project_id: projectId }); }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave}>저장</Button>
          </div>
        </CardContent>
      </Card>

      {/* Reference Materials */}
      <Card>
        <CardHeader>
          <CardTitle>참고 자료</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project default files */}
          {projectFiles.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                프로젝트 기본 참고 자료
                <Badge variant="secondary" className="text-xs">기본</Badge>
              </Label>
              <div className="divide-y divide-border rounded-lg border bg-muted/30">
                {projectFiles.map((file) => {
                  const Icon = getFileIcon(file.type);
                  return (
                    <div key={file.id} className="flex items-center gap-3 px-3 py-2">
                      <Icon size={16} className="shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">프로젝트 설정에서 관리됩니다.</p>
            </div>
          )}

          {/* Content-specific upload */}
          <div className="space-y-2">
            <Label>컨텐츠 전용 참고 자료</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">PDF, DOCX, MD, TXT, HWP 파일 업로드</p>
              <Button variant="outline" size="sm" className="mt-2">파일 선택</Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Youtube size={14} /> 유튜브 링크</Label>
            <div className="flex gap-2">
              <Input placeholder="https://youtube.com/watch?v=..." />
              <Button variant="outline" size="sm">추가</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Link size={14} /> 웹 URL</Label>
            <div className="flex gap-2">
              <Input placeholder="https://..." />
              <Button variant="outline" size="sm">추가</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Override */}
      <Card>
        <CardHeader>
          <CardTitle>설정 오버라이드</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            프로젝트 &quot;{project.name}&quot;의 기본 설정을 이 컨텐츠에서만 변경할 수 있습니다.
            AI 모델, 채널별 가이드, 타겟 고객 세분화 등을 오버라이드할 수 있습니다.
          </p>
          <p className="text-sm text-muted-foreground mt-2">(향후 구현 예정)</p>
        </CardContent>
      </Card>
    </div>
  );
}
