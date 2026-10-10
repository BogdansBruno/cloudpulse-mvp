'use client';

// components/np/RangeSlider.tsx — the slider inside a metric card: a thin (4 px) track, a brighter stretch
// (the athlete's usual range, or 0 → value when there is none), and a small glowing white thumb at today's value.
// Tap the thumb to show a floating pin with `pin` text. Labels sit under the two ends of the lit stretch.

import { useState, type ReactElement } from 'react';
import { ChartPin } from './ChartPin';

export default function RangeSlider({
  value,
  min,
  max,
  range,
  color,
  label,
  endLabels,
  endCaptions,
  pin,
}: {
  value: number | null;
  min: number;
  max: number;
  /** lit stretch, e.g. the usual range or the target band; null = from `min` up to the value */
  range?: { lo: number; hi: number } | null;
  color: string;
  /** accessible text, e.g. "Readiness 88, your usual range 76 to 90" */
  label: string;
  /** texts under the left and right end of the lit line (default: its numbers) */
  endLabels?: [string, string];
  /** small words under the two end labels, e.g. ["Min", "Usual max"] */
  endCaptions?: [string, string];
  /** text of the floating pin shown when the thumb is tapped, e.g. "Low, This week" */
  pin?: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const pctN = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  const pct = (v: number) => `${pctN(v)}%`;
  const lit = range ?? (value !== null ? { lo: min, hi: value } : null);
  const left = lit ? pct(lit.lo) : '0%';
  const width = lit ? `${Math.max(0, pctN(lit.hi) - pctN(lit.lo))}%` : '0%';
  const labels: [string, string] | null = endLabels ?? (lit ? [String(Math.round(lit.lo)), String(Math.round(lit.hi))] : null);
  const hasPin = !!pin && value !== null;
  return (
    <div {...(hasPin ? {} : { role: 'img', 'aria-label': label })} className={`relative w-full ${hasPin && open ? 'pt-9' : ''}`}>
      {hasPin && open && value !== null && <ChartPin left={pctN(value)}>{pin}</ChartPin>}
      <div className="relative h-4">
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
        {/* the usual-range corridor: a wider, higher-contrast translucent band with the bright line inside it */}
        {range && <span className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full border border-white/20 bg-white/15" style={{ left, width }} />}
        {lit && <span className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/80" style={{ left, width }} />}
        {value !== null &&
          (hasPin ? (
            <button
              type="button"
              aria-label={label}
              aria-pressed={open}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen((o) => !o);
              }}
              className="absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left: pct(value) }}
            >
              <span
                className="h-3 w-3 rounded-full border-[1.5px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]"
                style={{ borderColor: color }}
              />
            </button>
          ) : (
            <span
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]"
              style={{ left: pct(value), borderColor: color }}
            />
          ))}
      </div>
      {labels && lit && (
        <div className={`relative mt-1 font-mono text-[11px] text-white/60 ${endCaptions ? 'h-9' : 'h-4'}`}>
          {([0, 1] as const).map((k) => {
            const at = endLabels && !range ? (k === 0 ? 0 : 100) : pctN(k === 0 ? lit.lo : lit.hi);
            // keep the label inside the card: left-align near the left edge, right-align near the right edge
            const place = at < 16 ? { left: `${at}%` } : at > 84 ? { left: `${at}%`, transform: 'translateX(-100%)' } : { left: `${at}%`, transform: 'translateX(-50%)' };
            return (
              <span key={k} className={`absolute flex flex-col leading-tight ${at < 16 ? 'items-start' : at > 84 ? 'items-end' : 'items-center'}`} style={place}>
                <span className="whitespace-nowrap">{labels[k]}</span>
                {endCaptions && <span className="whitespace-nowrap font-sans text-[10px] text-white/50">{endCaptions[k]}</span>}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
