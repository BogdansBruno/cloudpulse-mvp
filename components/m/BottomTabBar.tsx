'use client';

// components/m/BottomTabBar.tsx — the floating dock (Oura-style): a compact dark-glass capsule
// (`bg-[#12151B]/90 backdrop-blur-2xl border-white/[0.08] rounded-full` + 1 px top highlight, `px-5 py-2.5`, `justify-between`) with the
// tabs — icon over a tiny label (`text-[10px] tracking-tight text-white/75`) — and, next to it, one round
// "+" (a new check-in). Both are centred with generous side margins, low on the screen (16 px, or the
// iOS home-bar inset when larger); content scrolls underneath. Same dock on phones and laptops. The active tab is sky blue (#B8F23C) with an icon glow on a faint glass pill.
//
//   <TabBar>          generic dock: items = { label, icon, href | onClick, active } + optional `action`.
//                     The app shell (components/np/AppShell.tsx) feeds it from the URL.
//   BottomTabBar      default export, kept for the mobile demo (/demo/mobile): the
//                     four demo tabs where "QR-допуск" opens the Safety Pass sheet.
//
// Pages leave room for it with TABBAR_SPACE (bottom padding) — the dock floats over content.

import Link from 'next/link';
import type { ReactElement } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import { Icon, type IconName } from '@/components/np/icons';
import { M } from './copy';

/** Bottom padding a page needs so its last line is not hidden under the floating bar. */
// pb-36 (144 px) clears the 64 px dock + its 16 px offset; scroll-pb-36 keeps anchors / focused fields clear of it too.
export const TABBAR_SPACE = 'pb-[calc(env(safe-area-inset-bottom)+9rem)] scroll-pb-36';

export type TabItem = {
  key: string;
  label: string;
  icon: IconName;
  href?: string;
  onClick?: () => void;
  active: boolean;
};

export function TabBar({
  label,
  items,
  action,
}: {
  label: string;
  items: TabItem[];
  /** The round button next to the capsule (e.g. "+" = new check-in). */
  action?: { label: string; icon: IconName; href: string; active: boolean };
}): ReactElement | null {
  if (items.length === 0) return null;
  const render = (it: TabItem) => {
    const body = (
      <>
        <Icon name={it.icon} size={21} active={it.active} className="shrink-0" />
        <span className="whitespace-nowrap text-[10px] font-medium leading-none tracking-tight">{it.label}</span>
      </>
    );
    // Active: one soft filled pill (no outline) that wraps icon and label with room to spare.
    const cls = `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 transition-[background-color,color] duration-300 ease-out max-[359px]:px-1 ${
      it.active ? 'bg-[#B8F23C]/[0.12] text-[#B8F23C] [&_svg]:drop-shadow-[0_0_6px_rgb(184_242_60/0.7)]' : 'text-white/75 hover:bg-white/[0.06] hover:text-white/90'
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
      data-kb-hide
      className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex items-center justify-center gap-3 px-4 max-[359px]:gap-2 max-[359px]:px-3"
    >
      <div className="flex w-full max-w-[320px] min-w-0 items-center justify-between gap-0.5 rounded-full border border-white/[0.08] bg-[#12151B]/90 px-1.5 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_16px_40px_-12px_rgb(0_0_0/0.6)] backdrop-blur-2xl max-[359px]:px-1">
        {items.map(render)}
      </div>
      {action && (
        <Link
          href={action.href}
          aria-label={action.label}
          title={action.label}
          aria-current={action.active ? 'page' : undefined}
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-white backdrop-blur-2xl transition-[background-color,box-shadow] duration-300 ${
            action.active ? 'bg-[#B8F23C]/20 text-[#B8F23C] shadow-[0_0_22px_-2px_rgb(184_242_60/0.45)]' : 'bg-[#12151B]/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_16px_40px_-12px_rgb(0_0_0/0.6)] hover:bg-white/[0.08]'
          }`}
        >
          <Icon name={action.icon} size={24} stroke={1.75} />
        </Link>
      )}
    </nav>
  );
}

export type TabId = 'today' | 'progress' | 'training' | 'pass';

const HREF: Record<Exclude<TabId, 'pass'>, string> = { today: '/checkin', progress: '/progress', training: '/training' };
const ICON: Record<TabId, IconName> = { today: 'sunrise', progress: 'trend', training: 'dumbbell', pass: 'qr' };

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
