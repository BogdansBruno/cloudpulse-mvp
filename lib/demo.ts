// lib/demo.ts
//
// The public demo for the jury (/demo). Three made-up accounts, one per role,
// all on @cloudpulse.test so the database marks them is_demo (09_demo_sandbox.sql).
// Their data is re-created every day and on "Reset demo"; real testers never
// see them and can't be reached from them.

export type DemoRole = 'athlete' | 'coach' | 'parent';

export const DEMO_ROLES: DemoRole[] = ['athlete', 'coach', 'parent'];

export const DEMO_ACCOUNTS: Record<DemoRole, { email: string; home: string }> = {
  // "Hidden injury": knee pain + match tomorrow — the Safety Guard story.
  athlete: { email: 'demo.injury@cloudpulse.test', home: '/checkin' },
  coach: { email: 'demo.coach@cloudpulse.test', home: '/coach' },
  parent: { email: 'demo.parent@cloudpulse.test', home: '/parent' },
};

export function isDemoRole(value: unknown): value is DemoRole {
  return typeof value === 'string' && (DEMO_ROLES as string[]).includes(value);
}
