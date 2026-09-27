import { describe, it, expect } from 'vitest';
import {
  normalizeInviteCode,
  isValidInviteCode,
  formatInviteCode,
  joinPath,
  joinUrl,
  safeNextPath,
  joinErrorCode,
  cleanAthleteLabel,
} from './invite';

describe('invite codes', () => {
  it('normalizes case, spaces and dashes', () => {
    expect(normalizeInviteCode(' abcd-efgh ')).toBe('ABCDEFGH');
  });

  it('accepts only the 8-char database alphabet (no I, O, 0, 1)', () => {
    expect(isValidInviteCode('ABCD2345')).toBe(true);
    expect(isValidInviteCode('abcd-2345')).toBe(true);
    expect(isValidInviteCode('ABCD1234')).toBe(false); // 1 is excluded
    expect(isValidInviteCode('ABCDOOOO')).toBe(false); // O is excluded
    expect(isValidInviteCode('ABC2345')).toBe(false); // too short
  });

  it('formats for reading aloud', () => {
    expect(formatInviteCode('abcd2345')).toBe('ABCD-2345');
  });

  it('builds the join link', () => {
    expect(joinPath('abcd-2345')).toBe('/join/ABCD2345');
    expect(joinUrl('https://cloudpulse-mvp.vercel.app/', 'ABCD2345')).toBe(
      'https://cloudpulse-mvp.vercel.app/join/ABCD2345'
    );
  });
});

describe('safeNextPath (no open redirect after login)', () => {
  it('allows a valid join path', () => {
    expect(safeNextPath('/join/abcd2345')).toBe('/join/ABCD2345');
  });

  it('rejects everything else', () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath('https://evil.example/join/ABCD2345')).toBeNull();
    expect(safeNextPath('//evil.example')).toBeNull();
    expect(safeNextPath('/admin')).toBeNull();
    expect(safeNextPath('/join/ABCD1234')).toBeNull();
    expect(safeNextPath('/join/ABCD2345/../../admin')).toBeNull();
  });
});

describe('join errors and labels', () => {
  it('maps database error messages to codes', () => {
    expect(joinErrorCode('INVALID_CODE')).toBe('INVALID_CODE');
    expect(joinErrorCode('ERROR: NOT_ATHLETE')).toBe('NOT_ATHLETE');
    expect(joinErrorCode('network down')).toBe('UNKNOWN');
    expect(joinErrorCode(undefined)).toBe('UNKNOWN');
  });

  it('cleans athlete labels like the database does', () => {
    expect(cleanAthleteLabel('  Макс   К. ')).toBe('Макс К.');
    expect(cleanAthleteLabel('   ')).toBeNull();
    expect(cleanAthleteLabel('x'.repeat(41))).toBeNull();
  });
});
