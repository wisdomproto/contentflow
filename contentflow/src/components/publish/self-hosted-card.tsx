'use client';

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { BulkScheduleDialog } from './bulk-schedule-dialog';

export function SelfHostedCard() {
  const { selectedProjectId, projects, fetchPublishCountsByLanguage } = useProjectStore();
  const project = projects.find((p) => p.id === selectedProjectId);
  const site = project?.published_site;
  const enabled = !!site?.enabled;
  const [counts, setCounts] = useState<Record<string, { scheduled: number; published: number }>>({});
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!enabled || !project) return;
    void fetchPublishCountsByLanguage(project.id).then((c) => {
      const next = { ...c };
      for (const lang of site!.active_languages) {
        if (!next[lang]) next[lang] = { scheduled: 0, published: 0 };
      }
      setCounts(next);
    });
  }, [enabled, project?.id, fetchPublishCountsByLanguage]);

  if (!enabled) {
    return (
      <div className="bg-card border border-dashed border-border rounded-lg p-4 opacity-60">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={18} className="text-muted-foreground" />
          <span className="text-sm font-semibold">내 사이트</span>
        </div>
        <p className="text-xs text-muted-foreground">프로젝트 설정에서 사이트 등록·활성화 필요</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={18} className="text-primary" />
          <div>
            <div className="text-sm font-semibold">내 사이트 ({new URL(site!.domain).hostname})</div>
            <div className="text-xs text-green-500">● 활성</div>
          </div>
        </div>

        <div className="space-y-1 mb-3">
          {site!.active_languages.map((lang) => {
            const c = counts[lang] || { scheduled: 0, published: 0 };
            return (
              <div key={lang} className="text-xs flex justify-between">
                <span>{lang.toUpperCase()}</span>
                <span className="text-muted-foreground">예약 {c.scheduled} · 발행 {c.published}</span>
              </div>
            );
          })}
        </div>

        <Button size="sm" className="w-full" onClick={() => setDialogOpen(true)}>일괄 예약 +</Button>
      </div>

      <BulkScheduleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
