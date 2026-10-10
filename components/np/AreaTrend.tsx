'use client';

// components/np/AreaTrend.tsx — a long-range trend as a smooth line over a soft gradient fill (My Health).
// Unlike BandChart it draws no dot per day (a year has hundreds): only the latest value gets a glowing
// dot. Optional shaded "individual norm" corridor, faint grid values on the right, x ticks supplied by
// the page. Interactive: hover / drag, or focus and use ← →, to read one point. Gaps (null) are skipped.

import { useId, useState, type KeyboardEvent, type ReactElement } from 'react';
import { smoothPath } from './TrendChart';
import { ChartPin } from './ChartPin';
import { useScrub } from './useScrub';
import ChartExplain from './ChartExplain';
import type { ExplainSpec } from './chartInsight';

export type AreaPoint = { label: string; value: number | null; tick?: string };

const W = 320;
const H = 176;
const PAD = { l: 6, r: 34, t: 16, b: 26 };

export default function AreaTrend({
  points,
  band,
  yTicks,
  min,
  max,
  color,
  unit = '',
  label,
  format = (v: number) => String(Math.round(v)),
  colorAt,
  explain,
}: {
  points: AreaPoint[];
  band?: { lo: number; hi: number } | null;
  /** values of the faint horizontal grid lines (and their labels) */
  yTicks?: number[];
  min: number;
  max: number;
  color: string;
  unit?: string;
  /** accessible summary of the chart */
  label: string;
  format?: (v: number) => string;
  /** colour of the line at a value (e.g. the status colour of a score): the line becomes a gradient along x */
  colorAt?: (v: number) => string;
  /** per-point "what / why / what to do" (components/np/insight.ts): shown under the chart */
  explain?: ExplainSpec;
}): ReactElement {
  const gid = useId().replace(/:/g, '');
  const [sel, setSel] = useState<number | null>(null);
  const n = points.length;
  const x = (i: number) => PAD.l + (n > 1 ? i / (n - 1) : 0.5) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (Math.min(max, Math.max(min, v)) - min) / (max - min)) * (H - PAD.t - PAD.b);
  const xy: [number, number][] = points.flatMap((p, i) => (p.value === null ? [] : [[x(i), y(p.value)] as [number, number]]));
  const line = smoothPath(xy);
  const withValue = points.map((p, i) => (p.value === null ? -1 : i)).filter((i) => i >= 0);
  const lastI = withValue.length ? withValue[withValue.length - 1] : -1;

  // tap or drag anywhere on the chart: the nearest point is selected (scrubbing), the selection stays after the finger lifts
  const pick = (frac: number) => {
    const px = frac * W;
    let best = -1;
    let bd = Infinity;
    for (const i of withValue) {
      const d = Math.abs(x(i) - px);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    setSel(best >= 0 ? best : null);
    return best;
  };
  const scrub = useScrub(pick, () => setSel(null));
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!withValue.length || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    const pos = sel === null ? withValue.length - 1 : withValue.indexOf(sel);
    const next = e.key === 'ArrowLeft' ? Math.max(0, pos - 1) : Math.min(withValue.length - 1, pos + 1);
    setSel(withValue[next]);
  };
  const shown = sel ?? lastI;
  const cur = shown >= 0 ? points[shown] : null;

  return (
    <>
    <div className="relative pt-9">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full touch-pan-y overflow-visible outline-none"
        role="img"
        aria-label={cur && cur.value !== null ? `${label}. ${cur.label}: ${format(cur.value)} ${unit}` : label}
        tabIndex={0}
        {...scrub}
        onKeyDown={onKey}
        onBlur={() => setSel(null)}
      >
        <defs>
          <linearGradient id={`at-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.14" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
          {colorAt && (
            <linearGradient id={`al-${gid}`} gradientUnits="userSpaceOnUse" x1={PAD.l} x2={W - PAD.r} y1="0" y2="0">
              {points.map((p, i) => (p.value === null ? null : <stop key={i} offset={`${(n > 1 ? i / (n - 1) : 0.5) * 100}%`} stopColor={colorAt(p.value)} />))}
            </linearGradient>
          )}
        </defs>
        {(yTicks ?? []).map((v) => (
          <g key={v}>
            <text x={W - PAD.r + 6} y={y(v) + 4} className="font-mono" fontSize="11" fill="rgb(255 255 255 / 0.6)">
              {format(v)}
            </text>
          </g>
        ))}
        {band && (
          <>
            <rect x={PAD.l} width={W - PAD.l - PAD.r} y={y(band.hi)} height={Math.max(2, y(band.lo) - y(band.hi))} rx="6" fill="#FFFFFF" fillOpacity="0.04" />
            <text x={W - PAD.r + 6} y={y(band.hi) + 4} className="font-mono" fontSize="11" fill="rgb(255 255 255 / 0.6)">
              {format(band.hi)}
            </text>
            <text x={W - PAD.r + 6} y={y(band.lo) + 4} className="font-mono" fontSize="11" fill="rgb(255 255 255 / 0.6)">
              {format(band.lo)}
            </text>
          </>
        )}
        {points.map((p, i) =>
          p.tick ? (
            <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="font-mono" fontSize="11" fill="rgb(255 255 255 / 0.6)">
              {p.tick}
            </text>
          ) : null,
        )}
        {line && <path d={line} fill="none" stroke={colorAt ? `url(#al-${gid})` : color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        {/* days outside the 30-day corridor: high spikes in cyan, low dips in bronze */}
        {band && n <= 40 &&
          points.map((p, i) =>
            p.value !== null && (p.value > band.hi || p.value < band.lo) && i !== shown ? (
              <circle key={`o${i}`} cx={x(i)} cy={y(p.value)} r="3.5" fill={p.value > band.hi ? '#2FD8F0' : '#FF7A59'} stroke="#12151B" strokeWidth="1.5" />
            ) : null,
          )}
        {cur && cur.value !== null && (
          <>
            <line x1={x(shown)} x2={x(shown)} y1={-4} y2={H - PAD.b} stroke="rgb(255 255 255 / 0.2)" strokeWidth="1.5" />
            <circle cx={x(shown)} cy={y(cur.value)} r="7" fill={colorAt ? colorAt(cur.value) : color} fillOpacity="0.2" />
            <circle cx={x(shown)} cy={y(cur.value)} r="4.5" fill="#FFFFFF" stroke={colorAt ? colorAt(cur.value) : color} strokeWidth="2" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.7))' }} />
          </>
        )}
      </svg>
      {cur && cur.value !== null && (
        <ChartPin left={(x(shown) / W) * 100}>
          {cur.label} · {format(cur.value)} {unit}
        </ChartPin>
      )}
    </div>
    {explain && <ChartExplain insight={shown >= 0 ? explain.at(shown) : null} spec={explain} onPick={setSel} title={label} />}
    </>
  );
}
