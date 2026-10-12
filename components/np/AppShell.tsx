'use client';

// components/np/AppShell.tsx — the frame around every page of the (main) area ("Lotus", step 1).
//
//   header   ☰ menu (left) · screen title (centre; "Lotus" on Today) · share + settings (right).
//            No brand bar, no RU/LV/EN, no sign-out, no banners: something that needs a look is a
//            small dot on the gear; language and sign-out live in /settings.
//   dock     a floating dark-glass capsule with four tabs (Today · Vitals · Coach · Calendar) and a round "+"
//            for a new check-in next to it. Same on phones and laptops — no desktop sidebar; the dock
//            stays centred.
//   ☰ menu   a left sheet with the rest: My Health, progress, training plan, live workout, Pro,
//            coach / admin, settings.
//   /workout no chrome at all (immersive, readable from 2–3 m).
//
// The active item comes from the URL (components/np/nav.ts), the role decides which items exist.
// Pages that are not redrawn yet (coach, parent, admin, onboarding) keep their own content and get
// the old `.adp-ed` skin tweaks only while they are on screen.

import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { TABBAR_SPACE, TabBar, type TabItem } from '@/components/m/BottomTabBar';
import { APP } from './appCopy';
import { HOME } from './homeCopy';
import { Icon, type IconName } from './icons';
import { npFont, npSerif } from './font';
import { useAccount, useOnline } from './useAccount';
import { useMode } from './useMode';
import { useNotices } from './notices';
import { SCHOOL } from '@/lib/school-copy';
import { NAV_HREF, activeNavId, isImmersiveRoute, isV3Route, menuIds, tabIds, type NavId } from './nav';

/** App name shown in the shell. */
const BRAND = 'Lotus';

const ICON: Record<NavId, IconName> = {
  today: 'sun',
  vitals: 'sprout',
  chat: 'sparkle',
  checkin: 'sunrise',
  training: 'dumbbell',
  workout: 'heartbeat',
  health: 'lotus',
  progress: 'tree',
  calendar: 'calendar',
  pro: 'gauge',
  coach: 'users',
  parent: 'users',
  school: 'shield',
  admin: 'shield',
  settings: 'gear',
};

