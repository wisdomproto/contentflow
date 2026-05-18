'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useProjectStore } from '@/stores/project-store';
import { distributeSchedule } from '@/lib/schedule-distribution';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface Props { open: boolean; onOpenChange: (v: boolean) => void }

export function BulkScheduleDialog({ open, onOpenChange }: Props) {
  const { selectedProjectId, projects, contents, bulkSchedulePublish } = useProjectStore();
  const project = projects.find((p) => p.id === selectedProjectId);
  const site = project?.published_site;

  const [stage, setStage] = useState(1);
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [perWeek, setPerWeek] = useState(5);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timeSlots, setTimeSlots] = useState<string>('09:00');
  const [langOffsetDays, setLangOffsetDays] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const projectContents = useMemo(
    () => contents.filter((c) => c.project_id === selectedProjectId),
    [contents, selectedProjectId],
  );
  const filteredContents = useMemo(
    () => categoryFilter ? projectContents.filter((c) => (c.category || '').startsWith(categoryFilter)) : projectContents,
    [projectContents, categoryFilter],
  );

  const previewSlots = useMemo(() => {
    if (stage < 4) return [];
    return distributeSchedule({
      contentIds: selectedContentIds,
      languages: selectedLangs,
      startDate,
      perWeek,
      weekdays,
      timeSlots: timeSlots.split(',').map((t) => t.trim()).filter(Boolean),
      languageOffsetDays: langOffsetDays,
    });
  }, [stage, selectedContentIds, selectedLangs, startDate, perWeek, weekdays, timeSlots, langOffsetDays]);

  async function handleConfirm() {
    if (!project) return;
    setSubmitting(true);
    try {
      const rows = previewSlots.map((s) => ({
        contentId: s.contentId,
        projectId: project.id,
        language: s.language,
        channel: 'self_hosted' as const,
        scheduledAt: s.scheduledAt,
      }));
      const { inserted, skipped } = await bulkSchedulePublish(rows);
      onOpenChange(false);
      alert(`${inserted}건 예약 완료${skipped ? ` · ${skipped}건 스킵(이미 예약/발행됨)` : ''}`);
    } catch (err) {
      alert(`예약 실패: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>일괄 예약 발행 — 단계 {stage}/5</DialogTitle>
        </DialogHeader>

        {stage === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">콘텐츠 선택 ({selectedContentIds.length}/{filteredContents.length})</p>
            <div className="flex gap-2 flex-wrap">
              {['A', 'B', 'C', 'D', 'E'].map((cat) => (
                <Button key={cat} size="sm" variant={categoryFilter === cat ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}>
                  {cat}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setSelectedContentIds(filteredContents.map((c) => c.id))}>전체 선택</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedContentIds([])}>전체 해제</Button>
            </div>
            <div className="max-h-80 overflow-y-auto border rounded">
              {filteredContents.map((c) => (
                <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-muted/30 border-b last:border-0">
                  <Checkbox checked={selectedContentIds.includes(c.id)} onCheckedChange={(v) =>
                    setSelectedContentIds((prev) => v ? [...prev, c.id] : prev.filter((x) => x !== c.id))
                  } />
                  <span className="text-xs text-muted-foreground">{c.category}</span>
                  <span className="text-sm">{c.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {stage === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">언어 선택</p>
            {site?.active_languages.map((lang) => (
              <label key={lang} className="flex items-center gap-2">
                <Checkbox checked={selectedLangs.includes(lang)} onCheckedChange={(v) =>
                  setSelectedLangs((prev) => v ? [...prev, lang] : prev.filter((x) => x !== lang))
                } />
                <span>{lang.toUpperCase()}</span>
              </label>
            ))}
          </div>
        )}

        {stage === 3 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs">시작일</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div><label className="text-xs">주당 횟수</label>
                <Input type="number" value={perWeek} onChange={(e) => setPerWeek(+e.target.value)} /></div>
            </div>
            <div>
              <label className="text-xs">요일</label>
              <div className="flex gap-2">
                {WEEKDAY_LABELS.map((l, i) => (
                  <button key={i} type="button"
                    onClick={() => setWeekdays((w) => w.includes(i) ? w.filter((x) => x !== i) : [...w, i].sort())}
                    className={`px-3 py-1 rounded ${weekdays.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs">시간대 (쉼표 구분, 예: 09:00, 14:00)</label>
              <Input value={timeSlots} onChange={(e) => setTimeSlots(e.target.value)} />
            </div>
            <div>
              <label className="text-xs">언어 간 시차 (일) — 두 번째 언어는 첫 언어보다 N일 늦게</label>
              <Input type="number" value={langOffsetDays} onChange={(e) => setLangOffsetDays(+e.target.value)} />
            </div>
          </div>
        )}

        {stage === 4 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">미리보기 — {previewSlots.length}건</p>
            <div className="max-h-80 overflow-y-auto border rounded font-mono text-xs">
              {previewSlots.map((s, i) => {
                const c = projectContents.find((x) => x.id === s.contentId);
                return (
                  <div key={i} className="flex justify-between p-1 border-b last:border-0">
                    <span>{s.scheduledAt.slice(0, 16).replace('T', ' ')}</span>
                    <span className="text-muted-foreground">{s.language.toUpperCase()}</span>
                    <span className="flex-1 ml-2 truncate">{c?.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {stage === 5 && (
          <div className="space-y-2 text-center py-8">
            <p>총 <b>{previewSlots.length}건</b>을 publish_records에 예약 등록합니다.</p>
            <p className="text-xs text-muted-foreground">취소는 발행 큐에서 개별 가능합니다.</p>
          </div>
        )}

        <DialogFooter>
          {stage > 1 && <Button variant="outline" onClick={() => setStage(stage - 1)}>이전</Button>}
          {stage < 5 && (
            <Button onClick={() => setStage(stage + 1)}
              disabled={
                (stage === 1 && selectedContentIds.length === 0) ||
                (stage === 2 && selectedLangs.length === 0)
              }>다음</Button>
          )}
          {stage === 5 && (
            <Button onClick={handleConfirm} disabled={submitting}>
              {submitting ? '예약 중…' : '일괄 예약 확정'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
