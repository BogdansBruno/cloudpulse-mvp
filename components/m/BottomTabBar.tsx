'use client';

// components/m/BottomTabBar.tsx — full-width glass tab bar pinned to the bottom (v3),
// 64px + iOS safe area. Outline icons (24px); the active tab is white with a neon lime
// dot under the label.
//
//   <TabBar>          generic bar: items = { label, icon, href | onClick, active }.
//                     The app shell (components/np/AppShell.tsx) feeds it from the URL.
//   BottomTabBar      default export, kept for the mobile demo (/demo/mobile): the
//                     four demo tabs where "QR-допуск" opens the Safety Pass sheet.

import Link from 'next/link';
import type { ReactElement } from 'react';
import { Barbell, ChartLineUp, QrCode, SunHorizon, type Icon } from '@phosphor-icons/react';
import type { Lang } from '@/lib/i18n/translations';
import { M } from './copy';

export type TabItem = {
  key: string;
  label: string;
  icon: Icon;
  href?: string;
  onClick?: () => void;
  active: boolean;
};

export function TabBar({ label, items, hideOnDesktop = false }: { label: string; items: TabItem[]; hideOnDesktop?: boolean }): ReactElement | null {
  if (items.length === 0) return null;
  const render = (it: TabItem) => {
    const I = it.icon;
    const body = (
      <>
        <I size={24} weight={it.active ? 'fill' : 'regular'} aria-hidden />
        <span className="max-w-full truncate text-[10px] font-medium leading-none tracking-tight">{it.label}</span>
        <span aria-hidden className="np-nav-dot absolute bottom-1 h-1 w-1 rounded-full bg-np-accent" />
      </>
    );
    const cls = `relative flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-np-ctrl transition-colors duration-150 ${
      it.active ? 'text-np-text' : 'text-np-text-3 hover:text-np-text-2'
    }`;
    return it.href ? (
      <Link key={it.key} href={it.href} className={cls} aria-current={it.active ? 'page' : undefined}>
        {body}
      </Link>
    ) : (
      <button key={it.key} type="button" onClick={it.onClick} className={cls} aria-haspopup="dialog">
        {body}
      </button>
    );
  };

  return (
    <nav
      aria-label={label}
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-np-line bg-np-surface/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-md ${hideOnDesktop ? 'md:hidden' : ''}`}
    >
      <div className="mx-auto flex max-w-[480px] px-2 sm:max-w-2xl">{items.map(render)}</div>
    </nav>
  );
}

export type TabId = 'today' | 'progress' | 'training' | 'pass';

const HREF: Record<Exclude<TabId, 'pass'>, string> = { today: '/checkin', progress: '/progress', training: '/training' };
const ICON: Record<TabId, Icon> = { today: SunHorizon, progress: ChartLineUp, training: Barbell, pass: QrCode };

export default function BottomTabBar({ lang, active, onPass }: { lang: Lang; active: TabId; onPass: () => void }): ReactElement | null {
  const c = M[lang].tabs;
  const items: TabItem[] = (['today', 'progress', 'training', 'pass'] as const).map((id) => ({
    key: id,
    label: c[id],
    icon: ICON[id],
    href: id === 'pass' ? undefined : HREF[id],
    onClick: id === 'pass' ? onPass : undefined,
    active: id === active,
  }));
  return <TabBar label={c.today} items={items} />;
}