/** The ☰ sheet: a left drawer of dark glass. Esc / backdrop / a link closes it; focus moves into the panel. */
function MenuSheet({
  open,
  onClose,
  title,
  closeLabel,
  ids,
  label,
  active,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  ids: NavId[];
  label: (id: NavId) => string;
  active: NavId | null;
  footer: ReactNode;
}): ReactElement | null {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <button type="button" aria-label={closeLabel} tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="np-enter absolute inset-y-0 left-0 flex h-dvh w-[min(320px,calc(100vw-56px))] flex-col rounded-none border-y-0 border-l-0 border-r border-white/10 bg-[#12151B]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-[calc(env(safe-area-inset-top)+20px)] shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.06),24px_0_60px_rgb(0_0_0/0.55)] outline-none backdrop-blur-2xl"
      >
        <div className="flex items-center justify-between px-2 pb-6">
          <span className="text-lg font-light tracking-widest text-white/90">{BRAND}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <nav aria-label={title} className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {ids.map((id) => {
            const on = id === active;
            return (
              <Link
                key={id}
                href={NAV_HREF[id]}
                onClick={onClose}
                aria-current={on ? 'page' : undefined}
                className={`flex h-12 items-center gap-3.5 rounded-full px-4 text-[15px] transition-colors ${
                  on ? 'border border-white/12 bg-white/10 text-white' : 'border border-transparent text-white/75 hover:bg-white/6 hover:text-white'
                }`}
              >
                <Icon name={ICON[id]} size={20} active={on} className="shrink-0" />
                <span className="min-w-0 truncate">{label(id)}</span>
                <Icon name="chevR" size={16} className="ml-auto shrink-0 opacity-40" />
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 pt-3">{footer}</div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }): ReactElement {
  const pathname = usePathname();
  const { lang, t } = useLanguage();
  const copy = APP[lang].shell;
  const hc = HOME[lang];
  const { role, isAdmin } = useAccount();
  const { isPro } = useMode(role);
  const online = useOnline();
  const notices = useNotices();
  const alert = notices.passCheck ? t.shield.loadError : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // a route change always closes the sheet
  useEffect(() => setMenuOpen(false), [pathname]);

  // Share the app itself (its address) — never personal data. Web Share where the device has it,
  // otherwise the link goes to the clipboard with a short confirmation.
  const share = async () => {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: BRAND, text: hc.nav.shareText, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast(hc.nav.shared);
      window.setTimeout(() => setToast(null), 2200);
    } catch {
      // cancelled by the user or blocked: nothing to do
    }
  };

  const label = (id: NavId): string => {
    switch (id) {
      case 'today':
        return hc.nav.today;
      case 'vitals':
        return hc.nav.vitals;
      case 'chat':
        return hc.nav.coach;
      case 'checkin':
        return t.nav.checkin;
      case 'training':
        return t.nav.training;
      case 'health':
        return hc.nav.health;
      case 'progress':
        return t.nav.progress;
      case 'calendar':
        return t.nav.calendar;
      case 'coach':
        return t.coach.navLabel;
      case 'parent':
        return t.parent.navLabel;
      case 'admin':
        return t.admin.navLabel;
      case 'school':
        return SCHOOL[lang].nav;
      case 'workout':
        return copy.workout;
      case 'pro':
        return copy.pro;
      case 'settings':
        return copy.settings;
    }
  };

  const active = activeNavId(pathname);
  const fonts = `${npFont.variable} ${npSerif.variable} ${npFont.className}`;

  if (isImmersiveRoute(pathname)) {
    return <main id="main" className={`np-app ${fonts} min-h-dvh`}>{children}</main>;
  }

  const home = role === 'parent' ? NAV_HREF.parent : role === 'school' ? NAV_HREF.school : NAV_HREF.today;
  // A coach has both the team view and the AI coach on the dock: the team tab says "Team" so two tabs never read "Coach".
  const tabLabel = (id: NavId): string =>
    id === 'chat' ? hc.nav.tab.coach : id === 'calendar' ? hc.nav.tab.calendar : id === 'coach' ? hc.nav.tab.team : label(id);
  const tabs: TabItem[] = tabIds(role).map((id) => ({
    key: id,
    label: tabLabel(id),
    icon: ICON[id],
    href: NAV_HREF[id],
    active: id === active,
  }));
  const canCheckin = role !== 'parent' && role !== 'school';
  // Header title: "Lotus" on Today (and on pages outside the nav), otherwise the screen name.
  const title = active && active !== 'today' ? label(active) : null;

  return (
    <div className={`np-app ${fonts} min-h-dvh ${isV3Route(pathname) ? '' : 'adp-ed'}`}>
      <header className="relative z-20 mx-auto grid max-w-6xl grid-cols-[76px_1fr_76px] items-center gap-2 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+20px)] md:px-8 md:pt-6">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label={hc.nav.menu}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Icon name="menu" size={22} stroke={1.5} />
        </button>
        <p className="truncate text-center">
          {title ? (
            <span className="text-lg font-light tracking-wide text-white/90">{title}</span>
          ) : (
            <Link href={home} className="text-lg font-light tracking-widest text-white/90">
              {BRAND}
            </Link>
          )}
        </p>
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={share}
            aria-label={hc.nav.share}
            className="flex h-11 w-9 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="share" size={21} stroke={1.5} />
          </button>
          <Link
            href={NAV_HREF.settings}
            aria-label={alert ? `${copy.settings}: ${alert}` : copy.settings}
            aria-current={active === 'settings' ? 'page' : undefined}
            title={alert ?? undefined}
            className="relative flex h-11 w-9 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="gear" size={22} stroke={1.5} active={active === 'settings'} />
            {alert && <span aria-hidden className="absolute right-1 top-2 h-2 w-2 rounded-full bg-np-st-attention shadow-[0_0_8px_var(--color-np-st-attention)]" />}
          </Link>
        </div>
      </header>

      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={hc.nav.menu}
        closeLabel={hc.nav.menuClose}
        ids={[...menuIds(role, isAdmin, isPro), 'settings']}
        label={label}
        active={active}
        footer={
          <p className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/75">
            {copy.role[role]} • {online ? copy.online : copy.offline}
          </p>
        }
      />

      <main id="main" className={`min-h-dvh ${tabs.length ? TABBAR_SPACE : ''}`}>
        {children}
      </main>

      {toast && (
        <p role="status" className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+76px)] z-[70] mx-auto w-max rounded-full border border-white/10 bg-black/60 px-4 py-2 text-xs font-medium text-white backdrop-blur-2xl">
          {toast}
        </p>
      )}

      <TabBar
        label={copy.mobileNav}
        items={tabs}
        action={canCheckin ? { label: hc.nav.plus, icon: 'plus', href: NAV_HREF.checkin, active: active === 'checkin' } : undefined}
      />
    </div>
  );
}
