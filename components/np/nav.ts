// components/np/nav.ts — one navigation model for the whole (main) area.
// The sidebar (desktop) and the bottom tab bar (mobile) both read it, and the
// active item is derived from the URL, so it can never disagree with the page.

export type NavId = 'chat' | 'checkin' | 'training' | 'workout' | 'progress' | 'calendar' | 'pro' | 'coach' | 'parent' | 'admin';

export type NavRole = 'athlete' | 'coach' | 'parent';

export const NAV_HREF: Record<NavId, string> = {
  chat: '/chat',
  checkin: '/checkin',
  training: '/training',
  workout: '/workout',
  progress: '/progress',
  calendar: '/calendar',
  pro: '/pro',
  coach: '/coach',
  parent: '/parent',
  admin: '/admin',
};

/** The /workout page ships in stage 3; until then its sidebar entry stays hidden (no dead link). Set to true then. */
export const WORKOUT_READY = false;

/** Sidebar items in order; a parent only has the parent view, an admin gets /admin on top of the role's set. */
export function sidebarIds(role: NavRole, isAdmin: boolean): NavId[] {
  const base: NavId[] =
    role === 'parent'
      ? ['parent']
      : ['checkin', 'chat', 'training', 'workout', 'progress', 'calendar', 'pro', ...(role === 'coach' ? (['coach'] as NavId[]) : [])];
  const shown = WORKOUT_READY ? base : base.filter((id) => id !== 'workout');
  return isAdmin ? [...shown, 'admin'] : shown;
}

/** Bottom tab bar items: five at most (a phone is 320 px wide); /pro is a desktop view, /workout is reached from Training. */
export function tabIds(role: NavRole): NavId[] {
  if (role === 'parent') return [];
  if (role === 'coach') return ['checkin', 'chat', 'progress', 'calendar', 'coach'];
  return ['checkin', 'chat', 'training', 'progress', 'calendar'];
}

/** Which item is active for this URL. /workout belongs to Training on the tab bar. */
export function activeNavId(pathname: string | null): NavId | null {
  if (!pathname) return null;
  const hit = (Object.keys(NAV_HREF) as NavId[]).find((id) => pathname === NAV_HREF[id] || pathname.startsWith(`${NAV_HREF[id]}/`));
  return hit ?? null;
}

/** Pages that are fully drawn in the v3 look. Other pages keep their content but sit inside the v3 shell. */
export const V3_ROUTES: readonly string[] = ['/chat', '/checkin', '/progress', '/calendar', '/workout', '/pro'];

export function isV3Route(pathname: string | null): boolean {
  return Boolean(pathname && V3_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`)));
}

/** The live workout hides the app chrome: big digits, nothing else (viewed from 2–3 m). */
export function isImmersiveRoute(pathname: string | null): boolean {
  return Boolean(pathname && (pathname === '/workout' || pathname.startsWith('/workout/')));
}
