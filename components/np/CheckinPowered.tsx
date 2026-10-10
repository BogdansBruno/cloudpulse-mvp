'use client';

// components/np/CheckinPowered.tsx — "Check-in Powered Mode": what Today / Vitals / My Health show when there is no wearable.
//
//   <CheckinBanner>   a calm banner: "Readiness and recovery derived from your 5-step daily check-in."
//   <CheckinSignals>  the four check-in answers (sleep · energy · calm · muscles, 1–7, 7 = best) as an interactive trend
//                     line with the athlete's own usual range, 7 progress dots and the data-to-action card.
//   <DotTrend>        the last 7 nights as dots (used inside the Sleep card)
//
// Nothing here is estimated: every value is an answer the athlete gave. Wearable-only numbers (resting HR, HRV, sleep
// stages) are NOT faked; a single quiet note says what needs a wearable, only where it is relevant.

import { useMemo, useState, type ReactElement } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';
import BandChart, { type BandPoint } from './BandChart';
import { makeExplain } from './chartInsight';
import { LT } from './status';
import { LOCALE } from './copy';

type Key = 'sleep' | 'energy' | 'calm' | 'muscles';
const FIELD: Record<Key, 'sleepQuality' | 'fatigue' | 'stress' | 'soreness'> = { sleep: 'sleepQuality', energy: 'fatigue', calm: 'stress', muscles: 'soreness' };
const KEYS: Key[] = ['sleep', 'energy', 'calm', 'muscles'];
const HEX: Record<Key, string> = { sleep: '#8E8CFF', energy: '#FFB23D', calm: '#3FE0D0', muscles: '#F25CA8' };

const COPY: Record<
  Lang,
  {
    banner: string;
    bannerSub: string;
    needs: string;
    title: string;
    sub: string;
    tabs: Record<Key, string>;
    dots: string;
    empty: string;
    scale: string;
    last: (n: string) => string;
    aria: (name: string) => string;
  }
> = {
  en: {
    banner: 'Check-in Powered Mode',
    bannerSub: 'Readiness and recovery derived from your 5-step daily check-in.',
    needs: 'Resting HR and HRV need a wearable.',
    title: 'How you feel, day by day',
    sub: 'Your own answers. 7 is the best.',
    tabs: { sleep: 'Sleep', energy: 'Energy', calm: 'Calm', muscles: 'Muscles' },
    dots: 'Last 7 days',
    empty: 'Do a few check-ins and your trend line will appear here.',
    scale: '/7',
    last: (n) => `Latest: ${n} of 7`,
    aria: (name) => `${name} from your daily check-in`,
  },
  ru: {
    banner: 'Режим «Чек-ин»',
    bannerSub: 'Готовность и восстановление считаются по твоему ежедневному чек-ину из 5 шагов.',
    needs: 'Пульс покоя и HRV требуют носимого устройства.',
    title: 'Как ты себя чувствуешь по дням',
    sub: 'Твои собственные ответы. 7 — лучшее.',
    tabs: { sleep: 'Сон', energy: 'Энергия', calm: 'Спокойствие', muscles: 'Мышцы' },
    dots: 'Последние 7 дней',
    empty: 'Сделай несколько чек-инов, и здесь появится линия тренда.',
    scale: '/7',
    last: (n) => `Последнее: ${n} из 7`,
    aria: (name) => `${name} по твоему ежедневному чек-ину`,
  },
  lv: {
    banner: 'Atskaites režīms',
    bannerSub: 'Gatavība un atjaunošanās tiek aprēķināta no tavas ikdienas 5 soļu atskaites.',
    needs: 'Atpūtas pulsam un HRV nepieciešama valkājama ierīce.',
    title: 'Kā tu jūties pa dienām',
    sub: 'Tavas paša atbildes. 7 ir labākais.',
    tabs: { sleep: 'Miegs', energy: 'Enerģija', calm: 'Miers', muscles: 'Muskuļi' },
    dots: 'Pēdējās 7 dienas',
    empty: 'Aizpildi dažas atskaites, un šeit parādīsies tendences līnija.',
    scale: '/7',
    last: (n) => `Pēdējais: ${n} no 7`,
    aria: (name) => `${name} no tavas ikdienas atskaites`,
  },
};

/** 1–7 (7 best) → colour of a dot: 6–7 mint, 4–5 amber, 1–3 coral. */
export const dotColor = (v: number): string => (v >= 6 ? LT.good : v >= 4 ? LT.fair : LT.attention);

export function CheckinBanner({ lang, showNeeds = false, className = '' }: { lang: Lang; showNeeds?: boolean; className?: string }): ReactElement {
  const c = COPY[lang];
  return (
    <aside role="note" className={`relative flex items-start gap-3 rounded-[18px_18px_18px_6px] border border-white/[0.08] bg-white/[0.03] p-4 ${className}`}>
      <span aria-hidden className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px_10px_10px_3px]" style={{ backgroundColor: '#B8F23C1f', color: '#B8F23C' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5l5 5L20 6.5" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#B8F23C' }}>
          {c.banner}
        </p>
        <p className="mt-1 text-[14px] leading-snug text-white/85">{c.bannerSub}</p>
        {showNeeds && <p className="mt-1.5 text-[12px] leading-snug text-white/50">{c.needs}</p>}
      </div>
    </aside>
  );
}

