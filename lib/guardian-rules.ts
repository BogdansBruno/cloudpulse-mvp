// ---------------------------------------------------------------------------
// Age and guardian confirmation.
//
// Lotus is for athletes aged 13 and over. GDPR Art. 8 lets each EU country
// set the age at which a young person can give consent to an online service
// alone (13 to 16). We use 13 as the lowest age (DIGITAL_CONSENT_AGE) and
// ask the team to check the exact figure for Latvia against the national
// law before the final text goes out.
//
// Anyone under 18 can use Lotus alone, but turning on access for a PARENT or
// the SCHOOL needs a guardian confirmation first. It is a tick-box with a
// time stamp (profiles.guardian_consent_at), not an identity check, and the
// database refuses the switch without it (supabase/sql/17, trigger
// require_guardian_consent). Demo accounts are exempt.
// ---------------------------------------------------------------------------

export const DIGITAL_CONSENT_AGE = 13;
export const ADULT_AGE = 18;

/** Age brackets offered in onboarding; the stored age is the lower bound. */
export const AGE_BRACKETS = ['13-15', '16-17', '18+'] as const;
export type AgeBracket = (typeof AGE_BRACKETS)[number];

export function bracketToAge(b: string): number | undefined {
  const n = parseInt(b, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Bracket for a stored age (the lower bound, or any age inside the bracket). */
export function ageToBracket(age: number | null | undefined): AgeBracket | null {
  if (typeof age !== 'number' || !Number.isFinite(age) || age < DIGITAL_CONSENT_AGE) return null;
  if (age >= ADULT_AGE) return '18+';
  if (age >= 16) return '16-17';
  return '13-15';
}

/** True when sharing with a parent or the school needs a guardian confirmation. */
export function needsGuardianConfirmation(age: number | null | undefined): boolean {
  return typeof age === 'number' && Number.isFinite(age) && age < ADULT_AGE;
}

/** The database error raised when a minor switches sharing on without it. */
export function isGuardianError(err: { message?: string } | null | undefined): boolean {
  return !!err?.message && err.message.includes('guardian_consent_required');
}

export type GuardianStatus = {
  /** Profile age, or null when not set. */
  age: number | null;
  /** When the guardian confirmed, or null. */
  consentAt: string | null;
  /** False when the column does not exist yet (SQL 17 not run): no gate. */
  supported: boolean;
};

/** True when the sharing switches must stay locked for this athlete. */
export function sharingLocked(s: GuardianStatus | null): boolean {
  return !!s && s.supported && needsGuardianConfirmation(s.age) && !s.consentAt;
}
