import { describe, it, expect } from 'vitest';
import {
  ageToBracket,
  bracketToAge,
  needsGuardianConfirmation,
  sharingLocked,
  isGuardianError,
} from './guardian-rules';

describe('guardian', () => {
  it('maps brackets to the stored lower bound and back', () => {
    expect(bracketToAge('13-15')).toBe(13);
    expect(bracketToAge('16-17')).toBe(16);
    expect(bracketToAge('18+')).toBe(18);
    expect(ageToBracket(13)).toBe('13-15');
    expect(ageToBracket(15)).toBe('13-15');
    expect(ageToBracket(16)).toBe('16-17');
    expect(ageToBracket(17)).toBe('16-17');
    expect(ageToBracket(18)).toBe('18+');
    expect(ageToBracket(12)).toBe(null);
    expect(ageToBracket(null)).toBe(null);
  });

  it('asks for a guardian only under 18 and only when the age is known', () => {
    expect(needsGuardianConfirmation(13)).toBe(true);
    expect(needsGuardianConfirmation(17)).toBe(true);
    expect(needsGuardianConfirmation(18)).toBe(false);
    expect(needsGuardianConfirmation(null)).toBe(false);
  });

  it('locks sharing only for a minor without confirmation on a database that supports it', () => {
    expect(sharingLocked({ age: 16, consentAt: null, supported: true })).toBe(true);
    expect(sharingLocked({ age: 16, consentAt: '2026-10-12T10:00:00Z', supported: true })).toBe(false);
    expect(sharingLocked({ age: 18, consentAt: null, supported: true })).toBe(false);
    expect(sharingLocked({ age: 16, consentAt: null, supported: false })).toBe(false);
    expect(sharingLocked(null)).toBe(false);
  });

  it('recognises the database refusal', () => {
    expect(isGuardianError({ message: 'guardian_consent_required' })).toBe(true);
    expect(isGuardianError({ message: 'other' })).toBe(false);
    expect(isGuardianError(null)).toBe(false);
  });
});
