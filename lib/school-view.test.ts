import { describe, it, expect } from 'vitest';
import { parseSchoolRow, parseExamDay, stateOf, sortRows, countStates, needsAttention, type SchoolRow } from './school-view';

const row = (over: Partial<SchoolRow> = {}): SchoolRow => ({
  label: 'A',
  consent: true,
  checkedIn: true,
  zone: 'green',
  restricted: false,
  pain: false,
  ...over,
});

describe('parseSchoolRow', () => {
  it('without consent everything is locked, even if the payload carries values', () => {
    const r = parseSchoolRow({ athlete_label: 'Maks', consent: false, checked_in: true, zone: 'red', restricted: true, pain: true });
    expect(r).toEqual({ label: 'Maks', consent: false, checkedIn: false, zone: null, restricted: false, pain: false });
    expect(stateOf(r!)).toBe('locked');
  });
  it('reads a consented row', () => {
    const r = parseSchoolRow({ athlete_label: ' Zara ', consent: true, checked_in: true, zone: 'yellow', restricted: false, pain: false });
    expect(r).toMatchObject({ label: 'Zara', zone: 'yellow', checkedIn: true });
  });
  it('rejects rows without a label and junk', () => {
    expect(parseSchoolRow({ athlete_label: '  ' })).toBeNull();
    expect(parseSchoolRow(null)).toBeNull();
    expect(parseSchoolRow('x')).toBeNull();
  });
  it('an unknown zone becomes null, never a crash', () => {
    expect(parseSchoolRow({ athlete_label: 'A', consent: true, checked_in: true, zone: 'purple' })!.zone).toBeNull();
  });
});

describe('stateOf priority', () => {
  it('pain beats everything', () => expect(stateOf(row({ pain: true, zone: 'green' }))).toBe('pain'));
  it('no check-in is shown as such, not as green', () => expect(stateOf(row({ checkedIn: false, zone: null }))).toBe('no_checkin'));
  it('red day', () => expect(stateOf(row({ zone: 'red' }))).toBe('red'));
  it('restriction on a green day is still flagged', () => expect(stateOf(row({ restricted: true }))).toBe('restricted'));
  it('yellow', () => expect(stateOf(row({ zone: 'yellow' }))).toBe('yellow'));
  it('green', () => expect(stateOf(row())).toBe('green'));
});

describe('sorting and counts', () => {
  const rows = [
    row({ label: 'G' }),
    row({ label: 'L', consent: false, checkedIn: false, zone: null }),
    row({ label: 'P', pain: true, zone: 'red' }),
    row({ label: 'Y', zone: 'yellow' }),
    row({ label: 'N', checkedIn: false, zone: null }),
  ];
  it('most urgent first, locked last', () => {
    expect(sortRows(rows).map((r) => r.label)).toEqual(['P', 'Y', 'N', 'G', 'L']);
  });
  it('counts and attention', () => {
    const c = countStates(rows);
    expect(c).toMatchObject({ pain: 1, yellow: 1, no_checkin: 1, green: 1, locked: 1 });
    expect(needsAttention(c)).toBe(1);
  });
});

describe('parseExamDay', () => {
  it('keeps days with three or more pupils', () => expect(parseExamDay({ day: '2026-10-12', athletes: 3 })).toEqual({ day: '2026-10-12', athletes: 3 }));
  it('drops small groups (privacy), bad dates and junk', () => {
    expect(parseExamDay({ day: '2026-10-12', athletes: 2 })).toBeNull();
    expect(parseExamDay({ day: '12.10.2026', athletes: 5 })).toBeNull();
    expect(parseExamDay({ day: '2026-10-12', athletes: 'x' })).toBeNull();
  });
});
