'use client';

// components/np/ScoreRing.tsx — a soft, thick score ring (Oura style): a warm-sand translucent track
// (#9AA7B8/10), a 7 px arc with round ends in a two-stop gradient of the status colour, and a double
// glow (a tight and a wide drop-shadow in the same colour). The value sits centred in light digits;
// an optional scale ("/7") goes small underneath, never beside it.
// No value → an empty track and "—" (never a guessed number). Animates once, not with reduced motion.

import { useEffect, useId, useState, type ReactElement } from 'react';
import { useReducedMotion } from './ui';

export function ScoreRing({
  value,
  max = 100,
  unit,
  colors,
  size = 88,
  label,
  valueClassName = 'text-2xl font-light tracking-[-0.03em]',
  stroke = 7,
  pad = 9,
}: {
  value: number | null;
  max?: number;
  /** scale shown under the value, e.g. "/7" */
  unit?: string;
  /** arc gradient [start, end]; the end colour also drives the glow */
  colors: [string, string];
  size?: number;
  /** accessible name, e.g. "Readiness: 88 of 100" */
  label: string;
  /** classes of the centred value (default: light digits) */
  valueClassName?: string;
  /** arc thickness and the room kept for the glow (defaults 7 / 9; smaller rings use less) */
  stroke?: number;
  pad?: number;
}): ReactElement {
  const reduce = useReducedMotion();
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const gid = useId().replace(/:/g, '');
  const r = (size - stroke - pad * 2) / 2;
  const c = 2 * Math.PI * r;
  const f = value === null ? 0 : Math.max(0, Math.min(1, value / max));
  const shown = reduce || on ? f : 0;
  const [from, to] = colors;
  return (
    <div role="img" aria-label={label} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90 overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={`sr-${gid}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#9AA7B8" strokeOpacity="0.1" strokeWidth={stroke} />
        {value !== null && f > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#sr-${gid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - shown)}
            style={{
              transition: reduce ? undefined : 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: `drop-shadow(0 0 3px ${to}) drop-shadow(0 0 10px ${to}99)`,
            }}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className={`leading-none ${valueClassName}`}>{value ?? '—'}</span>
        {unit && value !== null && <span className="mt-1 text-[10px] font-medium leading-none text-np-text-3">{unit}</span>}
      </span>
    </div>
  );
}
