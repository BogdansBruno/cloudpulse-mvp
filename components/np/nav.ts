// components/np/nav.ts — one navigation model for the whole (main) area.
// The sidebar (desktop) and the bottom tab bar (mobile) both read it, and the
// active item is derived from the URL, so it can never disagree with the page.

export type NavId = 'today' | 'vitals' | 'chat' | 'checkin' | 'training' | 'workout' | 'health' | 'progress' | 'calendar' | 'pro' | 'coach' | 'parent' | 'school' | 'admin' | 'settings';

export type NavRole = 'athlete' | 'coach' | 'parent' | 'school';

export const NAV_HREF: Record<NavId, string> = {
  today: '/today',
  vitals: '/vitals',
  chat: '/chat',
  checkin: '/checkin',
  training: '/training',
  workout: '/workout',
  health: '/my-health',
  progress: '/progress',
  calendar: '/calendar',
  pro: '/pro',
  coach: '/coach',
  parent: '/parent',
  school: '/school',
  admin: '/admin',
  settings: '/settings',
};

/** The /workout page exists (stage 3), so its sidebar entry is shown. Set to false to hide it again. */
export const WORKOUT_READY = true;

/** Sidebar items in order (desktop rail, and the ☰ menu on phones). A parent only has the parent view,
 *  an admin gets /admin on top of the role's set. The check-in is the "+" action, not a list item. */
export function sidebarIds(role: NavRole, isAdmin: boolean): NavId[] {
  const base: NavId[] =
    role === 'parent'
      ? ['parent']
      : role === 'school'
        ? ['school']
        : ['today', 'vitals', 'health', 'chat', 'calendar', 'training', 'workout', 'progress', 'pro', ...(role === 'coach' ? (['coach'] as NavId[]) : [])];
  const shown = WORKOUT_READY ? base : base.filter((id) => id !== 'workout');
  return isAdmin ? [...shown, 'admin'] : shown;
}

/** Bottom dock (Lotus mobile): four tabs — Today · Vitals · Coach (AI chat) · Calendar — next to the round
 *  "+" (new check-in). Everything else — My Health, progress, training plan, live workout, Pro,
 *  settings — lives in the ☰ menu. A coach swaps Vitals for the team view. */
export function tabIds(role: NavRole): NavId[] {
  if (role === 'parent' || role === 'school') return [];
  if (role === 'coach') return ['today', 'coach', 'chat', 'calendar'];
  return ['today', 'vitals', 'chat', 'calendar'];
}

/** Items of the ☰ menu on phones: the sidebar minus what the tab bar already shows. */
export function menuIds(role: NavRole, isAdmin: boolean, isPro = true): NavId[] {
  const tabs = new Set(tabIds(role));
  // Athlete mode (the simple view) hides the Pro dashboard; a coach keeps the team view whatever the mode.
  return sidebarIds(role, isAdmin).filter((id) => !tabs.has(id) && (isPro || id !== 'pro'));
}

/** Which item is active for this URL. /workout belongs to Training on the tab bar. */
export function activeNavId(pathname: string | null): NavId | null {
  if (!pathname) return null;
  const hit = (Object.keys(NAV_HREF) as NavId[]).find((id) => pathname === NAV_HREF[id] || pathname.startsWith(`${NAV_HREF[id]}/`));
  return hit ?? null;
}

/** Pages that are fully drawn in the v3 look. Other pages keep their content but sit inside the v3 shell. */
export const V3_ROUTES: readonly string[] = ['/today', '/vitals', '/chat', '/checkin', '/my-health', '/progress', '/training', '/calendar', '/workout', '/pro', '/settings', '/school'];

export function isV3Route(pathname: string | null): boolean {
  return Boolean(pathname && V3_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`)));
}

/** The live workout hides the app chrome: big digits, nothing else (viewed from 2–3 m). */
export function isImmersiveRoute(pathname: string | null): boolean {
  return Boolean(pathname && (pathname === '/workout' || pathname.startsWith('/workout/')));
}
