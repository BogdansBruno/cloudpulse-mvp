'use client';

// components/pro/ProChart.tsx
//
// A pixel-accurate area chart for the desktop Pro dashboard: light grid,
// y-axis ticks, date labels, a gradient area under the line, a marked peak
// and low, an optional dashed comparison line, a hover crosshair with a
// tooltip, and click-to-select a day. Days without a value leave a gap —
// the chart never draws data that does not exist.

import { useEffect, useId, useRef, useState, type ReactElement, type RefObject } from 'react';

export type ProPoint = { date: string; value: number | null };

const LOCALE = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' } as const;

function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export default function ProChart({
  points,
  compare,
  min,
  max,
  ticks,
  color,
  compareColor = 'rgba(255,255,255,0.55)',
  refLines = [],
  selected,
  onSelect,
  format,
  lang,
  height = 300,
  label,
}: {
  points: ProPoint[];
  /** Optional dashed comparison series on the same dates. */
  compare?: ProPoint[];
  min: number;
  max: number;
  ticks: number[];
  color: string;
  compareColor?: string;
  refLines?: number[];
  selected: number;
  onSelect: (i: number) => void;
  format: (v: number) => string;
  lang: 'ru' | 'lv' | 'en';
  height?: number;
  label: string;
}): ReactElement {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [box, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const L = 40; // y-axis gutter
  const R = 12;
  const T = 12;
  const B = 30; // date labels
  const W = Math.max(0, width);
  const n = points.length;
  const x = (i: number) => L + (n <= 1 ? 0 : (i * (W - L - R)) / (n - 1));
  const y = (v: number) => T + (1 - (v - min) / Math.max(1e-9, max - min)) * (height - T - B);

  // Split into runs of consecutive values so missing days become gaps.
  const runs = (series: ProPoint[]) => {
    const out: { i: number; v: number }[][] = [];
    let cur: { i: number; v: number }[] = [];
    series.forEach((p, i) => {
      if (p.value === null) {
        if (cur.length) out.push(cur);
        cur = [];
      } else cur.push({ i, v: p.value });
    });
    if (cur.length) out.push(cur);
    return out;
  };
  const line = (run: { i: number; v: number }[]) => run.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = (run: { i: number; v: number }[]) =>
    run.length < 2 ? '' : `${line(run)} L${x(run[run.length - 1].i).toFixed(1)},${y(min).toFixed(1)} L${x(run[0].i).toFixed(1)},${y(min).toFixed(1)} Z`;

  const valued = points.map((p, i) => ({ i, v: p.value })).filter((p): p is { i: number; v: number } => p.v !== null);
  const peak = valued.length ? valued.reduce((a, b) => (b.v > a.v ? b : a)) : null;
  const low = valued.length ? valued.reduce((a, b) => (b.v < a.v ? b : a)) : null;

  const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short' });
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - L) / 76))));
  const active = hover ?? selected;
  const ap = points[active];
  const cp = compare?.[active];

  // Keep peak/low labels off the y-axis ticks and inside the plot at the edges.
  const anchorAt = (i: number): 'start' | 'middle' | 'end' => {
    const px = x(i);
    if (px - L < 24) return 'start';
    if (W - R - px < 24) return 'end';
    return 'middle';
  };
  const labelX = (i: number) => {
    const a = anchorAt(i);
    return x(i) + (a === 'start' ? 6 : a === 'end' ? -6 : 0);
  };

  const pick = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || n === 0) return null;
    const px = clientX - r.left;
    return Math.max(0, Math.min(n - 1, Math.round(((px - L) / Math.max(1, W - L - R)) * (n - 1))));
  };

  return (
    <div ref={box} className="relative w-full select-none" style={{ height }}>
      {W > 0 && (
        <svg
          width={W}
          height={height}
          role="img"
          aria-label={label}
          className="block cursor-crosshair"
          onMouseMove={(e) => setHover(pick(e.clientX))}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => {
            const i = pick(e.clientX);
            if (i !== null) onSelect(i);
          }}
        >
          <defs>
            <linearGradient id={`a${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.38" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* grid + y ticks */}
          {ticks.map((tv) => (
            <g key={tv}>
              <line x1={L} x2={W - R} y1={y(tv)} y2={y(tv)} stroke="rgba(255,255,255,0.07)" />
              <text x={L - 8} y={y(tv) + 4} textAnchor="end" fontSize="11" fill="#8B93A3" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {format(tv)}
              </text>
            </g>
          ))}
          {refLines.map((rv) => (
            <line key={`r${rv}`} x1={L} x2={W - R} y1={y(rv)} y2={y(rv)} stroke="rgba(255,255,255,0.22)" strokeDasharray="4 5" />
          ))}

          {/* selected day */}
          <rect x={x(selected) - 10} y={T} width={20} height={height - T - B} rx={6} fill="rgba(255,255,255,0.05)" />

          {/* comparison series */}
          {compare &&
            runs(compare).map((run, k) => (
              <path key={`c${k}`} d={line(run)} fill="none" stroke={compareColor} strokeWidth={1.4} strokeDasharray="5 5" />
            ))}

          {/* main series */}
          {runs(points).map((run, k) => (
            <g key={`m${k}`}>
              <path d={area(run)} fill={`url(#a${uid})`} />
              <path d={line(run)} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          ))}

          {/* peak and low */}
          {peak && (
            <g>
              <circle cx={x(peak.i)} cy={y(peak.v)} r={4} fill={color} />
              <text x={labelX(peak.i)} y={y(peak.v) - 9} textAnchor={anchorAt(peak.i)} fontSize="11" fontWeight={600} fill="#E6E9EF" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {format(peak.v)}
              </text>
            </g>
          )}
          {low && low.i !== peak?.i && (
            <g>
              <circle cx={x(low.i)} cy={y(low.v)} r={4} fill="#0D0E12" stroke={color} strokeWidth={1.6} />
              <text x={labelX(low.i)} y={y(low.v) + 17} textAnchor={anchorAt(low.i)} fontSize="11" fill="#B4BCCB" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {format(low.v)}
              </text>
            </g>
          )}

          {/* crosshair */}
          {ap && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={T} y2={height - B} stroke="rgba(255,255,255,0.35)" />
              {ap.value !== null && <circle cx={x(active)} cy={y(ap.value)} r={5} fill="#FFFFFF" stroke={color} strokeWidth={2} />}
            </g>
          )}

          {/* date labels */}
          {points.map((p, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text key={p.date} x={x(i)} y={height - 9} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize="11" fill="#8B93A3">
                {dayLabel(p.date)}
              </text>
            ) : null
          )}
        </svg>
      )}

      {/* tooltip */}
      {hover !== null && ap && W > 0 && (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#1B1C24] px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: Math.min(W - 70, Math.max(70, x(hover))) }}
        >
          <span className="text-[#9AA3B2]">{dayLabel(ap.date)}</span>{' '}
          <span className="font-semibold tabular-nums">{ap.value === null ? '—' : format(ap.value)}</span>
          {cp && cp.value !== null && (
            <>
              <span className="text-[#9AA3B2]"> · </span>
              <span className="tabular-nums text-[#C8CEDA]">{format(cp.value)}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
