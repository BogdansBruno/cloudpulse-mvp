'use client';

// components/np/Telemetry.tsx — the "instrument panel" pieces of v3.
//
//   <Greeting>        date + greeting over a soft ambient tint (top of a screen)
//   <HeroArcs>        three concentric arcs: Readiness (engine zone) · ADP Load Index (blue)
//                     · Wellness from the Hooper index (cyan). Every value comes from the engine
//                     or the check-in; a missing value is an empty track, never a guess.
//   <TelemetryTable>  dense rows: label + hint on the left, tabular value + pill / Δ on the right
//   <Disclaimer>      the non-medical footer every athlete screen ends with
//
// Helpers: acwrBand (engine thresholds 0.8 / 1.3 / 1.5), wellnessPct (Hooper 4–28 → 0–100 %).

import { useEffect, useId, useState, type ReactElement, type ReactNode } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import type { ReadinessZone } from '@/lib/readiness-engine';
import { APP, type AcwrBand } from './appCopy';
import { LOCALE, NP } from './copy';
import { Icon } from './icons';
import { DeltaPill, ZONE, useReducedMotion } from './ui';

/** Identity colours on the dark glass cards. */
export const BLUE = '#FFC53D'; // load / strain = Lotus amber (name kept for older imports)
export const CYAN = '#2FD8F0';

/** Engine ACWR bands: < 0.8 low · 0.8–1.3 sweet spot · 1.3–1.5 rising · > 1.5 spike. */
export function acwrBand(acwr: number): AcwrBand {
  if (acwr < 0.8) return 'low';
  if (acwr <= 1.3) return 'sweet';
  if (acwr <= 1.5) return 'caution';
  return 'spike';
}
export const ACWR_PILL: Record<AcwrBand, string> = {
  low: 'np-pill-strain',
  sweet: 'np-pill-good',
  caution: 'np-pill-warn',
  spike: 'np-pill-danger',
};

/** Hooper index 4 (best) … 28 (worst) → wellness 100 … 0 %. null without a check-in. */
export function wellnessPct(hooper: number | null | undefined): number | null {
  if (hooper === null || hooper === undefined || !Number.isFinite(hooper) || hooper < 4) return null;
  return Math.round(((28 - Math.min(28, hooper)) / 24) * 100);
}

export function Greeting({ lang, sub, tint = 'rgb(255 197 61 / 0.12)' }: { lang: Lang; sub?: ReactNode; tint?: string }): ReactElement {
  const v3 = APP[lang].v3;
  // Rendered after mount so server and client agree on the hour.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const date = now ? now.toLocaleDateString(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long' }) : ' ';
  return (
    <header className="relative">
      <span aria-hidden className="np-ambient -left-16 -top-24 h-56 w-72" style={{ ['--np-ambient' as string]: tint }} />
      <p className="np-label relative first-letter:uppercase">{date}</p>
      <h1 className="np-on-bg relative mt-1.5 text-[34px] font-light leading-tight tracking-[-0.03em] text-np-text max-md:sr-only md:text-[44px]" style={{ fontFamily: 'inherit' }}>
        {now ? v3.greeting(now.getHours()) : ' '}
      </h1>
      {sub && <div className="relative mt-1 text-sm text-np-text-2">{sub}</div>}
    </header>
  );
}

type Arc = { r: number; w: number; value: number | null; stroke: string; glow: string; head: string };

