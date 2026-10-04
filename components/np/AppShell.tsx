'use client';

// components/np/AppShell.tsx — the v3 frame around every page of the (main) area.
//
//   desktop (≥ 768 px)  fixed sidebar: icon rail at 768–1023, labelled from 1024
//   mobile              sticky glass header + full-width glass bottom tab bar (components/m)
//   /workout            no chrome at all (immersive, readable from 2–3 m)
//
// The active item comes from the URL (components/np/nav.ts), the role decides which items exist.
// Pages that are not redrawn yet (coach, parent, admin, onboarding) keep their own content; they
// get the old `.adp-ed` skin tweaks only while they are on screen, so the redrawn pages carry no
// legacy class at all.

import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Barbell,
  CalendarBlank,
  ChartLineUp,
  ChatCircleDots,
  Gauge,
  Heartbeat,
  ShieldCheck,
  SignOut,
  SunHorizon,
  Users,
  type Icon,
} from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGS } from '@/lib/i18n/translations';
import { supabase, signOut } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/access-control';
import { TabBar, type TabItem } from '@/components/m/BottomTabBar';
import { APP } from './appCopy';
import { npInter } from './font';
import { NAV_HREF, activeNavId, isImmersiveRoute, isV3Route, sidebarIds, tabIds, type NavId, type NavRole } from './nav';

const ICON: Record<NavId, Icon> = {
  chat: ChatCircleDots,
  checkin: SunHorizon,
  training: Barbell,
  workout: Heartbeat,
  progress: ChartLineUp,
  calendar: CalendarBlank,
  pro: Gauge,
  coach: Users,
  parent: Users,
  admin: ShieldCheck,
};

export default function AppShell({ children }: { children: ReactNode }): ReactElement {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const copy = APP[lang].shell;
  const [role, setRole] = useState<NavRole>('athlete');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (cancelled) return;
      setIsAdmin(isAdminEmail(user?.email));
      if (!user?.id) return;
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (cancelled) return;
          if (profile?.role === 'coach') setRole('coach');
          else if (profile?.role === 'parent') setRole('parent');
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const label = (id: NavId): string => {
    switch (id) {
      case 'chat':
        return t.nav.chat;
      case 'checkin':
        return t.nav.checkin;
      case 'training':
        return t.nav.training;
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
      case 'workout':
        return copy.workout;
      case 'pro':
        return copy.pro;
    }
  };

  const active = activeNavId(pathname);
  // /workout is a part of Training on the tab bar.
  const tabActive: NavId | null = active === 'workout' ? 'training' : active;
  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  if (isImmersiveRoute(pathname)) {
    return <main id="main" className={`np-app ${npInter.className} min-h-dvh`}>{children}</main>;
  }

  const home = role === 'parent' ? NAV_HREF.parent : NAV_HREF.checkin;
  const side = sidebarIds(role, isAdmin);
  const tabs: TabItem[] = tabIds(role).map((id) => ({
    key: id,
    label: label(id),
    icon: ICON[id],
    href: NAV_HREF[id],
    active: id === tabActive,
  }));

  const langPills = (
    <div role="group" aria-label={copy.language} className="flex items-center gap-0.5 rounded-full border border-np-line bg-np-surface p-0.5 text-xs">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${lang === l.code ? 'bg-np-surface-3 text-np-text' : 'text-np-text-3 hover:text-np-text-2'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );

  const brand = (
    <Link href={home} className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden
        className="np-ai-orb np-logo-pulse relative h-8 w-8 shrink-0"
        style={{ ['--np-glow' as string]: 'rgb(124 77 255 / 0.5)' }}
      />
      <span className="hidden truncate text-[15px] font-bold tracking-tight text-np-text min-[360px]:inline md:inline">{t.nav.brand}</span>
    </Link>
  );

  return (
    <div className={`np-app ${npInter.className} min-h-dvh ${isV3Route(pathname) ? '' : 'adp-ed'}`}>
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col border-r border-np-line bg-np-surface/80 px-3 py-5 backdrop-blur-md md:flex lg:w-60">
        <div className="px-1 pb-6">{brand}</div>
        <nav aria-label={copy.mobileNav} className="flex flex-1 flex-col gap-1">
          {side.map((id) => {
            const I = ICON[id];
            const on = id === active;
            return (
              <Link
                key={id}
                href={NAV_HREF[id]}
                aria-current={on ? 'page' : undefined}
                title={label(id)}
                className={`relative flex h-11 items-center gap-3 rounded-np-ctrl px-3 text-sm font-medium transition-colors ${
                  on ? 'bg-np-surface-2 text-np-text' : 'text-np-text-2 hover:bg-white/5 hover:text-np-text'
                }`}
              >
                <I size={22} weight={on ? 'fill' : 'regular'} aria-hidden />
                <span className="hidden truncate lg:inline">{label(id)}</span>
                <span aria-hidden className="np-nav-dot absolute right-3 h-1.5 w-1.5 rounded-full bg-np-accent max-lg:right-1.5 max-lg:top-1.5" />
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-3 lg:items-stretch">
          <div className="hidden lg:block">{langPills}</div>
          <button
            type="button"
            onClick={handleSignOut}
            title={t.nav.signOut}
            className="flex h-10 items-center gap-3 rounded-np-ctrl px-3 text-sm text-np-text-3 transition-colors hover:bg-white/5 hover:text-np-text-2"
          >
            <SignOut size={20} aria-hidden />
            <span className="hidden lg:inline">{t.nav.signOut}</span>
          </button>
        </div>
      </aside>

      {/* mobile header */}
      <header className="np-glass sticky top-0 z-30 border-b border-np-line pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          {brand}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link href={NAV_HREF.admin} aria-label={t.admin.navLabel} className="flex h-9 w-9 items-center justify-center rounded-full text-np-text-2 hover:text-np-text">
                <ShieldCheck size={20} aria-hidden />
              </Link>
            )}
            {langPills}
            <button type="button" onClick={handleSignOut} aria-label={t.nav.signOut} className="flex h-9 w-9 items-center justify-center rounded-full text-np-text-3 hover:text-np-text-2">
              <SignOut size={20} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <main
        id="main"
        className={`md:pl-[72px] lg:pl-60 ${tabs.length ? 'pb-[calc(env(safe-area-inset-bottom)+72px)] md:pb-0' : ''}`}
      >
        {children}
      </main>

      <TabBar label={copy.mobileNav} items={tabs} hideOnDesktop />
    </div>
  );
}
