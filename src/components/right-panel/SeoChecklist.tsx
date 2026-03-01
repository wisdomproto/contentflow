'use client';

import { useContentStore } from '@/stores/useContentStore';
import { CheckCircle2, Circle } from 'lucide-react';

interface CheckItem {
  label: string;
  check: (content: { blog: { title: string; sections: { type: string; text: string; question?: string; answer?: string; points?: string[] }[]; tags: string[] }; source: { keywords: string[]; insights: string } }) => boolean;
}

const C_RANK_CHECKS: CheckItem[] = [
  {
    label: '제목에 메인 키워드 포함',
    check: (c) => c.source.keywords.some((kw) => c.blog.title.includes(kw)),
  },
  {
    label: '본문 3개 이상 섹션 구성',
    check: (c) => c.blog.sections.length >= 3,
  },
  {
    label: '태그 3개 이상 설정',
    check: (c) => c.blog.tags.length >= 3,
  },
];

const DIA_CHECKS: CheckItem[] = [
  {
    label: '경험 데이터 포함',
    check: (c) => c.source.insights.length > 10,
  },
  {
    label: '후킹 도입부 작성',
    check: (c) => {
      const intro = c.blog.sections.find((s) => s.type === 'intro');
      return (intro?.text?.length ?? 0) > 30;
    },
  },
  {
    label: '이미지 섹션 포함',
    check: () => true, // placeholder
  },
];

const GEO_CHECKS: CheckItem[] = [
  {
    label: 'Q&A 블록 포함',
    check: (c) => c.blog.sections.some((s) => s.type === 'qa'),
  },
  {
    label: '핵심 요약 블록 포함',
    check: (c) => c.blog.sections.some((s) => s.type === 'summary'),
  },
  {
    label: '구체적 정보 포함 (숫자/고유명사)',
    check: () => true, // placeholder
  },
];

function CheckGroup({ title, emoji, items, content }: {
  title: string;
  emoji: string;
  items: CheckItem[];
  content: Parameters<CheckItem['check']>[0];
}) {
  const passed = items.filter((item) => item.check(content)).length;
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold">
          {emoji} {title}
        </span>
        <span className="text-xs text-muted-foreground">
          {passed}/{items.length}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const ok = item.check(content);
          return (
            <div key={item.label} className="flex items-center gap-1.5 text-xs">
              {ok ? (
                <CheckCircle2 size={14} className="text-green-500 dark:text-green-400" />
              ) : (
                <Circle size={14} className="text-muted-foreground" />
              )}
              <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SeoChecklist() {
  const activeContentId = useContentStore((s) => s.activeContentId);
  const contents = useContentStore((s) => s.contents);
  const content = activeContentId ? contents[activeContentId] : null;

  if (!content || !content.blog.title) return null;

  return (
    <div className="rounded-lg border border-border p-3">
      <h3 className="mb-3 text-sm font-semibold">SEO 체크리스트</h3>
      <CheckGroup title="C-Rank" emoji="🏆" items={C_RANK_CHECKS} content={content} />
      <CheckGroup title="D.I.A+" emoji="💎" items={DIA_CHECKS} content={content} />
      <CheckGroup title="GEO" emoji="🌐" items={GEO_CHECKS} content={content} />
    </div>
  );
}
