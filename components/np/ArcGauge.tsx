'use client';

// components/np/ArcGauge.tsx — a minimalist half-circle gauge (respiratory rate): a thin track, a wider translucent
// corridor for the athlete's usual range, and a glowing marker at today's value. The number sits in the middle.
// Read-only; the two end numbers under the arc give the usual range with a word of context.

import type { ReactElement } from 'react';

const R = 52;
const CX = 60;
const CY = 62;

/** point on the arc: t = 0 (left end) … 1 (right end) */
const at = (t: number, r = R): [number, number] => {
  const a = Math.PI * (1 - t);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
};
const arc = (t0: number, t1: number): string => {
  const [x0, y0] = at(t0);
  const [x1, y1] = at(t1);
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
};

export default function ArcGauge({
  value,
  min,
  max,
  lo,
  hi,
  color,
  display,
  unit,
  label,
  endLabels,
  endCaptions,
}: {
  value: number;
  min: number;
  max: number;
  /** usual range, drawn as the corridor */
  lo: number;
  hi: number;
  color: string;
  /** the number shown in the middle (already formatted) */
  display: string;
  unit?: string;
  label: string;
  endLabels: [string, string];
  endCaptions?: [string, string];
}): ReactElement {
  const t = (v: number) => Math.min(1, Math.max(0, (v - min) / (max - min)));
  const [mx, my] = at(t(value));
  return (
    <div role="img" aria-label={label} className="w-full">
      <svg viewBox="0 0 120 74" className="block w-full overflow-visible">
        <path d={arc(0, 1)} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="4" strokeLinecap="round" />
        <path d={arc(t(lo), t(hi))} fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="10" strokeLinecap="round" />
        <path d={arc(t(lo), t(hi))} fill="none" stroke="rgb(255 255 255 / 0.8)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={mx} cy={my} r="6" fill={color} fillOpacity="0.25" />
        <circle cx={mx} cy={my} r="4" fill="#FFFFFF" stroke={color} strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.7))' }} />
        <text x={CX} y={CY - 8} textAnchor="middle" fill="#FFFFFF" fontSize="22" fontWeight="300">
          {display}
        </text>
        {unit && (
          <text x={CX} y={CY + 6} textAnchor="middle" fill="rgb(255 255 255 / 0.6)" fontSize="8">
            {unit}
          </text>
        )}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[11px] text-white/60">
        {([0, 1] as const).map((k) => (
          <span key={k} className={`flex flex-col leading-tight ${k === 0 ? 'items-start' : 'items-end'}`}>
            <span>{endLabels[k]}</span>
            {endCaptions && <span className="font-sans text-[10px] text-white/50">{endCaptions[k]}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
