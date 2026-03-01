'use client';

import { SectionControls } from './SectionControls';
import { SectionImage } from './SectionImage';
import { SectionText } from './SectionText';
import type { BlogSection } from '@/types/content';

interface SectionProps {
  section: BlogSection;
  onUpdate: (data: Partial<BlogSection>) => void;
  onDelete: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function Section({ section, onUpdate, onDelete, dragHandleProps }: SectionProps) {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <input
          value={section.header}
          onChange={(e) => onUpdate({ header: e.target.value })}
          placeholder="소제목 입력..."
          className="flex-1 bg-transparent text-base font-semibold placeholder:text-muted-foreground focus:outline-none"
        />
        <SectionControls
          isCollapsed={section.isCollapsed}
          onToggleCollapse={() => onUpdate({ isCollapsed: !section.isCollapsed })}
          onDelete={onDelete}
          dragHandleProps={dragHandleProps}
        />
      </div>

      {!section.isCollapsed && (
        <div className="flex flex-col gap-3">
          <SectionImage
            imageUrl={section.imageUrl}
            placeholder={section.imagePlaceholder}
            onImageChange={(url) => onUpdate({ imageUrl: url })}
            sectionHeader={section.header}
            sectionText={section.text}
          />

          {section.type === 'qa' ? (
            <div className="flex flex-col gap-2 rounded-md bg-muted/50 p-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Q.</label>
                <input
                  value={section.question || ''}
                  onChange={(e) => onUpdate({ question: e.target.value })}
                  placeholder="질문을 입력하세요"
                  className="mt-1 w-full bg-transparent text-sm font-medium focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">A.</label>
                <textarea
                  value={section.answer || ''}
                  onChange={(e) => onUpdate({ answer: e.target.value })}
                  placeholder="답변을 입력하세요"
                  rows={2}
                  className="mt-1 w-full resize-none bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>
          ) : section.type === 'summary' ? (
            <div className="rounded-md bg-accent p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">핵심 요약</p>
              {(section.points || []).map((point, idx) => (
                <div key={idx} className="mb-1 flex items-start gap-2">
                  <span className="mt-0.5 text-xs text-primary">●</span>
                  <input
                    value={point}
                    onChange={(e) => {
                      const newPoints = [...(section.points || [])];
                      newPoints[idx] = e.target.value;
                      onUpdate({ points: newPoints });
                    }}
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                </div>
              ))}
              <button
                onClick={() => onUpdate({ points: [...(section.points || []), ''] })}
                className="mt-1 text-xs text-primary hover:underline"
              >
                + 항목 추가
              </button>
            </div>
          ) : (
            <SectionText
              content={section.text}
              onChange={(html) => onUpdate({ text: html })}
              placeholder={
                section.type === 'intro'
                  ? '독자를 끌어들이는 도입부를 작성하세요...'
                  : '본문 내용을 작성하세요...'
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
