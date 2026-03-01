'use client';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { useContentStore } from '@/stores/useContentStore';
import { Smartphone, Monitor } from 'lucide-react';

export function PreviewPanel() {
  const previewMode = useUIStore((s) => s.previewMode);
  const setPreviewMode = useUIStore((s) => s.setPreviewMode);
  const activeContentId = useContentStore((s) => s.activeContentId);
  const contents = useContentStore((s) => s.contents);

  const content = activeContentId ? contents[activeContentId] : null;
  if (!content || !content.blog.title) return null;

  return (
    <div className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">미리보기</h3>
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          <button
            onClick={() => setPreviewMode('mobile')}
            className={cn(
              'rounded p-1',
              previewMode === 'mobile' ? 'bg-muted text-primary' : 'text-muted-foreground',
            )}
            title="모바일"
          >
            <Smartphone size={14} />
          </button>
          <button
            onClick={() => setPreviewMode('desktop')}
            className={cn(
              'rounded p-1',
              previewMode === 'desktop' ? 'bg-muted text-primary' : 'text-muted-foreground',
            )}
            title="데스크탑"
          >
            <Monitor size={14} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-lg border border-border bg-card',
          previewMode === 'mobile' ? 'mx-auto w-[280px]' : 'w-full',
        )}
      >
        <div className="p-3">
          <h1 className="mb-3 text-sm font-bold leading-tight">{content.blog.title}</h1>
          {content.blog.sections.map((section) => (
            <div key={section.id} className="mb-3">
              {section.header && (
                <h2 className="mb-1 text-xs font-bold">{section.header}</h2>
              )}
              {section.imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={section.imageUrl}
                  alt=""
                  className="mb-1.5 w-full rounded"
                />
              )}
              {section.type === 'qa' ? (
                <div className="rounded bg-muted p-2 text-xs">
                  <p className="font-medium">Q. {section.question}</p>
                  <p className="mt-1 text-muted-foreground">A. {section.answer}</p>
                </div>
              ) : section.type === 'summary' ? (
                <div className="rounded bg-accent p-2 text-xs">
                  {section.points?.map((p, i) => (
                    <p key={i}>● {p}</p>
                  ))}
                </div>
              ) : (
                <div
                  className="text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: section.text }}
                />
              )}
            </div>
          ))}
          {content.blog.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {content.blog.tags.map((tag) => (
                <span key={tag} className="text-xs text-primary">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
