import { describe, it, expect } from 'vitest';
import { DEMO_ACCOUNTS, DEMO_ROLES, isDemoRole } from './demo';

describe('demo accounts', () => {
  it('accepts only the three demo roles', () => {
    expect(isDemoRole('athlete')).toBe(true);
    expect(isDemoRole('coach')).toBe(true);
    expect(isDemoRole('parent')).toBe(true);
    expect(isDemoRole('admin')).toBe(false);
    expect(isDemoRole(undefined)).toBe(false);
  });

  it('every demo account is a made-up @cloudpulse.test address (never a real person)', () => {
    for (const role of DEMO_ROLES) {
      expect(DEMO_ACCOUNTS[role].email.endsWith('@cloudpulse.test')).toBe(true);
    }
  });
});
