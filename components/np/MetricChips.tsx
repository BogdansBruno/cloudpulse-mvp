'use client';

// components/np/MetricChips.tsx — the row of round translucent chips above the Today hero:
// Readiness · Sleep · Load · Wellness, each a small icon, today's number and its name underneath.
// All four are real numbers from the check-in and the engine; no check-in today → "—".
// (Lotus has no step counter and does not collect cycle data, so those two chips of other apps are not here.)

import Link from 'next/link';
import type { ReactElement } from 'react';
import { Icon, type IconName } from './icons';
import { CARD_THEME, type CardTheme } from './cardTheme';

export type Chip = { key: string; label: string; value: number | null; unit?: string; icon: IconName; theme: CardTheme };

export default function MetricChips({ chips, label, href }: { chips: Chip[]; label: string; href: string }): ReactElement {
  return (
    <ul aria-label={label} className="np-enter mb-4 flex items-start justify-between gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((c) => {
        const accent = CARD_THEME[c.theme].accent;
        return (
          <li key={c.key} className="shrink-0">
            <Link href={href} className="flex w-[72px] flex-col items-center gap-2" aria-label={`${c.label}: ${c.value ?? '—'}`}>
              <span
                className="flex h-[64px] w-[64px] flex-col items-center justify-center rounded-full border bg-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-xl"
                style={{ borderColor: `${accent}4d` }}
              >
                <span style={{ color: accent }}>
                  <Icon name={c.icon} size={14} />
                </span>
                <span className="mt-0.5 text-[19px] font-light leading-none tracking-tight text-white">
                  {c.value ?? '—'}
                  {c.value !== null && c.unit && <span className="text-[10px] text-white/75">{c.unit}</span>}
                </span>
              </span>
              <span className="max-w-full truncate text-[11px] font-medium text-white/75">{c.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
