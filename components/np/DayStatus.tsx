'use client';

// components/np/DayStatus.tsx — two small honest status elements at the top of Today / Vitals.
//
//   DeviceStatus       a sleek pill. Lotus has no wearable source yet, so a "synced · battery" pill exists ONLY for the jury
//                      demo accounts and says "Demo". Everyone else sees something real: when they last checked in.
//   CalibrationBanner  "Calibrating baseline · day 4 of 14": shown while the athlete has fewer than 14 check-in days.
//                      The day number is the count of their real check-in days; nothing is simulated.

import type { ReactElement } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';
import { Icon } from './icons';
import { InfoButton } from './InfoSheet';
import { UX } from './uxCopy';

const CALIB_DAYS = 14;

/** demo values for the demo pill (jury accounts only) */
const DEMO_SYNC = { min: 4, pct: 82 };

export function DeviceStatus({ lang, demo, history, today }: { lang: Lang; demo: boolean; history: ReadinessHistoryPoint[] | null; today: string }): ReactElement | null {
  const u = UX[lang].device;
  let text: string | null = null;
  if (demo) text = u.demo(DEMO_SYNC.min, DEMO_SYNC.pct);
  else if (history) {
    const last = [...history].reverse().find((p) => p.hasCheckin);
    if (!last) text = u.check.none;
    else {
      const days = Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${last.date}T12:00:00`).getTime()) / 86_400_000);
      text = days <= 0 ? u.check.today : days === 1 ? u.check.yesterday : u.check.ago(days);
    }
  }
  if (!text) return null;
  return (
    <div className="mb-3 flex justify-center">
      <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.05] px-3.5 py-1.5 text-[12px] font-medium text-white/80 backdrop-blur">
        <Icon name={demo ? 'watch' : 'check'} size={14} className="shrink-0 text-[#3FE0A8]" />
        <span className="truncate">{text}</span>
      </span>
    </div>
  );
}

export function CalibrationBanner({ lang, history }: { lang: Lang; history: ReadinessHistoryPoint[] | null }): ReactElement | null {
  if (!history) return null;
  const n = history.filter((p) => p.hasCheckin).length;
  if (n >= CALIB_DAYS) return null;
  const day = Math.max(1, n);
  const u = UX[lang].calib;
  return (
    <section className="np-enter mb-3 rounded-2xl border border-[#FF7A59]/25 bg-[#FF7A59]/[0.08] px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase leading-5 tracking-widest text-[#FFA58C]">{u.title(day, CALIB_DAYS)}</p>
        <InfoButton k="calib" accent="#FFA58C" baseline={{ now: `${n} / ${CALIB_DAYS}` }} />
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={CALIB_DAYS} aria-valuenow={n}>
        <span className="block h-full rounded-full bg-[#FF7A59]" style={{ width: `${Math.min(100, (n / CALIB_DAYS) * 100)}%` }} />
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-white/60">{u.sub}</p>
    </section>
  );
}
