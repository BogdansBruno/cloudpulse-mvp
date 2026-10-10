'use client';

// components/np/PhaseHeroes.tsx — the time-of-day layer of Today.
//
//   morning   06–12  Readiness & Sleep (the classic hero, in today/page.tsx) + the plan for the day
//   afternoon 12–18  Daytime stress balance & Activity strain + mid-day pacing advice
//   evening   18–06  Bedtime guidance + resting-heart-rate wind-down + a calm-evening directive
//
// The phase follows the phone's clock; PhaseSwitch lets the athlete (or a jury member) look at the other two.
// Everything shown is computed from the athlete's own check-in / load, or the labelled demo set — a bedtime window needs
// a wake-up time, which the athlete types once (stored on this device only); no clock time is ever guessed.

import { useEffect, useState, type ReactElement } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import { ScoreRing } from './ScoreRing';
import Sparkline from './Sparkline';
import { InfoButton } from './InfoSheet';
import { cardClass } from './cardTheme';
import { STATUS_GRADIENT, STATUS_HEX, chipStyle, loadStatus, type Status } from './status';
import { UX, type Phase } from './uxCopy';

export const PHASES: Phase[] = ['morning', 'afternoon', 'evening'];

/** 06:00–12:00 morning · 12:00–18:00 afternoon · 18:00–06:00 evening */
export function phaseOf(nowMin: number): Phase {
  return nowMin >= 360 && nowMin < 720 ? 'morning' : nowMin >= 720 && nowMin < 1080 ? 'afternoon' : 'evening';
}

export function clockLabel(min: number, lang: Lang): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  if (lang !== 'en') return `${String(h).padStart(2, '0')}:${mm}`;
  return `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h >= 12 ? 'pm' : 'am'}`;
}

export function PhaseSwitch({ lang, phase, auto, onPick }: { lang: Lang; phase: Phase; auto: Phase | null; onPick: (p: Phase | null) => void }): ReactElement {
  const u = UX[lang].phase;
  return (
    <div role="radiogroup" aria-label={u.label} className="mt-3 grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-white/5 p-1">
      {PHASES.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={phase === p}
          onClick={() => onPick(p === auto ? null : p)}
          className={`h-10 rounded-full text-[13px] font-medium transition-colors ${phase === p ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white'}`}
        >
          {u[p]}
        </button>
      ))}
    </div>
  );
}

function Capsule({
  name,
  value,
  max,
  status,
  statusText,
  series,
}: {
  name: string;
  value: number | null;
  max: number;
  status: Status | null;
  statusText: string;
  series: (number | null)[];
}): ReactElement {
  const color = status ? STATUS_HEX[status] : '#C3C5C7';
  return (
    <li className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
      <span className="flex items-center gap-2.5">
        <ScoreRing
          value={value}
          max={max}
          size={52}
          stroke={5}
          pad={5}
          colors={status ? STATUS_GRADIENT[status] : ['#C3C5C7', '#C3C5C7']}
          valueClassName="text-[15px] font-medium tracking-tight"
          label={`${name}: ${value ?? '—'} / ${max}`}
        />
        <span className="min-w-0">
          <span className="block text-[10px] font-medium uppercase leading-tight tracking-wider text-white/75">{name}</span>
          <span className="mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase leading-4 tracking-wider" style={status ? chipStyle(color) : { color: '#C3C5C7' }}>
            {statusText}
          </span>
        </span>
      </span>
      <div className="mt-2">
        <Sparkline values={series} color={color} />
      </div>
    </li>
  );
}

