'use client';

// components/np/SleepStagesCard.tsx — "Sleep Quality & Stages" on Today.
//
// Sleep stages need a wearable, which Lotus does not have yet. So:
//   real athletes   a moon icon and a dark badge with their own check-in sleep rating (1–7) and its
//                   status, and a line that stages appear once a wearable is connected — no stage numbers
//   demo accounts   labelled demo stages (components/np/demo.ts: DEMO_SLEEP), "Demo · needs a wearable"
//
// Everything on the demo card is computed from the four stage durations, never typed in:
//   asleep = deep + REM + light · in bed = asleep + awake · efficiency = asleep / in bed
//   bar and legend = share of time in bed · restfulness = awake share (< 12 % optimal, < 18 % good,
//   < 25 % fair, otherwise pay attention) · badge = asleep time (≥ 8 h optimal, ≥ 7 h good, ≥ 6 h fair)

import { useState, type ReactElement } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import { HOME } from './homeCopy';
import { CARDS } from './cardCopy';
import { CARD_THEME, cardClass } from './cardTheme';
import { MetricHeader } from './MetricCard';
import RangeSlider from './RangeSlider';
import { ChartPin } from './ChartPin';
import { InfoButton } from './InfoSheet';
import { useScrub } from './useScrub';
import Hypnogram from './Hypnogram';
import { DEMO_HYPNO } from './demo';
import { DotTrend } from './CheckinPowered';
import { Icon } from './icons';
import { UX } from './uxCopy';
import { STATUS_HEX, sleepStatus, type Status } from './status';

const ACCENT = CARD_THEME.sleep.accent;
/** status word colour: the sleep accent for the good states, the status colour otherwise */
const tone = (s: Status): string => (s === 'optimal' || s === 'good' ? ACCENT : STATUS_HEX[s]);

export type SleepStageMinutes = { deep: number; rem: number; light: number; awake: number };

const STAGES = [
  { k: 'deep', color: '#4A4FB3' },
  { k: 'rem', color: '#32ADE6' },
  { k: 'light', color: '#34C759' },
  { k: 'awake', color: '#8E8E93' },
] as const;

function durationStatus(asleepMin: number): Status {
  return asleepMin >= 480 ? 'optimal' : asleepMin >= 420 ? 'good' : asleepMin >= 360 ? 'fair' : 'attention';
}

function restfulnessStatus(awakeShare: number): Status {
  return awakeShare < 0.12 ? 'optimal' : awakeShare < 0.18 ? 'good' : awakeShare < 0.25 ? 'fair' : 'attention';
}

