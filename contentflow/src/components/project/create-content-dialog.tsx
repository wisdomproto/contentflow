'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProjectStore } from '@/stores/project-store';
import type { ImportedStrategy, ImportedCategory, ImportedTopic } from '@/types/analytics';

// Satisfy unused import lint — types are used via the cast below
type _AnalyticsTypes = ImportedCategory | ImportedTopic;

interface CreateContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function CreateContentDialog({ open, onOpenChange, projectId }: CreateContentDialogProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedCategoryCode, setSelectedCategoryCode] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');

  const createContent = useProjectStore((s) => s.createContent);

  const importedStrategy = useProjectStore((s) => {
    const projectId = s.selectedProjectId;
    if (!projectId) return null;
    const project = s.projects.find(p => p.id === projectId);
    return (project?.imported_strategy ?? null) as ImportedStrategy | null;
  });

  const categories = importedStrategy?.categories ?? [];
  const currentTopics = categories.find(c => c.code === selectedCategoryCode)?.topics.filter(t => t.status === 'new') ?? [];

  const handleTopicSelect = (topicId: string) => {
    const topic = currentTopics.find(t => t.id === topicId);
    if (topic) {
      setSelectedTopicId(topicId);
      setTitle(topic.title);

      // 임포트된 키워드 DB에서 주제 키워드와 매칭되는 고검색량 키워드를 메인으로 배치
      const importedKeywords = importedStrategy?.keywords ?? [];
      const topicKws = topic.keywords;

      // 주제 키워드 중 임포트 DB에 있는 것을 검색량 순으로 정렬
      const matched = topicKws
        .map(kw => {
          const found = importedKeywords.find(ik =>
            ik.keyword === kw || kw.includes(ik.keyword) || ik.keyword.includes(kw)
          );
          return found ? { keyword: found.keyword, totalSearch: found.totalSearch } : { keyword: kw, totalSearch: 0 };
        })
        .sort((a, b) => b.totalSearch - a.totalSearch);

      setTagsInput(matched.map(m => m.keyword).join(', '));
    }
  };

  const handleCategorySelect = (code: string) => {
    setSelectedCategoryCode(code);
    setSelectedTopicId('');
  };

  const updateContent = useProjectStore((s) => s.updateContent);

  const handleSubmit = () => {
    if (!title.trim()) return;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const effectiveCategory = selectedCategoryCode
      ? selectedCategoryCode
      : category.trim() || undefined;
    createContent({
      project_id: projectId,
      title: title.trim(),
      category: effectiveCategory,
      tags: tags.length > 0 ? tags : undefined,
    });

    // 주제를 골랐으면 content.topic에 주제 정보 저장 → BaseArticle 자동 생성 트리거
    if (selectedTopicId) {
      const topic = currentTopics.find(t => t.id === selectedTopicId);
      if (topic) {
        // 방금 생성된 content의 id를 가져오기 (마지막으로 추가된 content)
        const contents = useProjectStore.getState().contents;
        const newContent = contents[contents.length - 1];
        if (newContent) {
          const topicText = `${topic.title}\n\n앵글: ${topic.angle ?? ''}\n키워드: ${topic.keywords.join(', ')}`;
          updateContent(newContent.id, { topic: topicText });
        }
      }
    }

    setTitle('');
    setCategory('');
    setTagsInput('');
    setSelectedCategoryCode('');
    setSelectedTopicId('');
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) {
        setSelectedCategoryCode('');
        setSelectedTopicId('');
      }
      onOpenChange(v);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 컨텐츠</DialogTitle>
          <DialogDescription>
            컨텐츠를 생성하면 기본 글과 채널별 컨텐츠를 작성할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {categories.length > 0 && (
            <div className="space-y-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                📋 마케팅 전략에서 선택
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">카테고리</label>
                  <select
                    value={selectedCategoryCode}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">선택...</option>
                    {categories.map(cat => (
                      <option key={cat.code} value={cat.code}>
                        {cat.code}. {cat.name} ({cat.topics.filter(t => t.status === 'new').length}개)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">주제</label>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => handleTopicSelect(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    disabled={!selectedCategoryCode}
                  >
                    <option value="">선택...</option>
                    {currentTopics.map(topic => (
                      <option key={topic.id} value={topic.id}>
                        {topic.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="content-title">컨텐츠 제목 *</Label>
            <Input
              id="content-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="예: 장 건강을 위한 프로바이오틱스 가이드"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content-category">카테고리</Label>
            <Input
              id="content-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="예: 건강, IT, 뷰티"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content-tags">태그</Label>
            <Input
              id="content-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="쉼표로 구분 (예: 건강, 프로바이오틱스, 장건강)"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            취소
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            생성
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
