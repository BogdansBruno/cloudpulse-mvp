'use client';

// components/np/DeviationBars.tsx — a deviation chart (HRV, temperature): thin vertical capsules around one
// subtle zero baseline, plus a crisp delta callout ("−2 ms"). The zero line is the athlete's own usual level
// (the centre of their usual range), never a fixed norm. White capsules, bright above the line and softer below;
// the selected day (the latest by default) gets a vertical guide line, a pin with its delta and a tinted window behind
// the bars. No grid, no frame. Days without a value are skipped. Hover / drag or ← → reads one day.

import { useState, type KeyboardEvent, type ReactElement } from 'react';
import { ChartPin } from './ChartPin';
import { useScrub } from './useScrub';
import ChartExplain from './ChartExplain';
import type { ExplainSpec } from './chartInsight';

export type DevPoint = { label: string; value: number | null };

const W = 320;
const H = 110;
const MID = H / 2;

export default function DeviationBars({
  points,
  baseline,
  unit = '',
  label,
  decimals = 0,
  explain,
}: {
  points: DevPoint[];
  /** the zero line: the athlete's usual level */
  baseline: number;
  unit?: string;
  label: string;
  decimals?: number;
  /** per-point "what / why / what to do" (components/np/insight.ts): shown under the chart */
  explain?: ExplainSpec;
}): ReactElement {
  const [sel, setSel] = useState<number | null>(null);
  const n = points.length;
  const withValue = points.map((p, i) => (p.value === null ? -1 : i)).filter((i) => i >= 0);
  const last = withValue.length ? withValue[withValue.length - 1] : -1;
  const devs = points.map((p) => (p.value === null ? null : p.value - baseline));
  const span = Math.max(1e-6, ...devs.map((d) => (d === null ? 0 : Math.abs(d))));
  const x = (i: number) => (n <= 1 ? W / 2 : 4 + (i / (n - 1)) * (W - 8));
  const bw = Math.min(4, Math.max(2, (W / Math.max(n, 1)) * 0.5));
  const fmt = (d: number) => {
    const r = Number(d.toFixed(decimals));
    return `${r > 0 ? '+' : r < 0 ? '−' : '±'}${Math.abs(r).toFixed(decimals)}${unit ? ` ${unit}` : ''}`;
  };
  const shown = sel ?? last;
  const shownDev = shown >= 0 ? devs[shown] : null;
  const step = n > 10 ? Math.ceil(n / 5) : 1;

  // tap or drag anywhere: the nearest day is selected (each day owns a full-height column, far wider than its thin bar)
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
    setSel(withValue[e.key === 'ArrowLeft' ? Math.max(0, pos - 1) : Math.min(withValue.length - 1, pos + 1)]);
  };

  const xs = (i: number) => (x(i) / W) * 100;
  return (
    <div>
      <div className="relative pt-9">
        {shownDev !== null && shown >= 0 && (
          <ChartPin left={xs(shown)}>
            {points[shown].label} · {fmt(shownDev)}
          </ChartPin>
        )}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full touch-pan-y overflow-visible outline-none"
          role="img"
          aria-label={shownDev !== null && shown >= 0 ? `${label}. ${points[shown].label}: ${fmt(shownDev)}` : label}
          tabIndex={0}
          {...scrub}
          onKeyDown={onKey}
          onBlur={() => setSel(null)}
        >
          <defs>
            <linearGradient id="dev-zone" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#4A4FB3" stopOpacity="0.32" />
              <stop offset="1" stopColor="#2FD8F0" stopOpacity="0.32" />
            </linearGradient>
          </defs>
          {/* the stretch up to the selected day, tinted like a soft window behind the bars */}
          {shown >= 0 && <rect x="0" y="0" width={Math.max(0, x(shown) + 4)} height={H} rx="10" fill="url(#dev-zone)" />}
          <line x1="0" x2={W} y1={MID} y2={MID} stroke="rgb(255 255 255 / 0.28)" strokeWidth="1" />
          {shown >= 0 && n > 0 && <rect x={x(shown) - Math.min(14, W / n / 2)} y={-6} width={Math.min(28, W / n)} height={H + 10} rx="10" fill="rgb(255 255 255 / 0.06)" />}
          {shown >= 0 && <line x1={x(shown)} x2={x(shown)} y1={-6} y2={H + 4} stroke="rgb(255 255 255 / 0.2)" strokeWidth="1.5" />}
          {devs.map((d, i) => {
            if (d === null) return null;
            const h = Math.max(3, (Math.abs(d) / span) * (MID - 6));
            const on = i === shown;
            const w = on ? bw * 1.8 : bw;
            const hh = on ? Math.min(MID - 2, h * 1.08) : h;
            return (
              <rect
                key={i}
                x={x(i) - w / 2}
                y={d >= 0 ? MID - hh : MID}
                width={w}
                height={hh}
                rx={w / 2}
                fill="#FFFFFF"
                opacity={on ? 1 : d >= 0 ? 0.7 : 0.4}
                style={{ transition: 'all 120ms ease-out', filter: on ? 'drop-shadow(0 0 6px rgba(255,255,255,0.7))' : undefined }}
              />
            );
          })}
        </svg>
      </div>
      <div className="relative mt-2 h-4 font-mono text-[11px] text-white/60">
        {points.map((p, i) =>
          i % step === 0 || i === n - 1 ? (
            <span key={i} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${xs(i)}%` }}>
              {p.label}
            </span>
          ) : null,
        )}
      </div>
      {explain && <ChartExplain insight={shown >= 0 ? explain.at(shown) : null} spec={explain} onPick={setSel} title={label} />}
    </div>
  );
}
