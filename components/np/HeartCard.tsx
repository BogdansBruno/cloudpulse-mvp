'use client';

// components/np/HeartCard.tsx — "Resting Heart Rate & HRV" on Today.
//
// Lotus has no wearable source yet, so for real athletes this card is an honest empty state: the
// chart frame (grid + time axis) with no line, a sentence why, and the way to the Live workout
// (heart rate from a chest strap during training). The jury demo accounts get labelled demo values
// (components/np/demo.ts) — the "Demo · needs a wearable" tag is always on them.
//
// Chart (ultra-minimal): ultra-thin vertical capsules (3 px, one per 30 minutes of the day, the mean of that
// slot's readings), no grid, no frame, no boxes. Colour = intensity of the slot: slate = idle (< 60 bpm),
// cyan = rest (60–99), yellow = cardio (100–139), neon pink = peak (≥ 140). Micro labels (10 px, white/40):
// 00 · 06 · 12 · 18 under the bars and the lowest / highest reading above them. Every number is read from the points.

import Link from 'next/link';
import { useId, useState, type ReactElement } from 'react';
import { useScrub } from './useScrub';
import type { Lang } from '@/lib/i18n/translations';
import { HOME } from './homeCopy';
import { Icon } from './icons';
import { STATUS_HEX, chipStyle } from './status';
import { CARD_THEME, cardClass } from './cardTheme';
import { ChartPin } from './ChartPin';
import { InfoButton } from './InfoSheet';
import ChartExplain from './ChartExplain';
import { heartInsight, insightCopy, type ExplainSpec } from './chartInsight';
import type { TagKey } from './uxCopy';

export type HeartDay = { points: { min: number; bpm: number }[]; restingBpm: number; hrvMs: number };

const W = 320;
const H = 96;
const SLOT = 30; // minutes per capsule
const SLOTS = 1440 / SLOT;
const CYAN = CARD_THEME.readiness.accent;
const IDLE = '#5C6675';
const PEAK = '#F25CA8';
const CARDIO = '#FFC53D';

