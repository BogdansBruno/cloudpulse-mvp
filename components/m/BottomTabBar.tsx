'use client';

// components/m/BottomTabBar.tsx — fixed bottom navigation, 64px + iOS safe
// area. Four tabs with thin outline icons; "QR-допуск" opens the Safety Pass
// sheet instead of navigating. The active tab is white with a 2px top line.

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
        <span aria-hidden className={`absolute inset-x-6 top-0 h-[2px] rounded-[1px] ${on ? 'bg-ds-text' : 'bg-transparent'}`} />
        <I size={24} weight="regular" aria-hidden />
        <span className="text-[11px] font-medium leading-4">{c[id]}</span>
      </>
    );
    const cls = `relative flex h-16 flex-1 flex-col items-center justify-center gap-1 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ds-accent ${
      on ? 'text-ds-text' : 'text-ds-text-3 hover:text-ds-text-2'
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ds-line bg-ds-bg pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-[480px]">{(['today', 'progress', 'training', 'pass'] as const).map(item)}</div>
    </nav>
  );
}
