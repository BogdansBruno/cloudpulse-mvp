'use client';

// components/np/SleepCard.tsx — sleep: the check-in rating (what ADP really
// knows today) plus, when a wearable provides them, the sleep stages as one
// stacked bar (Deep · REM · Light · Awake), consistency and HRV in sleep.
// Without stages the card says so instead of drawing invented phases.

import type { ReactElement } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import { LOCALE, NP, type SleepStageKey } from './copy';
import { Icon } from './icons';
import { DemoTag, Overline } from './ui';

export type SleepStages = Record<SleepStageKey, number>; // minutes

const ORDER: SleepStageKey[] = ['deep', 'rem', 'light', 'awake'];
const COLOR: Record<SleepStageKey, string> = { deep: '#7C4DFF', rem: '#00E5FF', light: '#2979FF', awake: '#3A3F4B' };

export default function SleepCard({
  lang,
  quality,
  stages,
  bedtime,
  consistency,
  sleepHrv,
  demo = false,
}: {
  lang: Lang;
  /** Check-in sleep rating 1..7 (7 = best); null = no check-in. */
  quality: number | null;
  stages?: SleepStages | null;
  /** Lights out → wake up, e.g. { from: '23:10', to: '06:25' }. */
  bedtime?: { from: string; to: string } | null;
  /** 0–100, wearable only. */
  consistency?: number | null;
  /** ms, wearable only. */
  sleepHrv?: number | null;
  /** Stages/extras are demo values (no wearable connected). */
  demo?: boolean;
}): ReactElement {
  const t = NP[lang];
  const nf = new Intl.NumberFormat(LOCALE[lang]);
  const total = stages ? ORDER.reduce((s, k) => s + stages[k], 0) : 0;
  const asleep = stages ? total - stages.awake : 0;
  const pct = (m: number) => (total > 0 ? Math.round((m / total) * 100) : 0);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-np-sleep/12 text-np-sleep" aria-hidden>
            <Icon name="moon" size={16} />
          </span>
          <Overline>{t.sleep.title}</Overline>
        </div>
        {stages && demo && <DemoTag>{t.demoWearable}</DemoTag>}
      </div>

      {stages ? (
        <>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="np-num text-3xl">{t.sleep.hm(asleep)}</span>
            <span className="text-xs text-np-text-3">
              {t.sleep.inBed} {t.sleep.hm(total)}
              {bedtime ? ` · ${bedtime.from} – ${bedtime.to}` : ''}
            </span>
          </p>
          {/* stacked stage bar: 2px surface gaps between segments */}
          <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={ORDER.map((k) => `${t.sleep.stages[k]} ${t.sleep.hm(stages[k])} (${pct(stages[k])} %)`).join(', ')}>
            {ORDER.map((k) => (
              <span key={k} className="h-full first:rounded-l-full last:rounded-r-full" style={{ flex: `${stages[k]} 1 0%`, background: COLOR[k] }} />
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {ORDER.map((k) => (
              <div key={k} className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLOR[k] }} aria-hidden />
                <dt className="min-w-0 truncate text-xs text-np-text-2">{t.sleep.stages[k]}</dt>
                <dd className="ml-auto shrink-0 text-xs font-semibold tabular-nums">
                  {t.sleep.hm(stages[k])} <span className="font-normal text-np-text-3">{pct(stages[k])}%</span>
                </dd>
              </div>
            ))}
          </dl>
          {(consistency != null || sleepHrv != null) && (
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-np-ctrl border border-np-line bg-np-line">
              {consistency != null && (
                <div className="bg-np-surface px-3 py-2.5">
                  <dt className="text-[11px] text-np-text-3">{t.sleep.consistency}</dt>
                  <dd className="np-num mt-1 text-lg">{nf.format(consistency)}%</dd>
                </div>
              )}
              {sleepHrv != null && (
                <div className="bg-np-surface px-3 py-2.5">
                  <dt className="text-[11px] text-np-text-3">{t.sleep.sleepHrv}</dt>
                  <dd className="np-num mt-1 text-lg">
                    {nf.format(sleepHrv)} <span className="text-xs font-medium text-np-text-3">{t.bio.units.hrv}</span>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </>
      ) : (
        <p className="mt-3 text-xs leading-5 text-np-text-3">{t.sleep.noStages}</p>
      )}

      {/* What the engine really uses: the check-in rating */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-np-line pt-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-np-text-2">{t.sleep.quality}</p>
          <p className="text-[11px] text-np-text-3">{t.sleep.qualityHint}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className={`h-1.5 w-3 rounded-full ${quality !== null && i < quality ? 'bg-np-sleep' : 'bg-white/10'}`} />
            ))}
          </span>
          <span className="np-num text-base">{quality !== null ? `${quality}/7` : '—'}</span>
        </div>
      </div>
    </div>
  );
}
