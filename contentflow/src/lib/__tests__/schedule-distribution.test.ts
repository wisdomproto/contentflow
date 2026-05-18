// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { distributeSchedule } from '../schedule-distribution';

describe('distributeSchedule', () => {
  it('returns exactly N×L slots for N contents and L languages', () => {
    const result = distributeSchedule({
      contentIds: ['c1', 'c2', 'c3'],
      languages: ['ko', 'th'],
      startDate: '2026-05-20',
      perWeek: 5,
      weekdays: [1, 2, 3, 4, 5], // Mon-Fri
      timeSlots: ['09:00'],
      languageOffsetDays: 0,
    });
    expect(result).toHaveLength(6);
  });

  it('respects weekday mask', () => {
    const result = distributeSchedule({
      contentIds: ['c1', 'c2', 'c3', 'c4', 'c5'],
      languages: ['ko'],
      startDate: '2026-05-20', // Wed
      perWeek: 3,
      weekdays: [1, 3, 5], // Mon, Wed, Fri only
      timeSlots: ['10:00'],
      languageOffsetDays: 0,
    });
    for (const slot of result) {
      const day = new Date(slot.scheduledAt).getDay();
      expect([1, 3, 5]).toContain(day);
    }
  });

  it('applies languageOffsetDays — TH falls N days after KR', () => {
    const result = distributeSchedule({
      contentIds: ['c1'],
      languages: ['ko', 'th'],
      startDate: '2026-05-20',
      perWeek: 7,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      timeSlots: ['09:00'],
      languageOffsetDays: 3,
    });
    const ko = result.find((r) => r.contentId === 'c1' && r.language === 'ko');
    const th = result.find((r) => r.contentId === 'c1' && r.language === 'th');
    expect(ko && th).toBeTruthy();
    const diff = (new Date(th!.scheduledAt).getTime() - new Date(ko!.scheduledAt).getTime()) / 86400000;
    expect(diff).toBeCloseTo(3, 0);
  });

  it('past startDate snaps to now+5min', () => {
    const past = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const result = distributeSchedule({
      contentIds: ['c1'],
      languages: ['ko'],
      startDate: past,
      perWeek: 7,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      timeSlots: ['09:00'],
      languageOffsetDays: 0,
    });
    expect(new Date(result[0].scheduledAt).getTime()).toBeGreaterThanOrEqual(Date.now());
  });

  it('rotates through multiple timeSlots round-robin', () => {
    const result = distributeSchedule({
      contentIds: ['c1', 'c2', 'c3'],
      languages: ['ko'],
      startDate: '2026-05-20',
      perWeek: 3,
      weekdays: [3], // Wed only — so 1/week
      timeSlots: ['09:00', '14:00', '19:00'],
      languageOffsetDays: 0,
    });
    // All 3 fall on same day, rotating times
    const times = result.map((r) => r.scheduledAt.slice(11, 16)).sort();
    expect(times).toEqual(['09:00', '14:00', '19:00']);
  });
});