/** The last 7 days as dots: filled and coloured for a check-in day, hollow for a day without one. */
export function DotTrend({ lang, values, color, label }: { lang: Lang; values: (number | null)[]; color?: string; label?: string }): ReactElement {
  const c = COPY[lang];
  const v7 = values.slice(-7);
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{label ?? c.dots}</p>
      <ul className="mt-2 flex items-center gap-2" aria-hidden>
        {v7.map((v, i) => (
          <li key={i} className="flex flex-col items-center gap-1">
            <span
              className="block h-3.5 w-3.5 rounded-full border"
              style={v === null ? { borderColor: 'rgba(255,255,255,0.22)' } : { backgroundColor: color ?? dotColor(v), borderColor: color ?? dotColor(v), boxShadow: `0 0 10px ${(color ?? dotColor(v))}66` }}
            />
            <span className="font-mono text-[10px] text-white/45">{v === null ? '·' : v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

export function CheckinSignals({ lang, history, className = '' }: { lang: Lang; history: ReadinessHistoryPoint[] | null; className?: string }): ReactElement {
  const c = COPY[lang];
  const [key, setKey] = useState<Key>('sleep');
  const locale = lang === 'en' ? 'en-US' : LOCALE[lang];

  const series = useMemo(() => {
    const win = (history ?? []).slice(-14);
    const get = (k: Key) => win.map((p) => (p.hasCheckin ? p[FIELD[k]] : null));
    return { win, vals: Object.fromEntries(KEYS.map((k) => [k, get(k)])) as Record<Key, (number | null)[]> };
  }, [history]);

  const vals = series.vals[key];
  const nums = vals.filter((v): v is number => v !== null);
  const enough = nums.length >= 3;
  // the athlete's own usual range: mean ± one standard deviation, only with ≥ 5 real answers, clamped to the 1–7 scale
  const band = useMemo(() => {
    if (nums.length < 5) return null;
    const m = mean(nums);
    const sd = Math.sqrt(mean(nums.map((v) => (v - m) ** 2)));
    return { lo: Math.max(1, Math.round((m - sd) * 10) / 10), hi: Math.min(7, Math.round((m + sd) * 10) / 10) };
  }, [nums]);

  const points = useMemo<BandPoint[]>(
    () =>
      series.win.map((p, i) => {
        const d = new Date(`${p.date}T12:00:00`);
        return { label: series.win.length > 10 ? String(d.getDate()) : d.toLocaleDateString(locale, { weekday: 'short' }), value: vals[i] };
      }),
    [series.win, vals, locale],
  );
  const explain = useMemo(
    () =>
      makeExplain({
        lang,
        metric: 'high',
        labels: series.win.map((p) => new Date(`${p.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })),
        values: vals,
        band,
        decimals: 0,
      }),
    [lang, series.win, vals, band, locale],
  );
  const last = [...nums].pop();
  const accent = HEX[key];

  return (
    <section aria-labelledby="ck-sig-t" className={`lt-card-stress np-enter p-5 ${className}`} style={{ ['--lt-accent' as string]: accent }}>
      <h2 id="ck-sig-t" className="text-[18px] font-semibold tracking-tight text-white">
        {c.title}
      </h2>
      <p className="mt-1 text-[13px] text-white/55">{c.sub}</p>

      <div role="tablist" aria-label={c.title} className="mt-4 flex flex-wrap gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={key === k}
            onClick={() => setKey(k)}
            className="min-h-[40px] rounded-full border px-4 text-[13px] font-semibold transition-colors"
            style={key === k ? { color: '#0B0D11', backgroundColor: HEX[k], borderColor: HEX[k] } : { color: 'rgba(255,255,255,0.75)', borderColor: 'rgba(255,255,255,0.14)' }}
          >
            {c.tabs[k]}
          </button>
        ))}
      </div>

      {enough ? (
        <>
          <div className="mt-4">
            <BandChart points={points} band={band} min={1} max={7} color={accent} label={c.aria(c.tabs[key])} format={(v) => v.toFixed(0)} unit={c.scale} explain={explain} />
          </div>
          <div className="mt-4 flex items-end justify-between gap-4">
            <DotTrend lang={lang} values={series.vals[key]} color={undefined} />
            {last !== undefined && <p className="text-right text-[13px] font-medium text-white/80">{c.last(String(last))}</p>}
          </div>
        </>
      ) : (
        <p className="mt-4 text-[14px] leading-snug text-white/70">{c.empty}</p>
      )}
    </section>
  );
}