/** Afternoon: daytime stress balance + activity strain, with a pacing directive. */
export function AfternoonHero({
  lang,
  stress,
  stressSeries,
  load,
  loadSeries,
  target,
  statusWord,
  loadBaseline,
}: {
  lang: Lang;
  stress: number | null;
  stressSeries: (number | null)[];
  load: number | null;
  loadSeries: (number | null)[];
  target: { from: number; to: number } | null;
  statusWord: Record<Status, string>;
  loadBaseline: { usual?: string | null; now?: string | null; avg30?: string | null };
}): ReactElement {
  const u = UX[lang].afternoon;
  const sKey: 'calm' | 'mid' | 'high' | null = stress === null ? null : stress >= 6 ? 'calm' : stress >= 4 ? 'mid' : 'high';
  const sStatus: Status | null = sKey === 'calm' ? 'good' : sKey === 'mid' ? 'fair' : sKey === 'high' ? 'attention' : null;
  const lStatus: Status | null = load !== null ? loadStatus(load) : null;
  const advice = lStatus === 'attention' ? u.advice.overload : sKey === 'high' ? u.advice.stress : target ? u.advice.ok(target.from, target.to) : u.advice.none;
  return (
    <section aria-labelledby="afternoon-t" className={`np-enter relative p-5 sm:p-6 ${cardClass('stress')}`}>
      <div className="flex items-start justify-between gap-2">
        <h1 id="afternoon-t" className="np-editorial text-2xl font-semibold text-white">
          {u.heroTitle}
        </h1>
        <InfoButton k="strain" accent="#B58CFF" baseline={loadBaseline} />
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3">
        <Capsule name={u.stress} value={stress} max={7} status={sStatus} statusText={sKey ? u[sKey] : u.none} series={stressSeries} />
        <Capsule name={u.strain} value={load} max={100} status={lStatus} statusText={lStatus ? statusWord[lStatus] : '—'} series={loadSeries} />
      </ul>
      <p className="np-editorial mt-5 text-[22px] leading-snug text-white" aria-live="polite">
        {advice}
      </p>
    </section>
  );
}

const WAKE_KEY = 'lotus.wake.v1';

/** Evening: bedtime window + heart-rate wind-down. `demoWake` is the demo night's wake-up ("07:34"), real athletes type theirs. */
export function EveningHero({
  lang,
  demoWake,
  windDown,
}: {
  lang: Lang;
  /** demo accounts: the default wake-up time; real athletes: null (they set it, it stays on this device) */
  demoWake: string | null;
  windDown: { now: number; resting: number } | null;
}): ReactElement {
  const u = UX[lang].evening;
  const [wake, setWake] = useState<string | null>(null);
  useEffect(() => {
    try {
      setWake(window.localStorage.getItem(WAKE_KEY));
    } catch {
      /* no storage */
    }
  }, []);
  const eff = wake ?? demoWake;
  const wakeMin = eff && /^\d{2}:\d{2}$/.test(eff) ? Number(eff.slice(0, 2)) * 60 + Number(eff.slice(3, 5)) : null;
  const onWake = (v: string) => {
    setWake(v || null);
    try {
      if (v) window.localStorage.setItem(WAKE_KEY, v);
      else window.localStorage.removeItem(WAKE_KEY);
    } catch {
      /* no storage */
    }
  };
  return (
    <section aria-labelledby="evening-t" className={`np-enter relative p-5 sm:p-6 ${cardClass('sleep')}`}>
      <div className="flex items-start justify-between gap-2">
        <h1 id="evening-t" className="np-editorial text-2xl font-semibold text-white">
          {u.heroTitle}
        </h1>
        <InfoButton k="bedtime" accent="#3FE0A8" baseline={wakeMin !== null ? { now: clockLabel(wakeMin, lang) } : undefined} />
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-white/60">{u.bedtime}</p>
      {wakeMin !== null ? (
        <>
          <p className="mt-1 whitespace-nowrap text-[27px] font-light leading-none tracking-tight text-white">{u.window(clockLabel(wakeMin - 540, lang), clockLabel(wakeMin - 480, lang))}</p>
          <p className="mt-2 text-[12px] leading-snug text-white/60">{u.basis}</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-white/70">{u.wakeSet}</p>
      )}

      <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-2">
        <span className="text-[13px] text-white/75">{u.wakeLabel}</span>
        <input
          type="time"
          value={eff ?? ''}
          onChange={(e) => onWake(e.target.value)}
          aria-label={u.wakeLabel}
          className="h-11 rounded-lg bg-transparent font-mono text-[15px] text-white outline-none [color-scheme:dark] focus-visible:ring-2 focus-visible:ring-white/50"
        />
      </label>

      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">{u.windDown}</p>
        <p className="mt-1 text-[15px] leading-snug text-white/85">{windDown ? u.windDownNow(windDown.now, windDown.resting) : u.windDownNone}</p>
      </div>
      <p className="np-editorial mt-5 text-[20px] leading-snug text-white">{u.advice}</p>
    </section>
  );
}
