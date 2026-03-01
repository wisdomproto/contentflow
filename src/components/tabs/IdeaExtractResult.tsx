'use client';

import { Lightbulb, Plus, Check, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { IdeaExtraction } from '@/mock/contents';

interface IdeaExtractResultProps {
  ideas: IdeaExtraction;
  existingKeywords: string[];
  onAddKeyword: (keyword: string) => void;
  onApplyTitle: (title: string) => void;
}

export function IdeaExtractResult({
  ideas,
  existingKeywords,
  onAddKeyword,
  onApplyTitle,
}: IdeaExtractResultProps) {
  const [addedKeywords, setAddedKeywords] = useState<Set<string>>(new Set());
  const [copiedAngle, setCopiedAngle] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleAddKeyword = (kw: string) => {
    onAddKeyword(kw);
    setAddedKeywords((prev) => new Set(prev).add(kw));
  };

  const handleCopyAngle = (angle: string) => {
    navigator.clipboard.writeText(angle);
    setCopiedAngle(angle);
    setTimeout(() => setCopiedAngle(null), 1500);
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-accent">
      {/* Header — click to toggle */}
      <button
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-primary" />
          <span className="text-sm font-semibold text-accent-foreground">AI 아이디어 추출 결과</span>
        </div>
        {isCollapsed ? (
          <ChevronDown size={16} className="text-primary" />
        ) : (
          <ChevronUp size={16} className="text-primary" />
        )}
      </button>

      {!isCollapsed && <div className="flex flex-col gap-4 border-t border-border p-4">
        {/* 1. Suggested keywords */}
        <div>
          <p className="mb-2 text-xs font-semibold text-accent-foreground">추천 키워드</p>
          <div className="flex flex-wrap gap-1.5">
            {ideas.keywords.map((kw) => {
              const isExisting = existingKeywords.includes(kw);
              const isAdded = addedKeywords.has(kw);
              return (
                <button
                  key={kw}
                  onClick={() => !isExisting && !isAdded && handleAddKeyword(kw)}
                  disabled={isExisting || isAdded}
                  className={
                    isExisting || isAdded
                      ? 'inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground'
                      : 'inline-flex items-center gap-1 rounded-full border border-primary/30 bg-card px-2.5 py-1 text-xs text-accent-foreground transition-colors hover:bg-accent'
                  }
                >
                  {isExisting || isAdded ? (
                    <Check size={12} />
                  ) : (
                    <Plus size={12} />
                  )}
                  {kw}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Title suggestions */}
        <div>
          <p className="mb-2 text-xs font-semibold text-accent-foreground">추천 제목</p>
          <div className="flex flex-col gap-1.5">
            {ideas.titles.map((title) => (
              <button
                key={title}
                onClick={() => onApplyTitle(title)}
                className="group flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <span className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary">
                  <Lightbulb size={14} />
                </span>
                <span>{title}</span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            클릭하면 제목 입력란에 바로 적용됩니다
          </p>
        </div>

        {/* 3. Content angles */}
        <div>
          <p className="mb-2 text-xs font-semibold text-accent-foreground">추천 컨텐츠</p>
          <div className="flex flex-col gap-1.5">
            {ideas.angles.map((angle) => (
              <button
                key={angle}
                onClick={() => handleCopyAngle(angle)}
                className="group flex items-start gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
              >
                <span className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary">
                  {copiedAngle === angle ? <Check size={12} /> : <Copy size={12} />}
                </span>
                <span>{copiedAngle === angle ? '복사됨!' : angle}</span>
              </button>
            ))}
          </div>
        </div>
      </div>}
    </div>
  );
}