export function HeroArcs({
  lang,
  score,
  zone,
  loadIndex,
  wellness,
  delta,
  size = 232,
}: {
  lang: Lang;
  score: number | null;
  zone: ReadinessZone | null;
  /** ADP Load Index 0–100 of the day, null while the base is building. */
  loadIndex: number | null;
  /** 0–100 from wellnessPct(). */
  wellness: number | null;
  /** Δ of readiness vs the athlete's own earlier days. */
  delta?: { delta: number; days: number } | null;
  size?: number;
}): ReactElement {
  const np = NP[lang];
  const tl = APP[lang].v3.telemetry;
  const reduced = useReducedMotion();
  const Z = score !== null && zone !== null ? ZONE[zone] : null;
  const gid = `np-arcs-${zone ?? 'none'}`;
  const arcs: Arc[] = [
    { r: 90, w: 3, value: Z ? score : null, stroke: `url(#${gid})`, glow: Z?.glow ?? 'transparent', head: Z?.stops[2] ?? '#FFFFFF' },
    { r: 80, w: 2.5, value: loadIndex, stroke: `url(#${gid}-load)`, glow: 'rgb(255 197 61 / 0.6)', head: '#FFC53D' },
    { r: 70, w: 2.5, value: wellness, stroke: `url(#${gid}-well)`, glow: 'rgb(63 224 168 / 0.55)', head: '#2FD8F0' },
  ];
  const [shown, setShown] = useState(reduced);
  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  const legend: { label: string; sub?: string; value: string; dot: string }[] = [
    { label: tl.readiness, value: Z && score !== null ? String(score) : '—', dot: Z ? Z.hex : '#4B5563' },
    { label: tl.load, value: loadIndex !== null ? String(loadIndex) : '—', dot: '#FFC53D' },
    { label: tl.wellness, sub: tl.wellnessSub, value: wellness !== null ? `${wellness}%` : '—', dot: '#3FE0A8' },
  ];
  const sr = `${tl.readiness}: ${score ?? '—'} / 100${zone ? `, ${np.zone[zone]}` : ''}; ${tl.load}: ${loadIndex ?? '—'} / 100; ${tl.wellness}: ${wellness ?? '—'} %`;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
      <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={sr}>
        {Z && <span aria-hidden className="np-ambient np-ambient-pulse inset-[-26%]" style={{ ['--np-ambient' as string]: Z.ambient }} />}
        <svg viewBox="0 0 200 200" className="relative h-full w-full -rotate-90" fill="none" aria-hidden>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={Z?.stops[0] ?? '#4b5263'} />
              <stop offset="0.5" stopColor={Z?.stops[1] ?? '#4b5263'} />
              <stop offset="1" stopColor={Z?.stops[2] ?? '#4b5263'} />
            </linearGradient>
            <linearGradient id={`${gid}-load`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFC53D" />
              <stop offset="1" stopColor="#FFC53D" />
            </linearGradient>
            <linearGradient id={`${gid}-well`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3FE0A8" />
              <stop offset="1" stopColor="#2FD8F0" />
            </linearGradient>
          </defs>
          {arcs.map((a, i) => {
            const C = 2 * Math.PI * a.r;
            const v = a.value === null ? 0 : Math.max(0, Math.min(100, a.value)) / 100;
            return (
              <g key={i}>
                <circle cx="100" cy="100" r={a.r} className="np-svg-track" stroke="rgb(255 255 255 / 0.1)" strokeWidth={a.w} />
                {a.value !== null && (
                  <circle
                    className="np-ring-arc"
                    style={{ ['--np-glow' as string]: a.glow, transitionDelay: `${i * 120}ms` }}
                    cx="100"
                    cy="100"
                    r={a.r}
                    stroke={a.stroke}
                    strokeWidth={a.w}
                    strokeLinecap="round"
                    strokeDasharray={C.toFixed(1)}
                    strokeDashoffset={(shown ? C * (1 - v) : C).toFixed(1)}
                  />
                )}
                {a.value !== null && v > 0 && (
                  /* glowing dot at the head of the arc */
                  <circle
                    className="np-ring-head"
                    data-on={shown}
                    cx={100 + a.r * Math.cos(v * 2 * Math.PI)}
                    cy={100 + a.r * Math.sin(v * 2 * Math.PI)}
                    r={a.w + 1.6}
                    fill="#FFFFFF"
                    style={{ filter: `drop-shadow(0 0 5px ${a.head})` }}
                  />
                )}
              </g>
            );
          })}
          {/* engine zone borders 50 / 75 on the readiness track */}
          {[50, 75].map((p) => {
            const ang = (p / 100) * 2 * Math.PI;
            return (
              <line
                key={p}
                x1={100 + 83 * Math.cos(ang)}
                y1={100 + 83 * Math.sin(ang)}
                x2={100 + 97 * Math.cos(ang)}
                y2={100 + 97 * Math.sin(ang)}
                className="np-svg-tick" stroke="rgb(255 255 255 / 0.35)"
                strokeWidth="1"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="np-label">{tl.readiness}</span>
          <span className="np-metric mt-1.5 text-[56px]">{Z && score !== null ? score : '—'}</span>
          {Z && zone ? (
            <span className={`mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${Z.text}`}>{np.state[zone]}</span>
          ) : (
            <span className="mt-1 max-w-[110px] text-[11px] leading-snug text-np-text-3">{np.noScore}</span>
          )}
        </div>
      </div>

      <div className="w-full max-w-[260px] space-y-1">
        {legend.map((l) => (
          <div key={l.label} className="np-row min-h-0 py-2">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: l.dot, boxShadow: `0 0 8px ${l.dot}` }} aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm text-np-text">{l.label}</span>
                {l.sub && <span className="block truncate text-[11px] text-np-text-3">{l.sub}</span>}
              </span>
            </span>
            <span className="np-mono shrink-0 text-base font-semibold text-np-text">{l.value}</span>
          </div>
        ))}
        {delta && <DeltaPill className="mt-2" delta={delta.delta} text={np.vsAvg((delta.delta > 0 ? '+' : delta.delta < 0 ? '−' : '±') + Math.abs(delta.delta), delta.days)} />}
      </div>
    </div>
  );
}

export type TelemetryRow = {
  key: string;
  label: string;
  hint?: string;
  value: string;
  unit?: string;
  /** tone pill next to the value, e.g. ACWR band */
  pill?: { text: string; cls: string };
  delta?: { value: number; text: string };
  /** accent colour of the value (identity: blue load, cyan sleep) */
  color?: string;
};

export function TelemetryTable({ title, rows, className = '' }: { title?: string; rows: TelemetryRow[]; className?: string }): ReactElement {
  return (
    <section className={`np-card p-4 md:p-5 ${className}`}>
      {title && (
        <h2 className="np-label mb-1" style={{ fontFamily: 'inherit' }}>
          {title}
        </h2>
      )}
      <div>
        {rows.map((r) => (
          <div key={r.key} className="np-row">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-np-text">{r.label}</span>
              {r.hint && <span className="block truncate text-[11px] text-np-text-3">{r.hint}</span>}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {r.pill && <span className={`np-pill ${r.pill.cls} hidden min-[360px]:inline-flex`}>{r.pill.text}</span>}
              {r.delta && <DeltaPill delta={r.delta.value} text={r.delta.text} className="hidden sm:inline-flex" />}
              <span className="np-mono text-[17px] font-semibold" style={{ color: r.color ?? 'var(--color-np-text)' }}>
                {r.value}
                {r.unit && <span className="ml-0.5 text-xs font-normal text-np-text-3">{r.unit}</span>}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Disclaimer({
  lang,
  className = '',
  align = 'center',
}: {
  lang: Lang;
  className?: string;
  align?: 'center' | 'start';
}): ReactElement {
  const v3 = APP[lang].v3;
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={`mx-auto max-w-2xl pt-4 ${align === 'center' ? 'text-center' : 'text-left'} ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="np-caption inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:text-white"
      >
        <Icon name="info" size={14} />
        <span>{v3.disclaimerShort}</span>
      </button>
      {open && (
        <p id={id} className="np-caption mt-1">
          {v3.disclaimer}
        </p>
      )}
    </div>
  );
}