const zoneOf = (bpm: number): 'peak' | 'cardio' | 'rest' | 'idle' => (bpm >= 140 ? 'peak' : bpm >= 100 ? 'cardio' : bpm >= 60 ? 'rest' : 'idle');
const ZONE_HEX = { peak: PEAK, cardio: CARDIO, rest: CYAN, idle: IDLE } as const;
const ZONE_WORD: Record<Lang, Record<'peak' | 'cardio' | 'rest' | 'idle', string>> = {
  en: { peak: 'Peak', cardio: 'Cardio', rest: 'Rest', idle: 'Idle' },
  ru: { peak: 'Пик', cardio: 'Кардио', rest: 'Отдых', idle: 'Покой' },
  lv: { peak: 'Maksimums', cardio: 'Kardio', rest: 'Atpūta', idle: 'Miers' },
};
const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export default function HeartCard({ lang, data, demo, tags = [] }: { lang: Lang; data: HeartDay | null; demo: boolean; tags?: TagKey[] }): ReactElement {
  const hc = HOME[lang].today.heart;
  const status = HOME[lang].today.status;
  const gid = useId().replace(/:/g, '');
  const [sel, setSel] = useState<number | null>(null);
  const pts = data?.points ?? [];
  // the lowest value; when several readings tie, the middle of that stretch
  const minBpm = pts.length ? Math.min(...pts.map((p) => p.bpm)) : null;
  const maxBpm = pts.length ? Math.max(...pts.map((p) => p.bpm)) : null;
  const lows = minBpm === null ? [] : pts.filter((p) => p.bpm === minBpm);
  const low = lows.length ? lows[Math.floor(lows.length / 2)] : null;
  // one capsule per 30-minute slot: the mean of the readings in it (empty slots stay empty)
  const slots: (number | null)[] = Array.from({ length: SLOTS }, (_, i) => {
    const inSlot = pts.filter((p) => p.min >= i * SLOT && p.min < (i + 1) * SLOT);
    return inSlot.length ? inSlot.reduce((a, p) => a + p.bpm, 0) / inSlot.length : null;
  });
  const lo = Math.min(40, minBpm ?? 40);
  const hi = Math.max(160, maxBpm ?? 160);
  const bw = 3;
  const gap = (W - 30 - bw) / (SLOTS - 1);
  const xc = (i: number) => i * gap + bw / 2;
  // the slot holding the lowest reading is the default callout
  const lowSlot = low ? Math.min(SLOTS - 1, Math.floor(low.min / SLOT)) : -1;
  const shown = sel !== null && slots[sel] !== null ? sel : lowSlot;
  const shownVal = shown >= 0 ? slots[shown] : null;
  const isLow = shown === lowSlot && sel === null;

  // tap or drag anywhere on the chart: the nearest capsule is selected (the whole chart is the hit area)
  const pick = (frac: number) => {
    const px = frac * W;
    let best = -1;
    let bd = Infinity;
    slots.forEach((v, i) => {
      if (v === null) return;
      const d = Math.abs(xc(i) - px);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setSel(best >= 0 ? best : null);
    return best;
  };
  const scrub = useScrub(pick, () => setSel(null));
  const zw = ZONE_WORD[lang];
  // data to action: what / why / what to do for the selected slot, and a breakdown of the day's peaks and its low
  const explainAt = (i: number) => {
    const v = slots[i];
    return v === null || !data ? null : heartInsight({ lang, bpm: v, resting: data.restingBpm, time: hhmm(i * SLOT), zone: zoneOf(v), tags });
  };
  const explain: ExplainSpec | undefined =
    data && low
      ? {
          at: explainAt,
          heads: insightCopy(lang).heart.heads,
          list: slots.flatMap((v, i) => {
            if (v === null || !(zoneOf(v) === 'peak' || zoneOf(v) === 'cardio' || i === lowSlot)) return [];
            const ins = explainAt(i);
            return ins ? [{ index: i, label: hhmm(i * SLOT), valueText: `${Math.round(v)} ${hc.bpm}`, insight: ins, flag: i === lowSlot ? ('below' as const) : ('above' as const) }] : [];
          }),
        }
      : undefined;

  return (
    <section aria-labelledby={`${gid}-t`} className={`np-enter mt-4 p-5 sm:p-6 ${cardClass('readiness')}`} style={{ ['--np-i' as string]: 1 }}>
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-white/80">
          <Icon name="heartbeat" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${gid}-t`} className="text-[15px] font-normal leading-tight text-white" style={{ fontFamily: 'inherit' }}>
            {hc.title}
          </h2>
          {data && (
            <p className="mt-1">
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase leading-4 tracking-widest" style={chipStyle(CYAN)}>
                {status.optimal}
              </span>
            </p>
          )}
        </div>
        <InfoButton k="heart" accent={CYAN} baseline={data ? { now: `${data.restingBpm} ${hc.bpm}` } : undefined} insight={data && low ? `${hc.lowest} ${low.bpm} ${hc.bpm} ${hc.at(hhmm(low.min))}` : null} />
      </div>
      {demo && data && <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">{hc.demoTag}</p>}

      {data && low && maxBpm !== null ? (
        <>
          <p className="mt-4 text-white">
            <span className="text-[40px] font-light leading-none tracking-tight">{data.restingBpm}</span> <span className="text-sm text-white/70">{hc.bpm}</span>
          </p>
          <div className="relative mt-3 pt-9">
            {shownVal !== null && (
              <ChartPin left={(xc(shown) / W) * 100}>
                {isLow ? `${hc.lowest} ${low.bpm} ${hc.bpm} ${hc.at(hhmm(low.min))}` : `${Math.round(shownVal)} ${hc.bpm} · ${hhmm(shown * SLOT)} · ${zw[zoneOf(shownVal)]}`}
              </ChartPin>
            )}
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="block w-full touch-pan-y overflow-visible"
              role="img"
              aria-label={`${hc.chart}: ${hc.lowest} ${low.bpm} ${hc.bpm} ${hc.at(hhmm(low.min))}`}
              {...scrub}
            >
              <text x={W - 24} y={9} className="font-mono" fontSize="11" fill="rgb(255 255 255 / 0.6)">
                {maxBpm}
              </text>
              <text x={W - 24} y={H} className="font-mono" fontSize="11" fill="rgb(255 255 255 / 0.6)">
                {minBpm}
              </text>
              {/* the active column: the finger-sized hit area behind the selected capsule */}
              {shownVal !== null && <rect x={xc(shown) - 14} y={-6} width={28} height={H + 6} rx={10} fill="rgb(255 255 255 / 0.05)" />}
              {shownVal !== null && <line x1={xc(shown)} x2={xc(shown)} y1={-6} y2={H} stroke="rgb(255 255 255 / 0.2)" strokeWidth="1.5" />}
              {slots.map((v, i) => {
                if (v === null) return null;
                const h = Math.max(4, ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * H);
                const on = i === shown;
                const w = on ? bw * 2 : bw;
                return (
                  <rect
                    key={i}
                    x={xc(i) - w / 2}
                    y={H - h}
                    width={w}
                    height={h}
                    rx={w / 2}
                    fill={ZONE_HEX[zoneOf(v)]}
                    opacity={on ? 1 : shownVal !== null ? 0.6 : 0.85}
                    style={on ? { filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.65))', transition: 'all 120ms ease-out' } : { transition: 'all 120ms ease-out' }}
                  />
                );
              })}
            </svg>
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[11px] text-white/60">
            {['00', '06', '12', '18'].map((t) => (
              <span key={t}>{t}</span>
            ))}
            <span aria-hidden className="invisible">
              24
            </span>
          </div>
          {explain && <ChartExplain insight={shown >= 0 ? explainAt(shown) : null} spec={explain} onPick={setSel} title={hc.title} />}
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50">
            {(['idle', 'rest', 'cardio', 'peak'] as const).map((z) => (
              <li key={z} className="flex items-center gap-1.5">
                <span aria-hidden className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: ZONE_HEX[z] }} />
                {zw[z]}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex gap-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{hc.lowest}</p>
              <p className="mt-1 text-white">
                <span className="text-xl font-light">{low.bpm}</span> <span className="text-[11px] text-white/40">{hc.bpm}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{hc.hrv}</p>
              <p className="mt-1 text-white">
                <span className="text-xl font-light">{data.hrvMs}</span> <span className="text-[11px] text-white/40">{hc.ms}</span>
              </p>
            </div>
            <p className="ml-auto self-end">
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase leading-4 tracking-widest" style={chipStyle(STATUS_HEX.good)}>
                {hc.balanced}
              </span>
            </p>
          </div>
        </>
      ) : (
        <div className="mt-3">
          <p className="text-sm leading-relaxed text-white/70">{hc.empty}</p>
          <Link
            href="/workout"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-4 py-2.5 text-xs font-medium text-[#2FD8F0] transition-colors hover:bg-white/10"
          >
            <Icon name="heartbeat" size={15} />
            {hc.live}
          </Link>
        </div>
      )}
    </section>
  );
}
