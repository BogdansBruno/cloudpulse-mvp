'use client';

// components/m/BottomTabBar.tsx — full-width glass tab bar pinned to the bottom (v3), 64px + iOS
// safe area. Four tabs with outline icons (24px); the active tab is white with a
// neon lime dot under the label. "QR-допуск" opens the Safety Pass sheet
// instead of navigating.

import Link from 'next/link';
import type { ReactElement } from 'react';
import { Barbell, ChartLineUp, QrCode, SunHorizon, type Icon } from '@phosphor-icons/react';
import type { Lang } from '@/lib/i18n/translations';
import { M } from './copy';

export type TabId = 'today' | 'progress' | 'training' | 'pass';

const HREF: Record<Exclude<TabId, 'pass'>, string> = { today: '/checkin', progress: '/progress', training: '/training' };
const ICON: Record<TabId, Icon> = { today: SunHorizon, progress: ChartLineUp, training: Barbell, pass: QrCode };

export default function BottomTabBar({ lang, active, onPass }: { lang: Lang; active: TabId; onPass: () => void }): ReactElement {
  const c = M[lang].tabs;
  const item = (id: TabId) => {
    const on = id === active;
    const I = ICON[id];
    const body = (
      <>
        <I size={24} weight={on ? 'fill' : 'regular'} aria-hidden />
        <span className="text-[10px] font-medium leading-none">{c[id]}</span>
        <span aria-hidden className="np-nav-dot absolute bottom-1 h-1 w-1 rounded-full bg-np-accent" />
      </>
    );
    const cls = `relative flex h-16 flex-1 flex-col items-center justify-center gap-1.5 rounded-np-ctrl transition-colors duration-150 ${
      on ? 'text-np-text' : 'text-np-text-3 hover:text-np-text-2'
    }`;
    return id === 'pass' ? (
      <button key={id} type="button" onClick={onPass} className={cls} aria-haspopup="dialog">
        {body}
      </button>
    ) : (
      <Link key={id} href={HREF[id]} className={cls} aria-current={on ? 'page' : undefined}>
        {body}
      </Link>
    );
  };

  return (
    <nav
      aria-label={c.today}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-np-line bg-np-surface/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-[480px] px-2 sm:max-w-2xl">{(['today', 'progress', 'training', 'pass'] as const).map(item)}</div>
    </nav>
  );
}
