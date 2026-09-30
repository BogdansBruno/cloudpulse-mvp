import { describe, it, expect } from 'vitest';
import { isScoutToken, parseCv, parseShares, regularity, scoutUrl, shareStatus } from './scout-cv';

describe('scout links', () => {
  const base = { approvedAt: null, revokedAt: null, expiresAt: '2026-10-20T10:00:00Z' };
  const now = new Date('2026-10-10T10:00:00Z');

  it('status: pending until a parent switches it on; revoked and expired win', () => {
    expect(shareStatus(base, now)).toBe('pending');
    expect(shareStatus({ ...base, approvedAt: '2026-10-09T10:00:00Z' }, now)).toBe('active');
    expect(shareStatus({ ...base, approvedAt: '2026-10-09T10:00:00Z', revokedAt: '2026-10-10T09:00:00Z' }, now)).toBe('revoked');
    expect(shareStatus({ ...base, expiresAt: '2026-10-10T09:00:00Z' }, now)).toBe('expired');
  });

  it('only a 64-hex token is a link; url has no trailing slash issues', () => {
    expect(isScoutToken('a'.repeat(64))).toBe(true);
    expect(isScoutToken('A'.repeat(64))).toBe(false);
    expect(isScoutToken("'; drop table")).toBe(false);
    expect(scoutUrl('https://x.app/', 'ab')).toBe('https://x.app/cv/ab');
  });

  it('parses the share list and skips broken rows', () => {
    const s = parseShares([
      { id: '1', display_name: 'Max', recipient: 'Academy', created_at: 'a', expires_at: 'b', view_count: 2, show_health: true },
      { id: '2' },
    ]);
    expect(s.length).toBe(1);
    expect([s[0].viewCount, s[0].showHealth, s[0].showReadiness]).toEqual([2, true, true]);
  });
});

describe('what the scout sees', () => {
  const raw = {
    status: 'ok',
    ref: 'AB12CD34',
    display_name: 'Maksims K.',
    recipient: 'FK Academy',
    sport: 'Football',
    generated_at: '2026-10-10T10:00:00Z',
    expires_at: '2026-10-24T10:00:00Z',
    period: { from: '2025-10-10', to: '2026-10-10' },
    discipline: { checkin_days: 290, period_days: 366, active_weeks: 50, total_weeks: 53, longest_streak: 41, sessions_logged: 180 },
    readiness: [{ month: '2026-09', days: 28, green: 20, yellow: 6, red: 2, avg_score: 78 }, { month: 'bad' }],
    health: null,
  };

  it('parses; invalid links give null', () => {
    const cv = parseCv(raw)!;
    expect(cv.discipline.checkinDays).toBe(290);
    expect(cv.readiness?.length).toBe(1);
    expect(cv.health).toBeNull();
    expect(parseCv({ status: 'invalid' })).toBeNull();
    expect(parseCv(null)).toBeNull();
  });

  it('regularity is counted in weeks', () => {
    expect(regularity(parseCv(raw)!)).toEqual({ weeks: 50, of: 53 });
  });

  it('health appears only when the athlete ticked it', () => {
    const cv = parseCv({ ...raw, health: { pain_reports_12m: 2, returns_confirmed_12m: 2 } })!;
    expect(cv.health).toEqual({ painReports12m: 2, returnsConfirmed12m: 2 });
  });
});
