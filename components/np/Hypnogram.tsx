'use client';

// components/np/Hypnogram.tsx — the night as a 2D step graph: time along x, stage on y (awake at the top, then REM,
// light, deep at the bottom). Tap or drag across it to read a segment ("Deep · 30 min · 23:15"); the active segment
// grows and glows and a hairline guide runs down to the time axis. Demo accounts only (needs a wearable).

import { useState, type ReactElement } from 'react';
import { ChartPin } from './ChartPin';
import { useScrub } from './useScrub';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import ChartExplain from './ChartExplain';
import { stageInsight } from './chartInsight';

export type HypnoStage = 'deep' | 'rem' | 'light' | 'awake';
export type HypnoSegment = { stage: HypnoStage; min: number };

const W = 320;
const H = 120;
const ROW: Record<HypnoStage, number> = { awake: 14, rem: 44, light: 74, deep: 104 };
const COLOR: Record<HypnoStage, string> = { deep: '#4A4FB3', rem: '#32ADE6', light: '#34C759', awake: '#8E8E93' };

export default function Hypnogram({
  segments,
  startMin,
  names,
  hm,
  clock,
  label,
}: {
  segments: HypnoSegment[];
  /** minutes since midnight at the start of the night */
  startMin: number;
  names: Record<HypnoStage, string>;
  /** "1h 32m" */
  hm: (min: number) => string;
  /** minutes since midnight → "10:55 pm" */
  clock: (min: number) => string;
  label: string;
}): ReactElement {
  const { lang } = useLanguage();
  const total = segments.reduce((a, s) => a + s.min, 0);
  const [sel, setSel] = useState<number | null>(null);
  const starts = segments.map((_, i) => segments.slice(0, i).reduce((a, s) => a + s.min, 0));
  const x = (m: number) => (m / total) * W;
  const scrub = useScrub(
    (frac) => {
      const m = frac * total;
      let i = starts.findIndex((st, k) => m >= st && m < st + segments[k].min);
      if (i < 0) i = segments.length - 1;
      setSel(i);
      return i;
    },
    () => setSel(null),
  );
  const cur = sel !== null ? segments[sel] : null;
  const centre = sel !== null ? x(starts[sel] + segments[sel].min / 2) : 0;
  // an x tick every 2 hours on the clock
  const ticks: number[] = [];
  for (let t = Math.ceil(startMin / 120) * 120; t < startMin + total; t += 120) ticks.push(t);

  return (
    <>
    <div className="relative pt-9">
      {cur && sel !== null && (
        <ChartPin left={(centre / W) * 100}>
          {names[cur.stage]} · {hm(cur.min)} · {clock(startMin + starts[sel])}
        </ChartPin>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full touch-pan-y overflow-visible" role="img" aria-label={label} {...scrub}>
        {(Object.keys(ROW) as HypnoStage[]).map((k) => (
          <line key={k} x1="0" x2={W} y1={ROW[k]} y2={ROW[k]} stroke="rgb(255 255 255 / 0.05)" strokeWidth="1" />
        ))}
        {/* transitions */}
        {segments.slice(1).map((s, i) => (
          <line key={`t${i}`} x1={x(starts[i + 1])} x2={x(starts[i + 1])} y1={ROW[segments[i].stage]} y2={ROW[s.stage]} stroke="rgb(255 255 255 / 0.18)" strokeWidth="1" />
        ))}
        {cur && <line x1={centre} x2={centre} y1={-4} y2={H} stroke="rgb(255 255 255 / 0.2)" strokeWidth="1.5" />}
        {segments.map((s, i) => {
          const on = i === sel;
          const h = on ? 12 : 8;
          return (
            <rect
              key={i}
              x={x(starts[i])}
              y={ROW[s.stage] - h / 2}
              width={Math.max(2, x(s.min) - 0.8)}
              height={h}
              rx={h / 2}
              fill={COLOR[s.stage]}
              opacity={sel === null || on ? 1 : 0.5}
              style={{ transition: 'all 120ms ease-out', filter: on ? 'drop-shadow(0 0 6px rgba(255,255,255,0.6))' : undefined }}
            />
          );
        })}
      </svg>
      <div className="relative mt-2 h-4 font-mono text-[11px] text-white/60">
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${(((t - startMin) / total) * 100).toFixed(2)}%` }}>
            {clock(t)}
          </span>
        ))}
      </div>
    </div>
    {cur && sel !== null && (
      <ChartExplain
        title={label}
        insight={stageInsight({ lang, stage: cur.stage, name: names[cur.stage], dur: hm(cur.min), at: clock(startMin + starts[sel]), pct: Math.round((cur.min / total) * 100) })}
      />
    )}
    </>
  );
}
