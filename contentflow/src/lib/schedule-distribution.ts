export interface DistributeInput {
  contentIds: string[];
  languages: string[];
  startDate: string;          // YYYY-MM-DD
  endDate?: string;           // optional
  perWeek: number;
  weekdays: number[];         // 0=Sun..6=Sat
  timeSlots: string[];        // ['09:00', '14:00'...]
  languageOffsetDays: number; // 0 → simultaneous. N → second language N days later
}

export interface DistributedSlot {
  contentId: string;
  language: string;
  scheduledAt: string; // ISO
}

export function distributeSchedule(input: DistributeInput): DistributedSlot[] {
  const slots: DistributedSlot[] = [];
  const totalNeeded = input.contentIds.length;

  // Generate base slots (one per content item, for the first language)
  const baseSlots = generateBaseSlots(input, totalNeeded);

  for (let i = 0; i < input.contentIds.length; i++) {
    const cId = input.contentIds[i];
    input.languages.forEach((lang, langIdx) => {
      const base = baseSlots[i];
      const offsetMs = langIdx * input.languageOffsetDays * 86400000;
      const ts = new Date(base.getTime() + offsetMs).toISOString();
      slots.push({ contentId: cId, language: lang, scheduledAt: ts });
    });
  }
  return slots;
}

/**
 * Generates n Date objects respecting weekday mask, perWeek limit, and
 * time-slot round-robin. If startDate is in the past, first slot snaps to
 * now+5 min (but subsequent slots continue from the calendar normally).
 */
function generateBaseSlots(input: DistributeInput, n: number): Date[] {
  const result: Date[] = [];

  // Parse startDate as UTC midnight so ISO output matches input times exactly
  // e.g. startDate='2026-05-20' + timeSlot='09:00' → '2026-05-20T09:00:00.000Z'
  const startMidnightUTC = new Date(input.startDate + 'T00:00:00.000Z');
  const now = new Date();
  const isPastStart = startMidnightUTC.getTime() < now.getTime();

  // cursor walks day-by-day (UTC day boundaries)
  // We track as year/month/day numerics to avoid DST issues
  let cursorYear = parseInt(input.startDate.slice(0, 4));
  let cursorMonth = parseInt(input.startDate.slice(5, 7)) - 1; // 0-based
  let cursorDay = parseInt(input.startDate.slice(8, 10));

  let slotIdx = 0; // for round-robin through timeSlots

  // Calculate how many slots to emit per eligible day.
  // perWeek slots are spread evenly across the selected weekdays.
  const eligibleDaysPerWeek = input.weekdays.length;
  // slotsPerDay: how many time-slots we emit per calendar day
  // E.g. perWeek=3, weekdays=[3] → slotsPerDay=3 (all 3 on Wed)
  // E.g. perWeek=5, weekdays=[1,2,3,4,5] → slotsPerDay=1
  const slotsPerDay = Math.max(1, Math.ceil(input.perWeek / eligibleDaysPerWeek));

  // Safety: stop after scanning 2 years worth of days
  const maxDays = 730;
  let daysScanned = 0;

  while (result.length < n && daysScanned < maxDays) {
    // Build UTC date for current cursor day at midnight
    const cursorMidnight = new Date(Date.UTC(cursorYear, cursorMonth, cursorDay, 0, 0, 0, 0));
    const dayOfWeek = cursorMidnight.getUTCDay();

    if (input.weekdays.includes(dayOfWeek)) {
      for (let s = 0; s < slotsPerDay && result.length < n; s++) {
        const timeStr = input.timeSlots[slotIdx % input.timeSlots.length];
        const [h, m] = timeStr.split(':').map(Number);

        // Build the scheduled datetime in UTC with the given h:m
        const d = new Date(Date.UTC(cursorYear, cursorMonth, cursorDay, h, m, 0, 0));

        // If this specific datetime is in the past, snap to now+5min
        // Only applies when the whole start is in the past (snap mode)
        if (isPastStart && d.getTime() < now.getTime()) {
          d.setTime(now.getTime() + 5 * 60_000);
        }

        result.push(d);
        slotIdx++;
      }
    }

    // Advance cursor by 1 day (UTC-safe via Date arithmetic)
    const next = new Date(Date.UTC(cursorYear, cursorMonth, cursorDay + 1));
    cursorYear = next.getUTCFullYear();
    cursorMonth = next.getUTCMonth();
    cursorDay = next.getUTCDate();
    daysScanned++;
  }

  return result;
}
