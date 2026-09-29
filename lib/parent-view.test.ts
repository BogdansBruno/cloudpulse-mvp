import { describe, it, expect } from 'vitest';
import {
  childCalendar,
  fromLegacyDashboard,
  homeTips,
  parseOverview,
  tightRanges,
  weekSummary,
} from './parent-view';

const TODAY = '2026-10-01';

describe('parseOverview', () => {
  it('reads a full row from parent_overview()', () => {
    const o = parseOverview({
      link_id: 'l1',
      athlete_label: 'Макс',
      consent: true,
      calendar_consent: true,
      today: { checked_in: true, zone: 'red', restricted: true },
      week: [
        { date: '2026-09-25', zone: null, checked_in: false },
        { date: '2026-10-01', zone: 'red', checked_in: true },
      ],
      coach: { state: 'answered', reaction: 'rest', at: '2026-10-01T15:00:00+00:00' },
      calendar: { exams: ['2026-10-04', '2026-10-04', 'soon'], matches: ['2026-10-03'] },
    });
    expect(o).toEqual({
      linkId: 'l1',
      athleteLabel: 'Макс',
      consent: true,
      calendarConsent: true,
      today: { checkedIn: true, zone: 'red', restricted: true },
      week: [
        { date: '2026-09-25', zone: null, checkedIn: false },
        { date: '2026-10-01', zone: 'red', checkedIn: true },
      ],
      coach: { state: 'answered', reaction: 'rest', at: '2026-10-01T15:00:00+00:00' },
      calendar: { exams: ['2026-10-04'], matches: ['2026-10-03'] },
    });
  });

  it('no consent → everything but the link is null', () => {
    expect(parseOverview({ link_id: 'l1', athlete_label: null, consent: false, calendar_consent: false })).toEqual({
      linkId: 'l1',
      athleteLabel: null,
      consent: false,
      calendarConsent: false,
      today: null,
      week: null,
      coach: null,
      calendar: null,
    });
    expect(parseOverview({ nope: 1 })).toBeNull();
  });

  it('falls back to the old parent_dashboard() row', () => {
    expect(fromLegacyDashboard({ link_id: 'l1', athlete_label: 'Макс', consent: true, checked_in: true, zone: 'green', restricted: false }))
      .toEqual(expect.objectContaining({ consent: true, today: { checkedIn: true, zone: 'green', restricted: false }, calendar: null }));
  });
});

describe('weekSummary', () => {
  it('counts check-in days', () => {
    expect(
      weekSummary([
        { date: 'a', zone: 'green', checkedIn: true },
        { date: 'b', zone: null, checkedIn: false },
        { date: 'c', zone: 'red', checkedIn: true },
      ])
    ).toEqual({ checkedIn: 2, total: 3 });
  });
});

describe('childCalendar', () => {
  it('marks exam window (exam day + 3 days before) and tight exam/match days', () => {
    const days = childCalendar({ exams: ['2026-10-05'], matches: ['2026-10-04'] }, TODAY, 7);
    expect(days.map((d) => d.examWindow)).toEqual([false, true, true, true, true, false, false]);
    expect(days.filter((d) => d.tight).map((d) => d.date)).toEqual(['2026-10-04', '2026-10-05']);
    expect(tightRanges(days)).toEqual([{ from: '2026-10-04', to: '2026-10-05' }]);
  });

  it('exam and match far apart are not tight', () => {
    const days = childCalendar({ exams: ['2026-10-02'], matches: ['2026-10-08'] }, TODAY, 10);
    expect(days.some((d) => d.tight)).toBe(false);
  });
});

describe('homeTips', () => {
  const green = { checkedIn: true, zone: 'green' as const, restricted: false };
  it('red day first, then calendar tips; never more than 3', () => {
    const tips = homeTips(
      { checkedIn: true, zone: 'red', restricted: true },
      { exams: ['2026-10-02', '2026-10-04'], matches: ['2026-10-01', '2026-10-02'] },
      TODAY
    );
    expect(tips).toEqual(['RED_TODAY', 'EXAM_AND_MATCH_CLOSE', 'MATCH_TODAY']);
  });

  it('tomorrow tips and a busy week', () => {
    expect(homeTips(green, { exams: ['2026-10-02', '2026-10-06'], matches: [] }, TODAY)).toEqual(['EXAM_TOMORROW', 'BUSY_WEEK']);
    expect(homeTips(green, { exams: [], matches: ['2026-10-02'] }, TODAY)).toEqual(['MATCH_TOMORROW']);
  });

  it('without calendar consent only the colour can give a tip', () => {
    expect(homeTips(green, null, TODAY)).toEqual([]);
    expect(homeTips(null, null, TODAY)).toEqual([]);
  });
});
