'use client';

// components/np/MetricCard.tsx — a tinted widget card (see cardTheme.ts) with the standard header:
// a round glass icon, the category in small tracked capitals, and the status word in the card accent.
// Body: `children` — usually a big light number, a serif descriptor and a RangeSlider.

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { CARD_THEME, cardClass, type CardTheme } from './cardTheme';
import { chipStyle } from './status';

export function MetricHeader({ theme, icon, label, status, statusColor, right, info }: { theme: CardTheme; icon: IconName; label: string; status?: string; statusColor?: string; right?: ReactNode; info?: ReactNode }): ReactElement {
  const accent = CARD_THEME[theme].accent;
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06]" style={{ color: accent }}>
        <Icon name={icon} size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase leading-4 tracking-widest text-white/75">{label}</p>
        {status && (
          <p className="mt-1.5">
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase leading-4 tracking-widest" style={chipStyle(statusColor ?? accent)}>
              {status}
            </span>
          </p>
        )}
      </div>
      {right}
      {info}
    </div>
  );
}

export default function MetricCard({
  theme,
  icon,
  label,
  status,
  statusColor,
  right,
  info,
  className = '',
  style,
  children,
}: {
  theme: CardTheme;
  icon: IconName;
  label: string;
  status?: string;
  statusColor?: string;
  right?: ReactNode;
  /** the (i) button that opens the meaning sheet (components/np/InfoSheet.tsx) */
  info?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}): ReactElement {
  return (
    <section className={`np-enter p-5 sm:p-6 ${cardClass(theme)} ${className}`} style={style}>
      <MetricHeader theme={theme} icon={icon} label={label} status={status} statusColor={statusColor} right={right} info={info} />
      <div className="mt-4">{children}</div>
    </section>
  );
}