/** "22:55" → "10:55 pm" for English, unchanged 24 h for RU / LV */
function clock(t: string, lang: Lang): string {
  if (lang !== 'en') return t;
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }): ReactElement {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</p>
      <p className="mt-1 text-xl font-light text-white" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

export default function SleepStagesCard({
  lang,
  stages,
  rating,
  demo,
  bedtime = null,
  impact = null,
  ratings = null,
}: {
  lang: Lang;
  /** stage minutes from a wearable (demo accounts only for now); null = no source */
  stages: SleepStageMinutes | null;
  /** today's check-in sleep rating 1–7, null without a check-in */
  rating: number | null;
  demo: boolean;
  /** bedtime and wake-up (demo accounts only), "HH:MM" */
  bedtime?: { from: string; to: string } | null;
  /** sentences about the active factor tags, shown in the (i) sheet (components/np/tags.ts) */
  impact?: string[] | null;
  /** the last 7 check-in sleep ratings (oldest → today); real accounts show them as progress dots */
  ratings?: (number | null)[] | null;
}): ReactElement {
  const hc = HOME[lang].today;
  const sc = hc.sleep;
  const cc = CARDS[lang];

  const [night, setNight] = useState(false);
  const ux = UX[lang];
  const [selStage, setSelStage] = useState<(typeof STAGES)[number]['k'] | null>(null);
  const asleep = stages ? stages.deep + stages.rem + stages.light : 0;
  const inBed = stages ? asleep + stages.awake : 0;
  const share = (m: number) => (inBed > 0 ? m / inBed : 0);
  const pct = (m: number) => `${Math.round(share(m) * 100)}%`;
  // tap or drag along the pill: the stage under the finger is selected
  const scrub = useScrub(
    (frac) => {
      if (!stages) return null;
      let acc = 0;
      for (const st of STAGES) {
        acc += share(stages[st.k]);
        if (frac <= acc + 1e-6) {
          setSelStage(st.k);
          return STAGES.indexOf(st);
        }
      }
      setSelStage(STAGES[STAGES.length - 1].k);
      return STAGES.length - 1;
    },
    () => undefined,
  );

  return (
    <section aria-labelledby="sleep-card-t" className={`np-enter mt-4 p-5 sm:p-6 ${cardClass('sleep')}`} style={{ ['--np-i' as string]: 2 }}>
      <MetricHeader
        theme="sleep"
        icon="moon"
        label={sc.title}
        status={stages ? `${sc.hm(asleep)} · ${hc.status[durationStatus(asleep)]}` : rating !== null ? hc.status[sleepStatus(rating)] : undefined}
        statusColor={stages ? tone(durationStatus(asleep)) : rating !== null ? tone(sleepStatus(rating)) : undefined}
        right={
          <InfoButton
            k={stages ? 'stages' : 'sleep'}
            accent={ACCENT}
            baseline={stages ? { now: sc.hm(asleep) } : rating !== null ? { now: `${rating} / 7` } : undefined}
            impact={impact}
          />
        }
      />
      <h2 id="sleep-card-t" className="sr-only">
        {sc.title}
      </h2>
      {demo && stages && <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-white/70">{hc.heart.demoTag}</p>}

      {stages ? (
        <>
          <p className="np-editorial mt-4 text-[26px] leading-tight">{cc.sleepLine[durationStatus(asleep) === 'optimal' || durationStatus(asleep) === 'good' ? 'good' : durationStatus(asleep) === 'fair' ? 'fair' : 'attention']}</p>
          {/* sleep timeline: a thin segmented pill (share of time in bed); tap a stage for its time and share */}
          <div className="relative mt-6 pt-8">
            {selStage && (
              <ChartPin
                left={
                  (STAGES.slice(0, STAGES.findIndex((x) => x.k === selStage)).reduce((a, x) => a + share(stages[x.k]), 0) + share(stages[selStage]) / 2) * 100
                }
              >
                {sc.stages[selStage]} · {sc.hm(stages[selStage])} · {pct(stages[selStage])}
              </ChartPin>
            )}
            {/* the whole 28 px band is the hit area (the visible pill inside is 10 px); drag along it to read the stages in turn */}
            <div
              role="group"
              aria-label={`${sc.bar}: ${STAGES.map((s) => `${sc.stages[s.k]} ${pct(stages[s.k])}`).join(', ')}`}
              className="flex h-7 w-full touch-pan-y items-center gap-[3px]"
              {...scrub}
            >
              {STAGES.map((s) => (
                <button
                  key={s.k}
                  type="button"
                  aria-pressed={selStage === s.k}
                  aria-label={`${sc.stages[s.k]} ${sc.hm(stages[s.k])} ${pct(stages[s.k])}`}
                  onClick={(e) => e.detail === 0 && setSelStage(selStage === s.k ? null : s.k)}
                  className="flex h-7 min-w-[10px] items-center outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  style={{ width: `${share(stages[s.k]) * 100}%` }}
                >
                  <span
                    aria-hidden
                    className="block h-[10px] w-full rounded-full transition-[opacity,transform] duration-150"
                    style={{
                      backgroundColor: s.color,
                      opacity: selStage && selStage !== s.k ? 0.4 : 1,
                      transform: selStage === s.k ? 'scaleY(1.5) scaleX(1.02)' : undefined,
                      boxShadow: selStage === s.k ? '0 0 10px rgba(255,255,255,0.45)' : undefined,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
          {bedtime && (
            <div className="mt-1 flex justify-between font-mono text-[11px] text-white/60">
              <span>{clock(bedtime.from, lang)}</span>
              <span>{clock(bedtime.to, lang)}</span>
            </div>
          )}
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
            {STAGES.map((s) => (
              <li key={s.k} className="flex items-center gap-1.5 whitespace-nowrap text-white/60">
                <span aria-hidden className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                {sc.stages[s.k]} <span className="font-mono text-white/70">{pct(stages[s.k])}</span>
              </li>
            ))}
          </ul>

          {/* the night in detail (demo accounts only): a 2D hypnogram, collapsed by default */}
          {demo && bedtime && (
            <div className="mt-4">
              <button
                type="button"
                aria-expanded={night}
                onClick={() => setNight((o) => !o)}
                className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-[13px] font-medium text-white/85 transition-colors hover:bg-white/[0.07]"
              >
                {night ? ux.hypno.hide : ux.hypno.show}
                <Icon name="chevR" size={16} className={`transition-transform ${night ? '-rotate-90' : 'rotate-90'}`} />
              </button>
              {night && (
                <div className="mt-2 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
                    {ux.hypno.title} · {ux.hypno.demo}
                  </p>
                  <Hypnogram
                    segments={DEMO_HYPNO}
                    startMin={Number(bedtime.from.slice(0, 2)) * 60 + Number(bedtime.from.slice(3, 5))}
                    names={sc.stages}
                    hm={sc.hm}
                    clock={(m) => clock(`${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, lang)}
                    label={ux.hypno.title}
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5">
            <Stat label={sc.deep} value={sc.hm(stages.deep)} />
            <Stat label={sc.rem} value={sc.hm(stages.rem)} />
            <Stat label={sc.efficiency} value={`${Math.round((asleep / inBed) * 100)}%`} />
            <Stat
              label={sc.restfulness}
              value={hc.status[restfulnessStatus(share(stages.awake))]}
              color={STATUS_HEX[restfulnessStatus(share(stages.awake))]}
            />
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-4xl font-light tracking-tight text-white">{rating !== null ? rating : '—'}</span>
            {rating !== null && <span className="text-sm text-white/70">/7</span>}
            {rating !== null && <span className="np-editorial text-[22px] leading-tight text-white/90">{cc.sleepLine[sleepStatus(rating) === 'good' ? 'good' : sleepStatus(rating) === 'fair' ? 'fair' : 'attention']}</span>}
          </div>
          {rating === null && <p className="mt-2 text-sm text-white/75">{sc.noRating}</p>}
          <div className="mt-4">
            <RangeSlider value={rating} min={1} max={7} color={ACCENT} label={rating !== null ? sc.ratingBadge(rating) : sc.noRating} endLabels={['1', '7']} />
          </div>
          {ratings && ratings.some((v) => v !== null) && (
            <div className="mt-5">
              <DotTrend lang={lang} values={ratings} />
            </div>
          )}
          <p className="mt-4 text-[12px] leading-relaxed text-white/50">{sc.empty}</p>
        </>
      )}
    </section>
  );
}
