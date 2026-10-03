'use client';

// components/np/ReadinessRing.tsx — the hero metric (Oura-style ring).
// Score and zone come straight from the engine; the arc colour follows the
// engine zone, never its own thresholds. Under the number: the state pill and
// the change against the athlete's own average of earlier days.

import { useEffect, useState, type ReactElement } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import type { ReadinessZone } from '@/lib/readiness-engine';
import { LOCALE, NP, signed } from './copy';
import { Icon } from './icons';
import { ZONE, useReducedMotion } from './ui';

const R = 88;
const C = 2 * Math.PI * R;

export default function ReadinessRing({
  lang,
  score,
  zone,
  delta,
  size = 208,
}: {
  lang: Lang;
  score: number | null;
  zone: ReadinessZone | null;
  /** Today minus the mean of earlier days with a check-in; null = not enough history. */
  delta: { delta: number; days: number } | null;
  size?: number;
}): ReactElement {
  const t = NP[lang];
  const reduced = useReducedMotion();
  const has = score !== null && zone !== null;
  const Z = has ? ZONE[zone] : null;
  const target = has ? C * (1 - Math.max(0, Math.min(100, score)) / 100) : C;
  // Start empty and fill on mount (1.2 s); instant with reduced motion.
  const [offset, setOffset] = useState(C);
  useEffect(() => {
    if (reduced) {
      setOffset(target);
      return;
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOffset(target)));
    return () => cancelAnimationFrame(id);
  }, [target, reduced]);
  const gid = `np-ring-${zone ?? 'none'}`;
  const nf = new Intl.NumberFormat(LOCALE[lang]);

  return (
    <div className="mx-auto flex w-fit flex-col items-center">
    <div className="relative" style={{ width: size, height: size }}>
      {Z && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[-28%] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${Z.glow} 0%, transparent 65%)` }}
        />
      )}
      <svg className="relative h-full w-full -rotate-90" viewBox="0 0 200 200" fill="none" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={Z?.from ?? '#7D8594'} />
            <stop offset="1" stopColor={Z?.to ?? '#7D8594'} />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={R} stroke="rgb(255 255 255 / 0.06)" strokeWidth="12" />
        <circle cx="100" cy="100" r="72" stroke="rgb(255 255 255 / 0.08)" strokeWidth="1" strokeDasharray="1 5" />
        {/* engine zone borders 50 and 75 as ticks on the track */}
        {[50, 75].map((p) => {
          const a = (p / 100) * 2 * Math.PI;
          return (
            <line
              key={p}
              x1={100 + 80 * Math.cos(a)}
              y1={100 + 80 * Math.sin(a)}
              x2={100 + 96 * Math.cos(a)}
              y2={100 + 96 * Math.sin(a)}
              stroke="rgb(255 255 255 / 0.22)"
              strokeWidth="1.5"
            />
          );
        })}
        {has && (
          <circle
            className="np-ring-arc"
            style={{ ['--np-glow' as string]: Z?.glow }}
            cx="100"
            cy="100"
            r={R}
            stroke={`url(#${gid})`}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={C.toFixed(1)}
            strokeDashoffset={offset.toFixed(1)}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="sr-only">{has ? `${t.readiness}: ${score} / 100, ${t.zone[zone]}` : t.noScore}</span>
        <span className="np-overline" aria-hidden>
          {t.readiness}
        </span>
        <span className="np-num mt-2 text-6xl" aria-hidden>
          {has ? nf.format(score) : '—'}
        </span>
        {has && Z ? (
          <span className={`np-pill ${Z.pill} mt-3`}>
            <span className={`h-1.5 w-1.5 rounded-full ${Z.dot}`} aria-hidden />
            {t.state[zone]}
          </span>
        ) : (
          <span className="mt-3 max-w-[150px] text-xs text-np-text-3">{t.noScore}</span>
        )}
      </div>
    </div>
      {has && delta && (
        <p className="np-pill mt-3">
          <Icon name={delta.delta > 0 ? 'up' : delta.delta < 0 ? 'down' : 'flat'} size={12} />
          {t.vsAvg(signed(delta.delta, lang), delta.days)}
        </p>
      )}
    </div>
  );
}
