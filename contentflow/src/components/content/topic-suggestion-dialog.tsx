'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, RefreshCw, Check } from 'lucide-react';

export interface TopicSuggestion {
  title: string;
  outline: string;
}

interface TopicSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topics: TopicSuggestion[];
  isGenerating: boolean;
  error: string | null;
  onSelect: (topic: TopicSuggestion) => void;
  onRegenerate: (hint?: string) => void;
  /** 다이얼로그가 열릴 때 자동 생성 여부 (false이면 사용자가 Generate 클릭해야 함) */
  autoGenerate?: boolean;
}

export function TopicSuggestionDialog({
  open, onOpenChange, topics, isGenerating, error, onSelect, onRegenerate, autoGenerate = false,
}: TopicSuggestionDialogProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hint, setHint] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIdx(null);
    }
  }, [open]);

  const handleSelect = () => {
    if (selectedIdx !== null && topics[selectedIdx]) {
      onSelect(topics[selectedIdx]);
      onOpenChange(false);
      setSelectedIdx(null);
    }
  };

  const handleGenerate = () => {
    onRegenerate(hint.trim() || undefined);
  };

  const showInput = !isGenerating && topics.length === 0 && !error && !autoGenerate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI 주제 제안</DialogTitle>
          <DialogDescription>
            원하는 주제 방향을 입력하면 맞춤 주제를 생성합니다. 비워두면 프로젝트 설정과 참고 자료를 기반으로 자동 제안합니다.
          </DialogDescription>
        </DialogHeader>

        {/* Topic hint input */}
        {(showInput || topics.length > 0 || isGenerating) && (
          <div className="space-y-1.5">
            <Textarea
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="예: 봄철 피부 관리 팁, 신제품 출시 소식, 성분 비교 리뷰..."
              rows={2}
              className="text-sm resize-none"
              disabled={isGenerating}
            />
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-2">
          {isGenerating && (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 size={20} className="animate-spin" />
              <span>주제를 생성하고 있습니다...</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive p-4 text-sm">
              {error}
            </div>
          )}

          {showInput && (
            <div className="flex justify-center py-4">
              <Button onClick={handleGenerate} className="gap-1.5">
                <RefreshCw size={14} /> 주제 생성
              </Button>
            </div>
          )}

          {topics.map((topic, idx) => (
            <Card
              key={idx}
              className={`cursor-pointer transition-colors ${
                selectedIdx === idx
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => setSelectedIdx(idx)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedIdx === idx ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
                  }`}>
                    {selectedIdx === idx && <Check size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm">{topic.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-line leading-relaxed">
                      {topic.outline}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-1.5"
          >
            <RefreshCw size={14} /> 다시 생성
          </Button>
          <Button
            onClick={handleSelect}
            disabled={selectedIdx === null || isGenerating}
            className="gap-1.5"
          >
            <Check size={14} /> 이 주제 선택
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
