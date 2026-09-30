import { describe, it, expect, beforeAll } from 'vitest';
import { activeTravel, isLongTrip, parseTrips, recoveryUntil, validateTrip } from './travel';
import { signTravelNote, travelNoteId, verifyTravelNote } from './travel-note';

const trips = parseTrips([
  { id: 't1', title: 'Liepāja', match_date: '2026-10-04', return_date: '2026-10-04', travel_hours: 6 },
  { id: 't2', title: 'Jūrmala', match_date: '2026-10-08', return_date: '2026-10-08', travel_hours: 2 },
  { id: 'bad', title: 'x', match_date: '2026-10-08', return_date: '2026-10-08', travel_hours: 99 },
]);

describe('after an away trip — 48 hours of recovery from 4 h on the road', () => {
  it('parses and drops impossible rows', () => {
    expect(trips.map((t) => t.id)).toEqual(['t1', 't2']);
    expect([isLongTrip(trips[0]), isLongTrip(trips[1])]).toEqual([true, false]);
  });

  it('return day and the next day only', () => {
    expect(recoveryUntil(trips[0])).toBe('2026-10-05');
    expect(activeTravel(trips, '2026-10-03')).toBeNull();
    expect(activeTravel(trips, '2026-10-04')?.day).toBe(1);
    expect(activeTravel(trips, '2026-10-05')?.day).toBe(2);
    expect(activeTravel(trips, '2026-10-06')).toBeNull();
    expect(activeTravel(trips, '2026-10-08')).toBeNull(); // short trip
  });

  it('validates the coach form', () => {
    expect(validateTrip({ title: 'Liepāja', matchDate: '2026-10-04', returnDate: '2026-10-05', travelHours: 6 })).toEqual([]);
    expect(validateTrip({ title: ' ', matchDate: '2026-10-04', returnDate: '2026-10-03', travelHours: 0 })).toEqual(['TITLE', 'RETURN_DATE', 'HOURS']);
    expect(validateTrip({ title: 'x', matchDate: '2026-10-04', returnDate: '2026-10-20', travelHours: 5 })).toEqual(['RETURN_DATE']);
  });
});

describe('travel note for school — signed, no name', () => {
  beforeAll(() => {
    process.env.PASS_SIGNING_SECRET = 'test-secret-test-secret-test-secret-42';
  });

  it('round trip; valid until the last recovery day', () => {
    const id = travelNoteId('user-1', 't1');
    const token = signTravelNote({ v: 1, k: 'travel', r: '2026-10-04', u: '2026-10-05', h: 6, id });
    const ok = verifyTravelNote(token, '2026-10-05');
    expect(ok.valid && !ok.expired && ok.payload.h).toBe(6);
    const late = verifyTravelNote(token, '2026-10-06');
    expect(late.valid && late.expired).toBe(true);
  });

  it('a changed body or signature is rejected', () => {
    const id = travelNoteId('user-1', 't1');
    const token = signTravelNote({ v: 1, k: 'travel', r: '2026-10-04', u: '2026-10-05', h: 6, id });
    const [body, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ v: 1, k: 'travel', r: '2026-10-04', u: '2026-12-31', h: 6, id }), 'utf8').toString('base64url');
    expect(verifyTravelNote(`${forged}.${sig}`, '2026-10-05').valid).toBe(false);
    expect(verifyTravelNote(`${body}.${sig.slice(0, -2)}xx`, '2026-10-05').valid).toBe(false);
    expect(verifyTravelNote('nonsense', '2026-10-05').valid).toBe(false);
  });
});
