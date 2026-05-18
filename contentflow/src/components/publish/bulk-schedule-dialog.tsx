'use client';
interface Props { open: boolean; onOpenChange: (v: boolean) => void }
export function BulkScheduleDialog({ open, onOpenChange }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card p-6 rounded">
        <p>일괄 예약 마법사 (Task 11에서 구현 예정)</p>
        <button onClick={() => onOpenChange(false)} className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded">닫기</button>
      </div>
    </div>
  );
}
