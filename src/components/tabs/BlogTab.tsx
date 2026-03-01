'use client';

import { BlogEditor } from '@/components/blog/BlogEditor';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ImageModelSelector } from '@/components/ui/ImageModelSelector';
import { useContentStore } from '@/stores/useContentStore';

export function BlogTab() {
  const activeContentId = useContentStore((s) => s.activeContentId);
  const contents = useContentStore((s) => s.contents);
  const content = activeContentId ? contents[activeContentId] : null;

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 text-4xl">📝</div>
        <h2 className="mb-2 text-lg font-semibold">컨텐츠를 선택해주세요</h2>
        <p className="text-sm text-muted-foreground">
          사이드바에서 컨텐츠를 선택하거나
          <br />
          기본 설정 탭에서 AI 초안을 생성하세요
        </p>
      </div>
    );
  }

  if (!content.blog.title && content.blog.sections.length <= 1 && !content.blog.sections[0]?.text) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 text-4xl">✨</div>
        <h2 className="mb-2 text-lg font-semibold">블로그 초안이 아직 없습니다</h2>
        <p className="text-sm text-muted-foreground">
          기본 설정 탭에서 주제를 입력하고
          <br />
          &apos;AI 초안 생성&apos; 버튼을 클릭해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-end gap-3 rounded-lg border border-border bg-card px-4 py-2 shadow-sm">
        <span className="text-xs text-muted-foreground">글쓰기</span>
        <ModelSelector
          tab="blog"
          contentId={content.id}
          currentModel={content.modelSettings?.blog ?? 'flash'}
          compact
        />
        <div className="h-4 w-px bg-border" />
        <span className="text-xs text-muted-foreground">이미지</span>
        <ImageModelSelector
          contentId={content.id}
          currentModel={content.imageModel ?? 'flash-image'}
        />
      </div>
      <BlogEditor />
    </div>
  );
}
